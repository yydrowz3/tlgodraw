import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import AuthGuard from "@/ui/AuthGuard";
import { COOKIE_NAME, setCookie, setUserInfo } from "@/utils/cookie";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));

function renderProtectedRoute() {
  const root = createRootRoute({ component: Outlet });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <AuthGuard>
        <h1>Protected workbench</h1>
      </AuthGuard>
    ),
  });
  const login = createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: () => <h1>Sign in</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, login]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe("protected routes", () => {
  it.each(["missing", "invalid JSON", "invalid encoding", "empty user"])(
    "redirects a visitor with %s login data",
    async (kind) => {
      if (kind === "invalid JSON") setCookie(COOKIE_NAME, "invalid", 1);
      if (kind === "invalid encoding") document.cookie = `${COOKIE_NAME}=%E0%A4%A; Path=/`;
      if (kind === "empty user") setCookie(COOKIE_NAME, JSON.stringify({ user: "", ts: 1 }), 1);
      const router = renderProtectedRoute();
      expect(await screen.findByRole("heading", { name: "Sign in" })).toBeTruthy();
      expect(router.state.location.pathname).toBe("/login");
      expect(screen.queryByText("Protected workbench")).toBeNull();
    },
  );

  it("renders protected content for a saved login", async () => {
    setUserInfo("admin");
    const router = renderProtectedRoute();
    expect(await screen.findByRole("heading", { name: "Protected workbench" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByText("Sign in")).toBeNull();
  });
});
