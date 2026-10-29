import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const prototype = HTMLDialogElement.prototype;
const originals = new Map<string, PropertyDescriptor | undefined>(
  ["showModal", "close"].map((name) => [name, Object.getOwnPropertyDescriptor(prototype, name)]),
);

// jsdom has no native dialog lifecycle. Keep the real element and its open state.
export function mockDialogs() {
  Object.defineProperties(prototype, {
    showModal: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
      }),
    },
  });
}

afterEach(() => {
  // Unmount before restoring methods needed by Modal's effect cleanup.
  cleanup();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(prototype, name, descriptor);
    else Reflect.deleteProperty(prototype, name);
  }
});
