import { act, renderHook, waitFor } from "@testing-library/react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aiAgentsQueryKey,
  useAiAgentsQuery,
  useChatMutation,
  useCreateSessionMutation,
} from "@/hooks/useAgentApi";
import { createQueryTestContext } from "./queryTestUtils";
import { createSession } from "@/services/apiAgent";
import { AppError, formatError } from "@/i18n/messages";
import { setLanguage } from "@/i18n";

const agents = [{ agentID: "agent", agentName: "Agent", agentDesc: "" }];
const fetchMock = vi.fn<typeof fetch>();
const reply = (data: unknown) => Response.json({ code: "0000", info: "", data });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe("agent queries", () => {
  it("loads and unwraps agents, sharing fresh data across observers and remounts", async () => {
    fetchMock.mockResolvedValue(reply(agents));
    const context = createQueryTestContext();
    const first = renderHook(useAiAgentsQuery, context);
    expect(first.result.current.isPending).toBe(true);
    const second = renderHook(useAiAgentsQuery, context);
    await waitFor(() => expect(first.result.current.data).toEqual(agents));
    await waitFor(() => expect(second.result.current.data).toEqual(agents));
    first.unmount();
    second.unmount();
    const remounted = renderHook(useAiAgentsQuery, context);
    expect(remounted.result.current.data).toEqual(agents);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a failed GET once and exposes the HTTP error", async () => {
    fetchMock.mockImplementation(async () => new Response("Unavailable", { status: 503 }));
    const { result } = renderHook(useAiAgentsQuery, createQueryTestContext());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatchObject({
      key: "errors.http",
      status: 503,
      detail: "Unavailable",
    });
  });

  it("aborts the underlying GET when the last observer unmounts", async () => {
    let signal: AbortSignal | null | undefined;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const context = createQueryTestContext();
    const { unmount } = renderHook(useAiAgentsQuery, context);
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(context.client.getQueryState(aiAgentsQueryKey)?.fetchStatus).toBe("idle");
  });

  it.each(["mount", "focus", "reconnect"] as const)(
    "refreshes stale data on %s",
    async (trigger) => {
      fetchMock.mockResolvedValue(reply(agents));
      const context = createQueryTestContext();
      context.client.setQueryData(aiAgentsQueryKey, agents, { updatedAt: Date.now() - 300_001 });
      if (trigger !== "mount") {
        // Keep the stale cache until the event under test occurs.
        context.client.setQueryDefaults(aiAgentsQueryKey, { refetchOnMount: false });
      }
      if (trigger === "focus") focusManager.setFocused(false);
      const { result } = renderHook(useAiAgentsQuery, context);
      if (trigger === "focus") act(() => focusManager.setFocused(true));
      if (trigger === "reconnect") {
        act(() => onlineManager.setOnline(false));
        act(() => onlineManager.setOnline(true));
      }
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(result.current.data).toEqual(agents);
    },
  );
});

describe("agent mutations", () => {
  it.each([
    ["0001", "errors.apiUnknown"],
    ["0002", "errors.apiParameter"],
    ["0003", "errors.apiAgent"],
    ["9999", "errors.apiUnknown"],
  ])("maps API code %s while retaining the original server detail", async (code, key) => {
    fetchMock.mockResolvedValue(Response.json({ code, info: "Original server detail" }));
    const error = await createSession("agent", "user").catch((error: unknown) => error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code, key, detail: "Original server detail" });
    const english = formatError(error);
    await setLanguage("ja");
    expect(formatError(error)).not.toBe(english);
    expect(formatError(error)).toContain("Original server detail");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("wraps network failures while preserving query cancellation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(createSession("agent", "user")).rejects.toMatchObject({
      key: "errors.network",
      detail: "Failed to fetch",
    });
    const cancellation = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValueOnce(cancellation);
    await expect(createSession("agent", "user")).rejects.toBe(cancellation);
  });
  it("unwraps successful results and preserves POST payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(reply({ sessionID: "backend" }))
      .mockResolvedValueOnce(reply({ content: "Hello" }));
    const context = createQueryTestContext();
    const creation = renderHook(useCreateSessionMutation, context);
    const chatting = renderHook(useChatMutation, context);
    const request = { agentID: "agent", userID: "user", sessionID: "backend", message: "Hi" };
    await act(async () => {
      expect(
        await creation.result.current.mutateAsync({ agentID: "agent", userID: "user" }),
      ).toEqual({ sessionID: "backend" });
      expect(await chatting.result.current.mutateAsync(request)).toEqual({ content: "Hello" });
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/create_session$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ agentID: "agent", userID: "user" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/chat$/),
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) }),
    );
  });

  it.each(["create", "chat"] as const)(
    "does not retry a failed %s mutation, even with client retries enabled",
    async (operation) => {
      fetchMock.mockImplementation(async () =>
        Response.json({ code: "9999", info: "Rejected", data: null }),
      );
      const context = createQueryTestContext();
      const creation = renderHook(useCreateSessionMutation, context);
      const chatting = renderHook(useChatMutation, context);
      await act(async () => {
        const pending =
          operation === "create"
            ? creation.result.current.mutateAsync({ agentID: "agent", userID: "user" })
            : chatting.result.current.mutateAsync({
                agentID: "agent",
                userID: "user",
                sessionID: "backend",
                message: "Hi",
              });
        await expect(pending).rejects.toThrow("Rejected");
      });
      const mutation = operation === "create" ? creation : chatting;
      await waitFor(() => expect(mutation.result.current.isError).toBe(true));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
