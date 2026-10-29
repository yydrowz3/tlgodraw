import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { MessageComposer } from "@/ui/workbench/MessageComposer";
import { resources } from "@/i18n";

function props(overrides: Partial<ComponentProps<typeof MessageComposer>> = {}) {
  return {
    value: "Draw a flowchart",
    onChange: vi.fn(),
    isSending: false,
    disabled: false,
    context: false,
    onContext: vi.fn(),
    showQuickActions: true,
    onSend: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
}

describe("message composer", () => {
  it("reports edits, example selection, send and restart actions", () => {
    const handlers = props();
    render(<MessageComposer {...handlers} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New draft" } });
    expect(handlers.onChange).toHaveBeenCalledWith("New draft");
    fireEvent.click(
      screen.getByRole("button", { name: resources.en.translation.quickActions.loginLabel }),
    );
    expect(handlers.onChange).toHaveBeenLastCalledWith(
      resources.en.translation.quickActions.loginText,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(handlers.onSend).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Restart Session" }));
    expect(handlers.onRestart).toHaveBeenCalledOnce();
  });

  it("reflects context selection and can hide examples", () => {
    const handlers = props({ showQuickActions: false });
    const { rerender } = render(<MessageComposer {...handlers} />);
    const context = screen.getByRole("button", { name: "Include canvas context" });
    expect(context.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(context);
    expect(handlers.onContext).toHaveBeenCalledOnce();
    rerender(<MessageComposer {...handlers} context />);
    expect(context.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.queryByRole("button", { name: resources.en.translation.quickActions.loginLabel }),
    ).toBeNull();
  });

  it.each(["ctrlKey", "metaKey"])("sends with %s + Enter and prevents a newline", (modifier) => {
    const handlers = props();
    render(<MessageComposer {...handlers} />);
    const accepted = fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      [modifier]: true,
    });
    expect(accepted).toBe(false);
    expect(handlers.onSend).toHaveBeenCalledOnce();
  });

  it("keeps plain Enter and input-method composition from sending", () => {
    const handlers = props();
    render(<MessageComposer {...handlers} />);
    const input = screen.getByRole("textbox");
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Enter", ctrlKey: true, isComposing: true })).toBe(true);
    expect(handlers.onSend).not.toHaveBeenCalled();
  });

  it.each([{ value: "" }, { value: "   \n " }, { disabled: true }, { isSending: true }])(
    "blocks button and keyboard sending for %j",
    (state) => {
      const handlers = props(state);
      render(<MessageComposer {...handlers} />);
      const send = screen.getByRole("button", { name: "Send message" });
      expect(send).toHaveProperty("disabled", true);
      fireEvent.click(send);
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ctrlKey: true });
      expect(handlers.onSend).not.toHaveBeenCalled();
    },
  );

  it.each([{ isSending: true }, { disabled: true }])("blocks restarting for %j", (state) => {
    const handlers = props(state);
    render(<MessageComposer {...handlers} />);
    const restart = screen.getByRole("button", { name: "Restart Session" });
    expect(restart).toHaveProperty("disabled", true);
    fireEvent.click(restart);
    expect(handlers.onRestart).not.toHaveBeenCalled();
    if (state.isSending) {
      expect(screen.getByRole("textbox")).toHaveProperty("disabled", true);
      const example = screen.getByRole("button", {
        name: resources.en.translation.quickActions.loginLabel,
      });
      expect(example).toHaveProperty("disabled", true);
      fireEvent.click(example);
      expect(handlers.onChange).not.toHaveBeenCalled();
    }
  });
});
