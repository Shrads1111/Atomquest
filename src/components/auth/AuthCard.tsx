import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function AuthCard() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <motion.div
      className={cn(
        "w-full max-w-[480px] auth-glass-elevated p-8 sm:p-10",
        "shadow-2xl shadow-black/10 dark:shadow-black/40",
      )}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center mb-6">
        <motion.div
          className="text-[10px] uppercase tracking-[0.25em] text-primary font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Secure access
        </motion.div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
          {tab === "login" ? (
            <>
              Welcome to <span className="text-gradient-indigo">GoalSync</span>
            </>
          ) : (
            "Create your account"
          )}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {tab === "login"
            ? "Sign in to manage goals, OKRs, and performance."
            : "Join your organization’s performance workspace."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50 mb-6">
          <TabsTrigger
            value="login"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
          >
            Sign in
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
          >
            Register
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="login" className="mt-0 focus-visible:outline-none">
            {tab === "login" && <LoginForm key="login" />}
          </TabsContent>
          <TabsContent value="register" className="mt-0 focus-visible:outline-none">
            {tab === "register" && <RegisterForm key="register" />}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      <motion.div
        className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Firebase Auth · Firestore roles · Enterprise SSO ready
      </motion.div>
    </motion.div>
  );
}
