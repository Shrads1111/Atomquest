import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegisterSuccessProps {
  name: string;
  onContinue: () => void;
}

export function RegisterSuccess({ name, onContinue }: RegisterSuccessProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center py-6"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
      >
        <div className="h-20 w-20 rounded-full bg-emerald-500/15 grid place-items-center ring-4 ring-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          <Sparkles className="h-5 w-5 text-amber-400" />
        </motion.div>
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight">Account created!</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Welcome aboard, <span className="text-foreground font-medium">{name}</span>. Your workspace
        is ready.
      </p>

      <motion.div
        className="mt-8 w-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button className="w-full h-11" onClick={onContinue}>
          Enter your dashboard
        </Button>
      </motion.div>
    </motion.div>
  );
}
