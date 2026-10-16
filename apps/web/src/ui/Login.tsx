import { useLogin } from "@/hooks/useLogin";

function Login() {
  const {
    username,
    password,
    message,
    isLoggedIn,
    currentUser,
    setUsername,
    setPassword,
    handleLogin,
    handleFillDemo,
    handleLogout,
  } = useLogin();

  return (
    <main className="min-h-screen bg-base-200 px-4 py-6 text-base-content sm:px-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-box bg-base-100 shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-sky-50 p-7 text-slate-800 sm:p-10 lg:p-14">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-teal-200/40 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-box bg-primary font-black text-primary-content shadow-lg">
                tg
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">TLGODRAW</p>
                <p className="text-xs text-slate-500">Agent workbench</p>
              </div>
            </div>

            <div className="my-auto py-14">
              <div className="badge badge-primary badge-outline mb-5 gap-2 py-3 font-semibold">
                <span className="size-1.5 rounded-full bg-primary" />
                Intelligent workflow, made clear
              </div>
              <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Turn complex ideas into a draw-ready workflow.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                Connect agents, tools, and context in one focused workspace. Sign in to continue
                building with your team.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Tool Invocation",
                    desc: "Support for API / Shell / File execution chain orchestration",
                  },
                  {
                    title: "Memory and Context",
                    desc: "Configurable and auditable, reducing repetitive communication costs",
                  },
                  {
                    title: "Multi-model Routing",
                    desc: "Select the most appropriate model and strategy based on the scenario",
                  },
                  {
                    title: "Observability",
                    desc: "All aspects of the chain, cost, and failure reasons can be tracked",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-box border border-slate-900/5 bg-white/45 p-4"
                  >
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <b className="block text-sm">{item.title}</b>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="size-2 rounded-full bg-success" />
              Workspace services ready
            </div>
          </div>
        </section>

        <section className="flex min-h-full flex-col p-7 sm:p-12 lg:p-14">
          <div className="my-auto w-full">
            <div className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Welcome back
              </p>
              <h2 className="text-3xl font-black tracking-tight">Sign in to TLGODRAW</h2>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                Use the demo account below to explore the workspace.
              </p>
            </div>

            {!isLoggedIn ? (
              <form onSubmit={handleLogin} autoComplete="on" className="space-y-5">
                <label className="form-control w-full">
                  <span className="label-text mb-2 text-sm font-semibold">Username</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="input input-bordered input-lg w-full bg-base-100"
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label-text mb-2 text-sm font-semibold">Password</span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="input input-bordered input-lg w-full bg-base-100"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button type="submit" className="btn btn-primary btn-lg flex-1">
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="btn btn-ghost btn-lg sm:px-5"
                  >
                    Use demo
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-box border border-success/30 bg-success/10 p-4">
                <div>
                  <strong className="block text-sm">Signed in as {currentUser}</strong>
                  <span className="mt-1 block text-xs text-base-content/60">
                    Your session is active.
                  </span>
                </div>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            )}

            <div
              className={`alert mt-5 min-h-12 py-3 text-sm ${message.text ? "" : "invisible"} ${message.type === "error" ? "alert-error" : "alert-info"}`}
            >
              <span>{message.text || "No status message"}</span>
            </div>
          </div>

          <p className="mt-12 text-center text-xs text-base-content/40">
            © Too Long; Go Draw! · 2026
          </p>
        </section>
      </div>
    </main>
  );
}
export default Login;
