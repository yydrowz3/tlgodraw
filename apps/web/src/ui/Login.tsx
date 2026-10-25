import {
  BracketsCurlyIcon,
  BrainIcon,
  ChartLineIcon,
  GraphIcon,
  PolygonIcon,
  SignInIcon,
} from "@phosphor-icons/react";
import { useLogin } from "@/hooks/useLogin";
import { ThemeSelector } from "./ThemeSelector";

const features = [
  {
    title: "Tool Invocation",
    desc: "Support for API / Shell / File execution chain orchestration",
    Icon: BracketsCurlyIcon,
  },
  {
    title: "Memory and Context",
    desc: "Configurable and auditable, reducing repetitive communication costs",
    Icon: BrainIcon,
  },
  {
    title: "Multi-model Routing",
    desc: "Select the most appropriate model and strategy based on the scenario",
    Icon: GraphIcon,
  },
  {
    title: "Observability",
    desc: "All aspects of the chain, cost, and failure reasons can be tracked",
    Icon: ChartLineIcon,
  },
];
export default function Login() {
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
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-content">
                <PolygonIcon size={26} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wider">TLGODRAW</p>
                <p className="text-xs text-base-content/55">Agent workbench</p>
              </div>
            </div>
            <div className="my-auto py-10 lg:py-16">
              <div className="badge badge-outline mb-5 h-auto border-primary/25 px-3 py-2 text-xs font-medium text-primary">
                Intelligent workflow, made clear
              </div>
              <h1 className="max-w-xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Turn complex ideas into a draw-ready workflow.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-base-content/65 sm:text-base">
                Connect agents, tools, and context in one focused workspace. Sign in to continue
                building with your team.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {features.map(({ title, desc, Icon }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-xl border border-base-300/80 bg-base-100/60 p-4"
                  >
                    <Icon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <b className="block text-sm font-semibold">{title}</b>
                      <span className="mt-1 block text-xs leading-5 text-base-content/55">
                        {desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-base-content/55">
              <span className="size-2 rounded-full bg-primary" />
              Workspace services ready
            </div>
          </div>
        </section>
        <section className="flex min-h-full flex-col p-6 sm:p-10 lg:p-12">
          <div className="mb-10 flex justify-end">
            <ThemeSelector />
          </div>
          <div className="my-auto w-full">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-primary uppercase">
                Welcome back
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Sign in to TLGODRAW</h2>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                Use the demo account below to explore the workspace.
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
                        Username
                      </label>
                      <input
                        id={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Enter your username"
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
                        Password
                      </label>
                      <input
                        id={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="input min-h-12 w-full bg-base-100 text-base"
                      />
                    </fieldset>
                  )}
                </form.Field>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button type="submit" className="btn btn-primary min-h-12 flex-1">
                    <SignInIcon size={19} aria-hidden="true" />
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="btn btn-ghost min-h-12 sm:px-5"
                  >
                    Use demo
                  </button>
                </div>
              </form>
            ) : (
              <div className="alert border-success/30 bg-success/10">
                <div>
                  <strong className="block text-sm">Signed in as {currentUser}</strong>
                  <span className="mt-1 block text-xs text-base-content/60">
                    Your session is active.
                  </span>
                </div>
                <button onClick={handleLogout} className="btn btn-outline min-h-11">
                  Logout
                </button>
              </div>
            )}
            <div
              role="status"
              aria-live="polite"
              className={`alert mt-5 min-h-12 py-3 text-sm ${message.text ? "" : "invisible"} ${message.type === "error" ? "alert-error" : "alert-info"}`}
            >
              <span>{message.text || "No status message"}</span>
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
