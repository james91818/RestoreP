import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, TrendingUp, BarChart3, Users, Shield,
  Monitor, Cpu, PiggyBank, Globe, CreditCard,
} from "lucide-react";

const sections = [
  { id: "hero", label: "Start", desc: "Willkommen", icon: Rocket },
  { id: "performance", label: "Performance", desc: "Ergebnisse & Rendite", icon: TrendingUp },
  { id: "erfolg", label: "Erfolge", desc: "Investoren-Geschichten", icon: Users },
  { id: "vertrauen", label: "Vertrauen", desc: "Sicherheit & Qualität", icon: Shield },
  { id: "maerkte", label: "Märkte", desc: "Live-Handel & Instrumente", icon: Monitor },
  { id: "technology", label: "KI-Trading", desc: "Automatisierte Strategie", icon: Cpu },
  { id: "krypto", label: "Krypto", desc: "Krypto-Vorsorge", icon: PiggyBank },
  { id: "dach", label: "DACH", desc: "Deutschland · Österreich · Schweiz", icon: Globe },
  { id: "zahlung", label: "Zahlung", desc: "Zahlungsmethoden", icon: CreditCard },
];

export default function SectionSidebar() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setVisible(scrollY > 500 && scrollY < docHeight - 200);

    let current = 0;
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i].id);
      if (el && el.getBoundingClientRect().top <= 250) {
        current = i;
        break;
      }
    }
    setActive(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-end gap-0"
          onMouseLeave={() => setHovered(null)}
          style={{ pointerEvents: "none" }}
        >
          {/* Vertical line behind dots */}
          <div className="absolute right-[7px] top-3 bottom-3 w-[2px] bg-[#3b82f6]/10 rounded-full" />
          {/* Progress fill */}
          <motion.div
            className="absolute right-[7px] top-3 w-[2px] bg-gradient-to-b from-[#3b82f6] to-[#93c5fd] rounded-full origin-top"
            animate={{ height: `${((active) / (sections.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ maxHeight: "calc(100% - 24px)" }}
          />

          {sections.map((s, i) => {
            const isActive = i === active;
            const isPast = i < active;
            const isHovered = hovered === i;
            const Icon = s.icon;

            return (
              <div
                key={s.id}
                className="relative flex items-center justify-end group cursor-pointer py-[10px]"
                style={{ pointerEvents: "auto" }}
                onClick={() => scrollTo(s.id)}
                onMouseEnter={() => setHovered(i)}
              >
                {/* Tooltip label */}
                <AnimatePresence>
                  {(isHovered || isActive) && (
                    <motion.div
                      initial={{ opacity: 0, x: 8, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 8, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className={`mr-4 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border shadow-lg whitespace-nowrap ${
                        isActive
                          ? "bg-[#3b82f6]/15 border-[#3b82f6]/30 shadow-[#3b82f6]/10"
                          : "bg-[hsl(var(--l-bg)/0.9)] border-[#3b82f6]/10 shadow-black/10"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#3b82f6]" : "text-[hsl(var(--l-fg-low))]"}`} />
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${isActive ? "text-[#3b82f6]" : "text-[hsl(var(--l-fg))]"}`}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--l-fg-low))] leading-tight">{s.desc}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dot */}
                <div className="relative z-10">
                  <motion.div
                    animate={{
                      scale: isActive ? 1 : isHovered ? 0.85 : 0.6,
                      backgroundColor: isActive
                        ? "#3b82f6"
                        : isPast
                          ? "rgba(212,175,55,0.5)"
                          : "rgba(212,175,55,0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="h-4 w-4 rounded-full border-2"
                    style={{
                      borderColor: isActive ? "#3b82f6" : isPast ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.15)",
                    }}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[#3b82f6]/30"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Section counter */}
          <div className="mt-3 mr-0 text-[10px] text-[hsl(var(--l-fg-low))] tabular-nums text-center w-4">
            {active + 1}/{sections.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
