import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { MeshBackground } from "../components/goalsync/MeshBackground";
import { AppProviders } from "../components/providers/AppProviders";

function NotFoundComponent() {
  return (
    <div className="relative min-h-screen grid place-items-center px-4">
      <MeshBackground />
      <div className="relative glass-card p-10 max-w-md text-center">
        <div className="font-mono-metric text-xs tracking-[0.25em] text-indigo-300 uppercase">
          Route Not Mapped
        </div>
        <h1 className="mt-3 text-6xl font-bold text-gradient-indigo">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The requested execution node was not found in the GoalSync topology.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Return to Login Portal
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="relative min-h-screen grid place-items-center px-4">
      <MeshBackground />
      <div className="relative glass-card p-10 max-w-md text-center">
        <h1 className="text-xl font-semibold">System path interrupted</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            Retry
          </button>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GoalSync — Enterprise Performance Governance" },
      {
        name: "description",
        content:
          "Cinematic enterprise goal-setting, governance and performance intelligence platform.",
      },
      { name: "theme-color", content: "#05060B" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <MeshBackground />
        <div className="relative z-10">
          <Outlet />
        </div>

        {/* Full-canvas Offline Overlay */}
        {!isOnline && (
          <div className="fixed inset-0 z-[9999] bg-[#05060b]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative glass-card border border-amber-500/30 p-10 max-w-md text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400 mx-auto">
                <WifiOff className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="font-mono-metric text-xs tracking-[0.25em] text-amber-400 uppercase">
                  Connection Interrupted
                </div>
                <h1 className="mt-2 text-2xl font-bold text-white/95">Corporate Network Offline</h1>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  GoalSync has lost telemetry connection to the cloud registry. Active sheets and
                  check-in workspaces will automatically synchronize once connectivity is restored.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono-metric bg-white/5 px-2.5 py-1 rounded-full border border-white/5 animate-pulse">
                  ⏳ Awaiting telemetry handshake...
                </span>
              </div>
            </div>
          </div>
        )}
      </AppProviders>
    </QueryClientProvider>
  );
}
