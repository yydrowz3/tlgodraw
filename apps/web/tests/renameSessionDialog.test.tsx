import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/types/draw";
import { RenameSessionDialog } from "@/ui/workbench/RenameSessionDialog";
import { mockDialogs } from "./dialogTestUtils";

beforeEach(mockDialogs);
const session: Session = {
  id: "session-1",
  title: "My diagram",
  messages: [],
  drawIoXml: null,
  lastModified: 1,
};

describe("rename session dialog", () => {
  it("focuses the existing title, saves the input for its session and closes", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<RenameSessionDialog session={session} onClose={onClose} onSave={onSave} />);
    const input = screen.getByRole("textbox", { name: "Session Name" });
    expect(input).toHaveProperty("value", "My diagram");
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "Updated diagram" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith("session-1", "Updated diagram");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each(["", "   "])("rejects an empty title (%j), including direct form submission", (value) => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<RenameSessionDialog session={session} onClose={onClose} onSave={onSave} />);
    const input = screen.getByRole("textbox", { name: "Session Name" });
    fireEvent.change(input, { target: { value } });
    expect(screen.getByRole("button", { name: "Save Changes" })).toHaveProperty("disabled", true);
    fireEvent.submit(input.closest("form")!);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancels an edited title without saving", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<RenameSessionDialog session={session} onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
