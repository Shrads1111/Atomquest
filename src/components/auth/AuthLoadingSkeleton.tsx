import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingSkeleton() {
  return (
    <motion.div className="w-full max-w-[480px] auth-glass-elevated p-10 space-y-4">
      <Skeleton className="h-4 w-32 mx-auto cinematic-shimmer" />
      <Skeleton className="h-8 w-64 mx-auto cinematic-shimmer" />
      <Skeleton className="h-10 w-full cinematic-shimmer" />
      <Skeleton className="h-10 w-full cinematic-shimmer" />
      <Skeleton className="h-10 w-full cinematic-shimmer" />
      <Skeleton className="h-11 w-full cinematic-shimmer" />
    </motion.div>
  );
}
