import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Activity, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { getDashboardPathForRole, getRoleLabel } from "@/lib/auth/routes";
import type { UserRole } from "@/lib/auth/types";

const NAV_BY_ROLE: Record<UserRole, { to: string; label: string }[]> = {
  employee: [
    { to: "/employee", label: "My Goals" },
    { to: "/goals/new", label: "New Goal" },
    { to: "/checkin", label: "Check-In" },
    { to: "/intelligence", label: "Insights" },
  ],
  manager: [
    { to: "/manager", label: "Team" },
    { to: "/employee", label: "My Goals" },
    { to: "/checkin", label: "Check-In" },
    { to: "/intelligence", label: "Insights" },
  ],
  admin: [
    { to: "/admin", label: "Admin" },
    { to: "/manager", label: "Teams" },
    { to: "/employee", label: "Workspace" },
    { to: "/intelligence", label: "Analytics" },
  ],
};

import { NotificationCenter } from "./NotificationCenter";

export function TopNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const role = user?.role ?? "employee";
  const navItems = NAV_BY_ROLE[role];
  const homePath = getDashboardPathForRole(role);
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "GS";

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/" });
  };

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-[var(--border-glass-subtle)]">
        <div className="mx-auto max-w-[1480px] px-6 h-16 flex items-center justify-between">
          <Link to={homePath} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center shadow-[0_0_20px_var(--glow-brand-indigo)]">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">GoalSync</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-metric">
                {getRoleLabel(role)} Portal
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const active =
                loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
                    active
                      ? "text-foreground bg-primary/15 border border-[var(--border-glass-active)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user && <NotificationCenter />}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="hidden lg:flex items-center gap-2 chip chip-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-accent" />
              <span>SYNC 99.8%</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 grid place-items-center text-xs font-semibold ring-1 ring-border/50 hover:ring-primary/50 transition-shadow"
                  aria-label="Account menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user?.fullName}</div>
                  <div className="text-xs text-muted-foreground font-normal truncate">
                    {user?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLogoutOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
      />
    </>
  );
}
