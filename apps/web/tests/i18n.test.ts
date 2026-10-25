import { createInstance } from "i18next";
import { describe, expect, it, vi } from "vitest";
import {
  i18n,
  languages,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  resources,
  setLanguage,
} from "@/i18n";
import { AppError, formatError } from "@/i18n/messages";

function flatten(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof entry === "string" ? [[path, entry]] : Object.entries(flatten(entry, path));
    }),
  );
}

describe("interface language preferences", () => {
  it("starts in English even when the browser prefers Chinese", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
    expect(readLanguage()).toBe("en");
    expect(i18n.resolvedLanguage).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it.each(languages)("remembers %s for the next visit", async (language) => {
    await setLanguage(language);
    expect(readLanguage()).toBe(language);
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(language);
    expect(document.documentElement.lang).toBe(language);
    const nextVisit = createInstance();
    await nextVisit.init({ lng: readLanguage(), resources, fallbackLng: "en", initAsync: false });
    expect(nextVisit.t("login.title")).toBe(resources[language].translation.login.title);
  });

  it.each(["fr", "zh-TW", "null", ""])(
    "falls back to English for invalid stored value %s",
    (value) => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
      expect(readLanguage()).toBe("en");
    },
  );

  it("keeps switching in memory when reading and writing storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    expect(readLanguage()).toBe("en");
    await expect(setLanguage("ja")).resolves.toBeUndefined();
    expect(i18n.resolvedLanguage).toBe("ja");
    expect(document.documentElement.lang).toBe("ja");
    expect(i18n.t("common.language")).toBe("言語");
  });
});

describe("translation resources", () => {
  it("provides a translated fallback for unknown thrown values", async () => {
    expect(formatError(undefined)).toBe(resources.en.translation.errors.unknown);
    expect(formatError(null)).toBe(resources.en.translation.errors.unknown);
    await setLanguage("zh-CN");
    expect(formatError("Original detail")).toBe(
      `${resources["zh-CN"].translation.errors.unknown} Original detail`,
    );
  });
  it("has identical nonempty keys and interpolation parameters in all languages", () => {
    const english = flatten(resources.en.translation);
    for (const language of languages) {
      const translated = flatten(resources[language].translation);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, value] of Object.entries(translated)) {
        expect(value.trim(), `${language}: ${key}`).not.toBe("");
        const parameters = (text: string) =>
          [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
        expect(parameters(value), `${language}: ${key}`).toEqual(parameters(english[key]));
      }
    }
  });

  it("falls back to English when a translated key is missing", async () => {
    const instance = createInstance();
    await instance.init({
      lng: "ja",
      fallbackLng: "en",
      initAsync: false,
      resources: { en: resources.en, ja: { translation: { common: { language: "言語" } } } },
    });
    expect(instance.t("common.language")).toBe("言語");
    expect(instance.t("login.title")).toBe(resources.en.translation.login.title);
  });

  it("translates an existing semantic error while retaining original details and metadata", async () => {
    const error = new AppError("errors.http", {
      status: 503,
      code: "0001",
      detail: "Service unavailable",
    });
    expect(formatError(error)).toBe("The request failed (HTTP 503). Service unavailable");
    await setLanguage("zh-CN");
    expect(formatError(error)).toBe("请求失败（HTTP 503）。 Service unavailable");
    await setLanguage("ja");
    expect(formatError(error)).toContain("HTTP 503");
    expect(error).toMatchObject({ status: 503, code: "0001", detail: "Service unavailable" });
  });
});
