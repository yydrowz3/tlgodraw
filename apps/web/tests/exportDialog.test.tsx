import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportDialog } from "@/ui/workbench/ExportDialog";
import { resources } from "@/i18n";
import { mockDialogs } from "./dialogTestUtils";

beforeEach(mockDialogs);

describe("diagram export dialog", () => {
  it("uses the exported data for both the accessible preview and the SVG download", () => {
    const data = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E";
    render(<ExportDialog data={data} onClose={vi.fn()} />);
    const text = resources.en.translation.export;
    expect(screen.getByRole("dialog", { name: text.ready })).toBeTruthy();
    expect(screen.getByRole("img", { name: text.alt }).getAttribute("src")).toBe(data);
    const download = screen.getByRole("link", { name: text.download });
    expect(download.getAttribute("href")).toBe(data);
    expect(download.getAttribute("download")).toBe("diagram.svg");
  });

  it("closes through the export close button", () => {
    const onClose = vi.fn();
    render(<ExportDialog data="data:image/svg+xml,test" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: resources.en.translation.export.close }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
