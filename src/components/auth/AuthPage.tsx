import { motion } from "framer-motion";
import { Workflow } from "lucide-react";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLoadingSkeleton } from "@/components/auth/AuthLoadingSkeleton";
import { GoogleProfileDialog } from "@/components/auth/GoogleProfileDialog";
import { FloatingShapes } from "@/components/auth/FloatingShapes";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { useAuth } from "@/contexts/auth-context";

export function AuthPage() {
  const { isLoading } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] auth-page">
      <FloatingShapes />

      <motion.div
        className="absolute top-4 right-4 z-20 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <ThemeToggle />
      </motion.div>

      <motion.div
        className="lg:hidden relative z-10 flex items-center justify-center gap-2 pt-8 pb-2 px-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center">
          <Workflow className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg">GoalSync</span>
      </motion.div>

      <AuthBrandingPanel />

      <section className="relative flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        {isLoading ? <AuthLoadingSkeleton /> : <AuthCard />}
      </section>

      <GoogleProfileDialog />
    </div>
  );
}
