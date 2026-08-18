"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { CameraIcon, CrownIcon, XIcon } from "./icons";
import { resizeImage } from "@/lib/image";

export default function MusWinnerModal({
  teamA,
  teamB,
  saving,
  onClose,
  onConfirm,
}: {
  teamA: Player[];
  teamB: Player[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (winnerTeam: 0 | 1, image: string | null) => void;
}) {
  const [winnerTeam, setWinnerTeam] = useState<0 | 1 | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const teams: [Player[], Player[]] = [teamA, teamB];

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setProcessingImage(true);
    try {
      const dataUrl = await resizeImage(file);
      setImage(dataUrl);
    } catch {
      // si falla el procesado, simplemente no se adjunta imagen
    } finally {
      setProcessingImage(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="ornate rounded-sm bg-card max-w-sm w-full p-5 sm:p-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <CrownIcon className="w-5 h-5 text-gold" />
              ¿Qué pareja ganó?
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded opacity-60 hover:opacity-100"
              aria-label="Cerrar"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5 mb-5">
            {teams.map((team, idx) => {
              const isWinner = winnerTeam === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setWinnerTeam(idx as 0 | 1)}
                  className={`flex items-center gap-3 p-3 rounded border-2 transition-all text-left ${
                    isWinner
                      ? "bg-gold-bright border-gold-bright text-wine scale-[1.02] shadow-lg"
                      : "bg-parchment-deep border-border opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex -space-x-3 shrink-0">
                    {team.map((p) => (
                      <div
                        key={p.id}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold border-2"
                        style={{ backgroundColor: p.color, borderColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm truncate flex items-center gap-1.5">
                      {isWinner && <CrownIcon className="w-4 h-4 text-wine shrink-0" />}
                      {team.map((p) => p.name).join(" y ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Foto de la partida" className="w-full h-32 object-cover rounded border-2 border-border" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1"
                  aria-label="Quitar imagen"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={processingImage}
                className="w-full py-3 rounded border-2 border-dashed border-border text-sm font-display flex items-center justify-center gap-2 opacity-70 hover:opacity-100 hover:border-gold transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                {processingImage ? "Procesando…" : "Añadir foto (opcional)"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => winnerTeam !== null && onConfirm(winnerTeam, image)}
            disabled={winnerTeam === null || saving}
            className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? "Sellando…" : "Confirmar Victoria"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
