import { motion } from "framer-motion";
import { evaluatePasswordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

const LABEL_COLORS = {
  weak: "text-destructive",
  fair: "text-amber-500",
  good: "text-blue-500",
  strong: "text-emerald-500",
};

const SEGMENT_COLORS = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-blue-500",
  strong: "bg-emerald-500",
};

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const { label, segments, hints } = evaluatePasswordStrength(password);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-2"
    >
      <motion.div className="flex gap-1.5" layout>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= segments ? SEGMENT_COLORS[label] : "bg-muted",
            )}
          />
        ))}
      </motion.div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium capitalize", LABEL_COLORS[label])}>{label} password</span>
        {hints.length > 0 && (
          <span className="text-muted-foreground truncate max-w-[60%]">{hints[0]}</span>
        )}
      </div>
    </motion.div>
  );
}
