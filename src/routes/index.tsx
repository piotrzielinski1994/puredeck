import { createRoute } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { rootRoute } from "@/routes/__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WorkspaceLayout,
});
