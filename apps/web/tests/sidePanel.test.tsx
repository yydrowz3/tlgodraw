import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidePanel } from "@/ui/workbench/SidePanel";

beforeEach(() => {
  // jsdom has no layout. Simulate visible elements for the panel's focus filter.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    { width: 100, height: 30 },
  ] as unknown as DOMRectList);
});

function panel(onClose = vi.fn(), visible = true, overlay = true) {
  return (
    <SidePanel
      id="history"
      label="History"
      visible={visible}
      overlay={overlay}
      side="left"
      onClose={onClose}
    >
      <button disabled>Disabled action</button>
      <button>First action</button>
      <button>Last action</button>
      <details>
        <ul>
          <li>
            <button>Collapsed action</button>
          </li>
        </ul>
      </details>
    </SidePanel>
  );
}

describe("responsive side panel", () => {
  it("focuses the first available action and cycles Tab in both directions", () => {
    render(panel());
    const dialog = screen.getByRole("dialog", { name: "History" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const first = within(dialog).getByRole("button", { name: "First action" });
    const last = within(dialog).getByRole("button", { name: "Last action" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("closes through the backdrop and uses the latest Escape callback", () => {
    const original = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(panel(original));
    fireEvent.click(screen.getByRole("button", { name: "Close History" }));
    expect(original).toHaveBeenCalledOnce();
    rerender(panel(latest));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(latest).toHaveBeenCalledOnce();
    expect(original).toHaveBeenCalledOnce();
  });

  it("defers Escape and Tab handling while a native modal is open", () => {
    const onClose = vi.fn();
    render(
      <>
        {panel(onClose)}
        <dialog open aria-label="Rename">
          <input aria-label="Name" />
        </dialog>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    input.focus();
    expect(fireEvent.keyDown(document, { key: "Escape" })).toBe(true);
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("restores focus and removes keyboard handling when hidden or unmounted", () => {
    render(<button>Open history</button>);
    const opener = screen.getByRole("button", { name: "Open history" });
    opener.focus();
    const onClose = vi.fn();
    const { rerender, unmount } = render(panel(onClose));
    rerender(panel(onClose, false));
    expect(document.activeElement).toBe(opener);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close History" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    rerender(panel(onClose));
    unmount();
    expect(document.activeElement).toBe(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("leaves focus and Escape alone in the desktop layout", () => {
    render(<button>Outside</button>);
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();
    const onClose = vi.fn();
    render(panel(onClose, true, false));
    expect(screen.getByRole("complementary", { name: "History" })).toBeTruthy();
    expect(document.activeElement).toBe(outside);
    expect(screen.queryByRole("button", { name: "Close History" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
