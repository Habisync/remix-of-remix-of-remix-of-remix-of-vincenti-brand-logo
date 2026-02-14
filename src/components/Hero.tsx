import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import { useSectionContent } from "@/hooks/use-section-content";

interface HeroProps {
  onOpenWizard: () => void;
}

interface HeroContent {
  id: string;
  eyebrow: string;
  headline: string;
  highlightedWord: string;
  subtitle: string;
  primaryCta: { label: string; href: string; variant?: string; subtext?: string };
  secondaryCta: { label: string; href: string; variant?: string };
}

interface StatItem {
  value: string;
  label: string;
}

export default function Hero({ onOpenWizard }: HeroProps) {
  const { data: hero } = useSectionContent<HeroContent>("hero");
  const { data: stats } = useSectionContent<StatItem[]>("stats");
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, prefersReduced ? 0 : 24]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  if (!hero) return null;

  return (
    <section
      ref={ref}
      className="relative flex items-end overflow-hidden"
      style={{ minHeight: "min(80vh, 700px)", paddingTop: "var(--header-height)" }}
    >
      <motion.div className="absolute inset-0 parallax-bg" style={{ y: imgY }}>
        <img
          src={heroBg}
          alt="Luxury Malta villa with infinity pool overlooking the Mediterranean"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero-overlay)" }} />
      </motion.div>

      <div className="section-container relative z-10 w-full pb-10 sm:pb-16">
        <motion.div style={{ opacity }} className="max-w-2xl">
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="micro-type text-primary mb-3">{hero.eyebrow}</p>
            <h1 className="font-serif font-semibold text-foreground mb-4">
              {hero.headline}{" "}
              <span className="gold-text">{hero.highlightedWord}</span>
            </h1>
            <p className="text-muted-foreground mb-6 prose-cap leading-relaxed" style={{ fontSize: "clamp(1rem, 0.9rem + 0.4vw, 1.25rem)" }}>
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onOpenWizard}
                className="px-7 py-3.5 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-gold-light transition-all hover:shadow-lg hover:scale-[1.02]"
              >
                {hero.primaryCta.label}
              </button>
              <a
                href={hero.secondaryCta.href}
                className="px-7 py-3.5 text-sm font-medium text-foreground border border-border rounded hover:border-primary hover:text-primary transition-colors text-center"
              >
                {hero.secondaryCta.label}
              </a>
            </div>
          </motion.div>
        </motion.div>

        {stats && (
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-xl sm:text-2xl font-serif font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
