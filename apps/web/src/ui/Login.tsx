import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import {
  BracketsCurlyIcon,
  BrainIcon,
  ChartLineIcon,
  GraphIcon,
  SignInIcon,
} from "@phosphor-icons/react";
import { useLogin } from "@/hooks/useLogin";
import { ThemeSelector } from "./ThemeSelector";
import { BrandMark } from "./BrandMark";

const features = [
  {
    title: "login.toolsTitle",
    desc: "login.toolsDescription",
    Icon: BracketsCurlyIcon,
  },
  {
    title: "login.memoryTitle",
    desc: "login.memoryDescription",
    Icon: BrainIcon,
  },
  {
    title: "login.modelsTitle",
    desc: "login.modelsDescription",
    Icon: GraphIcon,
  },
  {
    title: "login.observabilityTitle",
    desc: "login.observabilityDescription",
    Icon: ChartLineIcon,
  },
] as const;
export default function Login() {
  const { t } = useTranslation();
  const { message, isLoggedIn, currentUser, form, handleFillDemo, handleLogout } = useLogin();
  return (
    <main className="min-h-dvh bg-base-200 px-4 py-4 text-base-content sm:px-8 lg:flex lg:items-center lg:justify-center lg:py-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border-b border-base-300 bg-primary/5 p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">
          <div
            className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <BrandMark size={56} />
              <div>
                <p className="text-sm font-bold tracking-wider">Too Long; Go Draw!</p>
                <p className="text-xs text-base-content/55">{t("login.workbench")}</p>
              </div>
            </div>
            <div className="my-auto py-10 lg:py-16">
              <div className="badge badge-outline mb-5 h-auto border-primary/25 px-3 py-2 text-xs font-medium text-primary">
                {t("login.badge")}
              </div>
              <h1 className="max-w-xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t("login.headline")}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-base-content/65 sm:text-base">
                {t("login.description")}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {features.map(({ title, desc, Icon }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-xl border border-base-300/80 bg-base-100/60 p-4"
                  >
                    <Icon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <b className="block text-sm font-semibold">{t(title)}</b>
                      <span className="mt-1 block text-xs leading-5 text-base-content/55">
                        {t(desc)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-base-content/55">
              <span className="size-2 rounded-full bg-primary" />
              {t("login.ready")}
            </div>
          </div>
        </section>
        <section className="flex min-h-full flex-col p-6 sm:p-10 lg:p-12">
          <div className="mb-10 flex flex-wrap justify-end gap-2">
            <LanguageSelector />
            <ThemeSelector />
          </div>
          <div className="my-auto w-full">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-primary uppercase">
                {t("login.welcome")}
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("login.title")}</h2>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                {t("login.demoDescription")}
              </p>
            </div>
            {!isLoggedIn ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
                autoComplete="on"
                className="space-y-5"
              >
                <form.Field name="username">
                  {(field) => (
                    <fieldset className="fieldset gap-2">
                      <label
                        htmlFor={field.name}
                        className="fieldset-label text-sm font-medium text-base-content"
                      >
                        {t("login.username")}
                      </label>
                      <input
                        id={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder={t("login.usernamePlaceholder")}
                        autoComplete="username"
                        className="input min-h-12 w-full bg-base-100 text-base"
                      />
                    </fieldset>
                  )}
                </form.Field>
                <form.Field name="password">
                  {(field) => (
                    <fieldset className="fieldset gap-2">
                      <label
                        htmlFor={field.name}
                        className="fieldset-label text-sm font-medium text-base-content"
                      >
                        {t("login.password")}
                      </label>
                      <input
                        id={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder={t("login.passwordPlaceholder")}
                        autoComplete="current-password"
                        className="input min-h-12 w-full bg-base-100 text-base"
                      />
                    </fieldset>
                  )}
                </form.Field>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button type="submit" className="btn btn-primary min-h-12 flex-1">
                    <SignInIcon size={19} aria-hidden="true" />
                    {t("login.signIn")}
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="btn btn-ghost min-h-12 sm:px-5"
                  >
                    {t("login.useDemo")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="alert border-success/30 bg-success/10">
                <div>
                  <strong className="block text-sm">
                    {t("login.signedIn", { user: currentUser })}
                  </strong>
                  <span className="mt-1 block text-xs text-base-content/60">
                    {t("login.activeSession")}
                  </span>
                </div>
                <button onClick={handleLogout} className="btn btn-outline min-h-11">
                  {t("common.logout")}
                </button>
              </div>
            )}
            <div
              role="status"
              aria-live="polite"
              className={`alert mt-5 min-h-12 py-3 text-sm ${message.text ? "" : "invisible"} ${message.type === "error" ? "alert-error" : "alert-info"}`}
            >
              <span>{message.text || t("login.noStatus")}</span>
            </div>
          </div>
          <p className="mt-10 text-center text-xs text-base-content/45">
            © Too Long; Go Draw! · 2026
          </p>
        </section>
      </div>
    </main>
  );
}
