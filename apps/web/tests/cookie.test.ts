import { describe, expect, it, vi } from "vitest";
import {
  clearUserInfo,
  COOKIE_DAYS,
  COOKIE_NAME,
  deleteCookie,
  getCookie,
  getUserInfo,
  setCookie,
  setUserInfo,
} from "@/utils/cookie";

describe("browser cookies", () => {
  it("round-trips Unicode and reserved characters without affecting other cookies", () => {
    setCookie("other", "keep", 1);
    const value = "用户 = admin; 100% & more";
    setCookie("sample", value, 1);
    expect(document.cookie).toContain(`sample=${encodeURIComponent(value)}`);
    expect(getCookie("sample")).toBe(value);
    expect(getCookie("other")).toBe("keep");
    expect(getCookie("missing")).toBeNull();
  });

  it("matches the whole cookie name and preserves empty values", () => {
    setCookie("sample_extra", "other", 1);
    setCookie("sample", "", 1);
    expect(getCookie("sample")).toBe("");
    expect(getCookie("sam")).toBeNull();
  });

  it.each([0, -1])("expires cookies with a nonpositive lifetime (%s days)", (days) => {
    setCookie("sample", "old", 1);
    setCookie("sample", "expired", days);
    expect(getCookie("sample")).toBeNull();
  });

  it("deletes only the requested cookie", () => {
    setCookie("sample", "remove", 1);
    setCookie("other", "keep", 1);
    deleteCookie("sample");
    expect(getCookie("sample")).toBeNull();
    expect(getCookie("other")).toBe("keep");
  });
});

describe("login persistence", () => {
  it("stores the user and timestamp for seven days with root path and SameSite protection", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    const setter = vi.spyOn(document, "cookie", "set");
    setUserInfo("管理员");
    expect(getUserInfo()).toEqual({ user: "管理员", ts: Date.now() });
    expect(setter).toHaveBeenCalledWith(
      expect.stringContaining(`; Max-Age=${COOKIE_DAYS * 86400}; Path=/; SameSite=Lax`),
    );
    vi.setSystemTime(new Date("2026-11-06T00:00:00Z"));
    expect(getUserInfo()).toBeNull();
  });

  it("returns no user for missing or invalid JSON and clears a saved login", () => {
    expect(getUserInfo()).toBeNull();
    setCookie(COOKIE_NAME, "{invalid", 1);
    expect(getUserInfo()).toBeNull();
    setUserInfo("admin");
    clearUserInfo();
    expect(getUserInfo()).toBeNull();
  });

  it("treats malformed percent encoding as an invalid login", () => {
    document.cookie = `${COOKIE_NAME}=%E0%A4%A; Path=/`;
    expect(getUserInfo()).toBeNull();
  });
});
