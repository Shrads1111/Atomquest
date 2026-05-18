import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TopNav } from "@/components/goalsync/TopNav";
import { requireAuth } from "@/lib/auth/route-guards";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await requireAuth();
    return { user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1480px] px-6 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1480px] px-6 py-10 text-[11px] text-muted-foreground font-mono-metric flex items-center justify-between border-t border-[var(--border-glass-subtle)] mt-10">
        <span>GoalSync Enterprise · v4.2.0 · Obsidian Cinematic</span>
        <span>SOC2 · ISO 27001 · GDPR</span>
      </footer>
    </div>
  );
}
