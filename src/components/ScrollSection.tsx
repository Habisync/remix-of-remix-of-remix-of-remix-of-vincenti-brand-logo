import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ScrollSectionProps {
  children: ReactNode;
  className?: string;
  /** If true, section tries to fill viewport height */
  fitScreen?: boolean;
}

export default function ScrollSection({ children, className = "", fitScreen = false }: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [30, 0, 0, -15]);

  const fitClass = fitScreen ? "min-h-[100dvh] flex flex-col justify-center" : "";

  if (prefersReduced) {
    return <div className={`${fitClass} ${className}`}>{children}</div>;
  }

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={`${fitClass} ${className}`}>
      {children}
    </motion.div>
  );
}
