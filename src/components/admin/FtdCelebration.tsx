import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  shape: "circle" | "square" | "triangle";
}

const COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE",
  "#85C1E9", "#82E0AA", "#F8C471", "#F1948A", "#AED6F1",
];

const SHAPES: Particle["shape"][] = ["circle", "square", "triangle"];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 140,
    velocityY: -60 - Math.random() * 80,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  }));
}

function playFtdSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    // Soft single "ding" — gentle and non-intrusive
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch {}
}

interface Props {
  clientName: string;
  onComplete: () => void;
}

const FtdCelebration = ({ clientName, onComplete }: Props) => {
  const [particles] = useState(() => createParticles(80));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    playFtdSound();
    const timer = setTimeout(() => onCompleteRef.current(), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Confetti particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            left: `${p.x + p.velocityX}%`,
            top: `${p.y + p.velocityY + 160}%`,
            rotate: p.rotation + Math.random() * 720,
            opacity: [1, 1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== "triangle" ? p.color : "transparent",
            borderRadius: p.shape === "circle" ? "50%" : "0",
            borderLeft: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === "triangle" ? `${p.size}px solid ${p.color}` : undefined,
          }}
        />
      ))}

      {/* FTD banner */}
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 rounded-2xl px-10 py-6 shadow-2xl shadow-yellow-500/30 text-center">
          <motion.div
            className="text-5xl mb-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: 3, duration: 0.6 }}
          >
            🎉🥳🎊
          </motion.div>
          <h2 className="text-2xl font-bold text-black font-display tracking-tight">
            NEW FTD!
          </h2>
          <p className="text-black/80 font-semibold text-lg mt-1">
            {clientName}
          </p>
          <p className="text-black/60 text-sm mt-1">
            just made their first deposit!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FtdCelebration;
