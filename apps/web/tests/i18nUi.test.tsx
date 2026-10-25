import { createQueryTestContext } from "./queryTestUtils";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, resources, setLanguage } from "@/i18n";
import { GREETING } from "@/hooks/useSessions";
import { queryAiAgentConfigList } from "@/services/apiAgent";
import Login from "@/ui/Login";
import Workbench from "@/ui/Workbench";
import { ExportDialog } from "@/ui/workbench/ExportDialog";
import { RenameSessionDialog } from "@/ui/workbench/RenameSessionDialog";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/utils/cookie", () => ({
  getUserInfo: () => null,
  clearUserInfo: vi.fn(),
  setUserInfo: vi.fn(),
}));
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));
vi.mock("@/services/apiAgent", () => ({
  queryAiAgentConfigList: vi.fn(),
  createSession: vi.fn(),
  chat: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(queryAiAgentConfigList).mockReset();
  vi.mocked(queryAiAgentConfigList).mockResolvedValue({
    code: "0000",
    info: "",
    data: [{ agentID: "agent", agentName: "Original agent name", agentDesc: "" }],
  });
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.includes("min-width"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    }),
  });
});

describe("live interface translation", () => {
  it("switches the login page in place and translates an existing validation message", async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "unfinished user" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(resources.en.translation.login.required);
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "zh-CN" },
    });
    await screen.findByRole("heading", { name: "登录 TLGODRAW" });
    expect(screen.getByLabelText("用户名")).toHaveProperty("value", "unfinished user");
    expect(screen.getByText(resources["zh-CN"].translation.login.required)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "语言" }), { target: { value: "ja" } });
    await screen.findByRole("heading", { name: "TLGODRAW にログイン" });
    expect(screen.getByLabelText("ユーザー名")).toHaveProperty("value", "unfinished user");
    expect(screen.getByText(resources.ja.translation.login.required)).toBeTruthy();
    expect(document.documentElement.lang).toBe("ja");
  });

  it("preserves the editor, draft, history and agent query while translating built-in content", async () => {
    const legacy = {
      id: "legacy",
      title: "New Chat",
      messages: [{ id: "g", role: "agent", content: GREETING, timestamp: 1 }],
      drawIoXml: "<mxfile/>",
      lastModified: 1,
    };
    localStorage.setItem("drawio_sessions", JSON.stringify([legacy]));
    render(<Workbench />, createQueryTestContext());
    await screen.findByRole("option", { name: "Original agent name" });
    const iframe = document.querySelector("iframe")!;
    const src = iframe.src;
    fireEvent.change(screen.getByLabelText("Describe your diagram"), {
      target: { value: "draft 不要翻译" },
    });
    const date = vi.spyOn(Date.prototype, "toLocaleDateString");
    const time = vi.spyOn(Date.prototype, "toLocaleTimeString");
    for (const language of ["zh-CN", "ja", "en"] as const) {
      await act(() => setLanguage(language));
      const text = resources[language].translation;
      expect(screen.getByLabelText(text.composer.label)).toHaveProperty("value", "draft 不要翻译");
      expect(screen.getByText(text.sessions.newChat)).toBeTruthy();
      expect(screen.getByText(text.assistant.greeting)).toBeTruthy();
      expect(document.querySelector("iframe")).toBe(iframe);
      expect(iframe.src).toBe(src);
      expect(date).toHaveBeenLastCalledWith(language);
      expect(time).toHaveBeenLastCalledWith(language, { hour: "2-digit", minute: "2-digit" });
    }
    expect(queryAiAgentConfigList).toHaveBeenCalledOnce();
    const saved = JSON.parse(localStorage.getItem("drawio_sessions")!)[0];
    expect(saved).toMatchObject({
      title: "New Chat",
      isDefaultTitle: true,
      drawIoXml: "<mxfile/>",
    });
    expect(saved.messages[0]).toMatchObject({ kind: "greeting", content: GREETING });
    expect(i18n.resolvedLanguage).toBe("en");
  });

  it("inserts examples in the current language without rewriting existing drafts on a switch", async () => {
    render(<Workbench />, createQueryTestContext());
    await screen.findByRole("option", { name: "Original agent name" });
    await act(() => setLanguage("ja"));
    fireEvent.click(
      screen.getByRole("button", { name: resources.ja.translation.quickActions.loginLabel }),
    );
    const prompt = resources.ja.translation.quickActions.loginText;
    expect(screen.getByLabelText(resources.ja.translation.composer.label)).toHaveProperty(
      "value",
      prompt,
    );
    await act(() => setLanguage("zh-CN"));
    expect(screen.getByLabelText(resources["zh-CN"].translation.composer.label)).toHaveProperty(
      "value",
      prompt,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: resources["zh-CN"].translation.quickActions.shoppingLabel,
      }),
    );
    expect(screen.getByLabelText(resources["zh-CN"].translation.composer.label)).toHaveProperty(
      "value",
      resources["zh-CN"].translation.quickActions.shoppingText,
    );
  });

  it("retains custom titles, user messages and AI replies verbatim", async () => {
    const session = {
      id: "custom",
      title: "New Chat",
      isDefaultTitle: false,
      messages: [
        { id: "u", role: "user", content: "用户消息", timestamp: 1 },
        { id: "a", role: "agent", content: "Original AI reply", timestamp: 2 },
      ],
      drawIoXml: "<mxfile/>",
      lastModified: 2,
    };
    localStorage.setItem("drawio_sessions", JSON.stringify([session]));
    render(<Workbench />, createQueryTestContext());
    await act(() => setLanguage("ja"));
    expect(screen.getByText("New Chat")).toBeTruthy();
    expect(screen.getByText("用户消息")).toBeTruthy();
    expect(screen.getByText("Original AI reply")).toBeTruthy();
    expect(screen.queryByText(resources.ja.translation.assistant.greeting)).toBeNull();
  });

  it("translates open export and rename dialogs while preserving rename input", async () => {
    const onClose = vi.fn();
    const preview = render(<ExportDialog data="data:image/svg+xml,test" onClose={onClose} />);
    await act(() => setLanguage("zh-CN"));
    expect(screen.getByRole("dialog", { name: "导出已就绪" })).toBeTruthy();
    expect(screen.getByAltText("导出的图表")).toBeTruthy();
    preview.unmount();
    render(
      <RenameSessionDialog
        session={{
          id: "r",
          title: "Original name",
          messages: [],
          drawIoXml: null,
          lastModified: 1,
        }}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("会话名称"), { target: { value: "unfinished rename" } });
    await act(() => setLanguage("ja"));
    expect(screen.getByRole("dialog", { name: "セッション名を変更" })).toBeTruthy();
    expect(screen.getByLabelText("セッション名")).toHaveProperty("value", "unfinished rename");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
