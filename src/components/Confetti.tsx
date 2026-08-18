"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ["var(--gold-bright)", "var(--wine-bright)", "var(--forest)", "var(--gold)"];

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
};

export default function Confetti({ burstKey }: { burstKey: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!burstKey) return;
    const next: Particle[] = Array.from({ length: 46 }).map((_, i) => ({
      id: burstKey * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.7 + Math.random() * 1.1,
      rotate: 180 + Math.random() * 540,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 7,
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 3200);
    return () => clearTimeout(t);
  }, [burstKey]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: "-8vh", opacity: 1, rotate: 0 }}
            animate={{ y: "108vh", rotate: p.rotate, opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: 0,
              width: p.size,
              height: p.size,
              background: p.color,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              boxShadow: "0 0 4px rgba(0,0,0,0.25)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
