import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSectionContent } from "@/hooks/use-section-content";

interface AboutSectionProps {
  onOpenWizard: () => void;
}

interface AboutContent {
  id: string;
  eyebrow: string;
  title: string;
  highlightedWord: string;
  body: string[];
  credentials: string[];
}

const CREDENTIAL_VALUES = ["9+", "45+", "€2.4M+", "4.97"];
const CREDENTIAL_LABELS = ["Years Superhost Experience", "Properties Managed", "Revenue Generated", "Average Guest Rating"];

export default function AboutSection({ onOpenWizard }: AboutSectionProps) {
  const { data: about } = useSectionContent<AboutContent>("about");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);

  if (!about) return null;

  return (
    <section id="about" ref={ref} className="section-padding bg-card/30">
      <div className="section-container w-full">
        <motion.div style={{ y }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="micro-type text-primary mb-3">{about.eyebrow}</p>
            <h2 className="font-serif font-semibold text-foreground">
              {about.title} <span className="gold-text">{about.highlightedWord}</span>
            </h2>
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5 text-sm text-muted-foreground leading-relaxed"
          >
            {about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <button
              onClick={onOpenWizard}
              className="mt-2 px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-gold-light transition-colors"
            >
              Get In Touch
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {CREDENTIAL_VALUES.map((value, i) => (
              <div
                key={i}
                className="glass-surface rounded-lg p-5 text-center hover:border-primary/30 transition-colors"
              >
                <p className="text-2xl font-serif font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{CREDENTIAL_LABELS[i]}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
