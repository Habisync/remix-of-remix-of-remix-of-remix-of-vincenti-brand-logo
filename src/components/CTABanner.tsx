import { motion, useReducedMotion } from "framer-motion";
import { useSectionContent } from "@/hooks/use-section-content";

interface CTABannerProps {
  onOpenWizard: () => void;
}

interface CTAContent {
  headline: string;
  highlightedWord: string;
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

interface BrandContent {
  email: string;
}

export default function CTABanner({ onOpenWizard }: CTABannerProps) {
  const prefersReduced = useReducedMotion();
  const { data: cta } = useSectionContent<CTAContent>("ctaBanner");
  const { data: brand } = useSectionContent<BrandContent>("brand");

  if (!cta) return null;

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
      <div className="section-container relative z-10">
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-serif font-semibold text-foreground mb-3">
            {cta.headline} <span className="gold-text">{cta.highlightedWord}</span>?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">{cta.subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenWizard}
              className="px-7 py-3.5 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-gold-light transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              {cta.primaryCtaLabel}
            </button>
            <a
              href={`mailto:${brand?.email || "info@christianopm.com"}`}
              className="px-7 py-3.5 text-sm font-medium text-foreground border border-border rounded hover:border-primary hover:text-primary transition-colors"
            >
              {cta.secondaryCtaLabel}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
