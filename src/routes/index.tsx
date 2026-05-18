import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { getDashboardPathForRole } from "@/lib/auth/routes";
import { getOptionalAuthUser } from "@/lib/auth/route-guards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — GoalSync" },
      {
        name: "description",
        content:
          "Secure enterprise authentication for the GoalSync goal-setting and performance platform.",
      },
    ],
  }),
  beforeLoad: async () => {
    const user = await getOptionalAuthUser();
    if (user) {
      throw redirect({ to: getDashboardPathForRole(user.role) });
    }
  },
  component: AuthPage,
});
