import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach } from "vitest";

const clients = new Set<QueryClient>();

afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
});

export function createQueryTestContext() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retryDelay: 0 },
      // API mutations must explicitly override retries, even if the client enables them.
      mutations: { retry: 2, retryDelay: 0 },
    },
  });
  clients.add(client);
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}
