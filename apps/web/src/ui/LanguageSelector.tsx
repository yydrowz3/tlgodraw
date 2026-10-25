import { useTranslation } from "react-i18next";
import { isLanguage, setLanguage } from "@/i18n";

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  return (
    <select
      aria-label={t("common.language")}
      className="select min-h-11 w-27 shrink-0 bg-base-100 px-2 text-sm sm:w-32"
      value={i18n.resolvedLanguage}
      onChange={(event) => {
        const language = event.target.value;
        if (isLanguage(language)) void setLanguage(language);
      }}
    >
      <option value="en" lang="en">
        English
      </option>
      <option value="zh-CN" lang="zh-CN">
        简体中文
      </option>
      <option value="ja" lang="ja">
        日本語
      </option>
    </select>
  );
}
