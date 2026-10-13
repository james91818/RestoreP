import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import heroBg from "@/assets/hero-trading.jpg";

type PageHeroProps = {
  kicker?: string;
  icon?: LucideIcon;
  title: string;
  highlight?: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
};

const PageHero = ({ kicker, icon: Icon, title, highlight, description, children, compact }: PageHeroProps) => {
  const reduce = useReducedMotion();
  const anim = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section
      className="relative overflow-hidden"
      style={{
        color: "#F5F7FA",
        fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,12,27,0.86) 0%, rgba(3,15,34,0.72) 45%, rgba(5,22,48,0.58) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 72% 40%, rgba(76,135,255,0.10), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28))",
        }}
      />

      <div className={`relative container mx-auto px-4 ${compact ? "py-14 md:py-16" : "py-20 md:py-24"} max-w-5xl text-center`}>
        <motion.div {...anim}>
          {kicker && (
            <div className="inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold tracking-[0.22em] uppercase text-[#7cb7ff] mb-5">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{kicker}</span>
            </div>
          )}
          <h1
            className="hero-glass-text font-display"
            style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.022em",
              paddingBottom: "0.15em",
            }}
          >
            {title}
            {highlight && (
              <>
                {" "}
                <span className="hero-glass-text-animated">{highlight}</span>
              </>
            )}
          </h1>
          {description && (
            <p
              className="mt-6 mx-auto max-w-2xl text-base md:text-lg leading-relaxed"
              style={{ color: "rgba(230, 238, 250, 0.78)" }}
            >
              {description}
            </p>
          )}
          {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
        </motion.div>
      </div>

    </section>
  );
};

export default PageHero;