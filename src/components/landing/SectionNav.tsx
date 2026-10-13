import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, TrendingUp, BarChart3, Users, Shield,
  Monitor, Cpu, PiggyBank, Globe, CreditCard,
} from "lucide-react";

const sections = [
  { id: "hero", label: "Start", icon: Rocket },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "rendite", label: "Rendite", icon: BarChart3 },
  { id: "erfolg", label: "Erfolge", icon: Users },
  { id: "vertrauen", label: "Vertrauen", icon: Shield },
  { id: "maerkte", label: "Märkte", icon: Monitor },
  { id: "technology", label: "KI-Trading", icon: Cpu },
  { id: "krypto", label: "Krypto", icon: PiggyBank },
  { id: "dach", label: "DACH", icon: Globe },
  { id: "zahlung", label: "Zahlung", icon: CreditCard },
];

export default function SectionNav() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    setVisible(scrollY > 400);

    // Find the currently visible section
    let current = 0;
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i].id);
      if (el && el.getBoundingClientRect().top <= 200) {
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

  const progress = ((active + 1) / sections.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[60]"
        >
          {/* Progress bar */}
          <div className="h-[3px] bg-[hsl(var(--l-bg-alt))]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#93c5fd]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Nav pills */}
          <div className="bg-[hsl(var(--l-bg))]/95 backdrop-blur-xl border-b border-[#3b82f6]/10 shadow-lg shadow-black/20">
            <div className="container mx-auto px-2">
              <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-2">
                {sections.map((s, i) => {
                  const isActive = i === active;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className={`
                        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        whitespace-nowrap transition-all duration-300 shrink-0
                        ${isActive
                          ? "text-white bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] shadow-md shadow-[#3b82f6]/20"
                          : i < active
                            ? "text-[#3b82f6]/70 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10"
                            : "text-[hsl(var(--l-fg-low))] hover:text-[hsl(var(--l-fg-mid))] hover:bg-[hsl(var(--l-card-bg)/0.1)]"
                        }
                      `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                  );
                })}

                {/* Progress text */}
                <span className="ml-auto text-[10px] text-[hsl(var(--l-fg-low))] whitespace-nowrap shrink-0 tabular-nums pl-3">
                  {active + 1}/{sections.length}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
