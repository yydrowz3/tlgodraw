import AuthGuard from "@/ui/AuthGuard";
import Workbench from "@/ui/Workbench";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGuard>
      <Workbench />
    </AuthGuard>
  ),
});
