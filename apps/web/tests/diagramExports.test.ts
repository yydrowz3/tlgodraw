import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagramExportQueue, type ExportAction } from "@/utils/diagramExports";
afterEach(() => vi.useRealTimers());
describe("diagram export queue", () => {
  it("serializes download, context, autosave and theme jobs with their source sessions", async () => {
    const actions: ExportAction[] = [];
    const busy = vi.fn();
    const queue = new DiagramExportQueue((action) => actions.push(action), busy);
    const jobs = (["download", "context", "autosave", "theme"] as const).map((purpose, index) =>
      queue.request(purpose, `session-${index}`),
    );
    expect(actions).toHaveLength(1);
    for (let index = 0; index < jobs.length; index++) {
      queue.receive({ data: `svg-${index}`, xml: `xml-${index}`, message: actions[index] });
      await expect(jobs[index]).resolves.toEqual({
        data: `svg-${index}`,
        xml: `xml-${index}`,
        sessionId: `session-${index}`,
      });
    }
    expect(busy).toHaveBeenLastCalledWith(false);
  });
  it("ignores unrelated and late responses after a timeout", async () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const queue = new DiagramExportQueue(send, vi.fn());
    const first = queue.request("theme", "a");
    const failure = expect(first).rejects.toThrow("timed out");
    const second = queue.request("download", "b");
    const oldAction = send.mock.calls[0][0];
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
    queue.receive({ data: "old", xml: "old", message: oldAction });
    queue.receive({ data: "unexpected", xml: "unexpected" });
    queue.receive({ data: "new", xml: "new", message: send.mock.calls[1][0] });
    await expect(second).resolves.toMatchObject({ data: "new", sessionId: "b" });
  });
  it("rejects incomplete exports and disposes pending jobs", async () => {
    const send = vi.fn();
    const queue = new DiagramExportQueue(send, vi.fn());
    const first = queue.request("theme", "a");
    queue.receive({ data: "svg", message: send.mock.calls[0][0] });
    await expect(first).rejects.toThrow("complete diagram");
    const second = queue.request("context", "b");
    const third = queue.request("theme", "b");
    queue.dispose();
    await expect(second).rejects.toThrow("closed");
    await expect(third).rejects.toThrow("closed");
  });
});
