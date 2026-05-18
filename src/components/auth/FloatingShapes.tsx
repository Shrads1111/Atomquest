import { motion } from "framer-motion";

const SHAPES = [
  { size: 120, x: "8%", y: "12%", delay: 0, color: "rgba(79,70,229,0.15)" },
  { size: 80, x: "85%", y: "18%", delay: 0.4, color: "rgba(37,99,235,0.12)" },
  { size: 60, x: "72%", y: "75%", delay: 0.8, color: "rgba(16,185,129,0.1)" },
  { size: 100, x: "15%", y: "70%", delay: 1.2, color: "rgba(129,140,248,0.1)" },
  { size: 40, x: "50%", y: "8%", delay: 0.6, color: "rgba(245,158,11,0.08)" },
];

export function FloatingShapes() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {SHAPES.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            width: s.size,
            height: s.size,
            left: s.x,
            top: s.y,
            background: s.color,
          }}
          animate={{
            y: [0, -18, 0, 14, 0],
            x: [0, 10, -8, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 8 + i * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay,
          }}
        />
      ))}
    </motion.div>
  );
}
