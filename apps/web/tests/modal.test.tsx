import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/ui/Modal";
import { mockDialogs } from "./dialogTestUtils";

beforeEach(mockDialogs);

describe("modal dialog", () => {
  it("opens with an accessible title, focuses its input and restores the opener on unmount", () => {
    render(<button>Open dialog</button>);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    const { unmount } = render(
      <Modal title="Edit diagram" onClose={vi.fn()}>
        <input aria-label="Diagram name" data-autofocus />
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Edit diagram" });
    expect(dialog).toHaveProperty("open", true);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Diagram name" }));
    unmount();
    expect(dialog).toHaveProperty("open", false);
    expect(document.activeElement).toBe(opener);
  });

  it.each(["Close dialog", "Close dialog backdrop"])("requests close through %s", (name) => {
    const onClose = vi.fn();
    render(
      <Modal title="Edit" onClose={onClose}>
        Content
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handles the native Escape cancel event through the controlled close callback", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Edit" onClose={onClose}>
        Content
      </Modal>,
    );
    const event = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog"), event);
    expect(event.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
