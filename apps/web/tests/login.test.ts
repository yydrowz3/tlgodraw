import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "@/hooks/useLogin";
import { getUserInfo, setUserInfo } from "@/utils/cookie";
import { resources } from "@/i18n";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

beforeEach(() => navigate.mockReset());

describe("login form", () => {
  it.each([
    ["", ""],
    ["admin", ""],
    ["", "admin"],
  ])("rejects incomplete credentials (%s, %s)", async (username, password) => {
    const { result } = renderHook(useLogin);
    act(() => {
      result.current.form.setFieldValue("username", username);
      result.current.form.setFieldValue("password", password);
    });
    await act(() => result.current.form.handleSubmit());
    expect(result.current.message).toEqual({
      text: resources.en.translation.login.required,
      type: "error",
    });
    expect(result.current.isLoggedIn).toBe(false);
    expect(getUserInfo()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("rejects incorrect credentials without saving a login or navigating", async () => {
    const { result } = renderHook(useLogin);
    act(() => {
      result.current.form.setFieldValue("username", "admin");
      result.current.form.setFieldValue("password", "wrong");
    });
    await act(() => result.current.form.handleSubmit());
    expect(result.current.message.text).toBe(resources.en.translation.login.invalid);
    expect(getUserInfo()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("fills the demo without submitting and redirects once after successful login", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(useLogin);
    act(() => result.current.handleFillDemo());
    expect(result.current.form.state.values).toEqual({ username: "admin", password: "admin" });
    expect(result.current.message.text).toBe(resources.en.translation.login.demoFilled);
    expect(getUserInfo()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    await act(() => result.current.form.handleSubmit());
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.currentUser).toBe("admin");
    expect(getUserInfo()).toMatchObject({ user: "admin" });
    expect(result.current.message.text).toBe(resources.en.translation.login.success);
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(499));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/" });
  });

  it("restores an existing login and redirects immediately", () => {
    setUserInfo("admin");
    const { result, rerender } = renderHook(useLogin);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.currentUser).toBe("admin");
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/" });
    rerender();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("logs out, clears the cookie and cancels the pending redirect", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(useLogin);
    act(() => result.current.handleFillDemo());
    await act(() => result.current.form.handleSubmit());
    act(() => result.current.handleLogout());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.currentUser).toBe("");
    expect(result.current.message.text).toBe(resources.en.translation.login.loggedOut);
    expect(getUserInfo()).toBeNull();
    act(() => vi.advanceTimersByTime(500));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("cancels the redirect when the form unmounts", async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(useLogin);
    act(() => result.current.handleFillDemo());
    await act(() => result.current.form.handleSubmit());
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(navigate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
