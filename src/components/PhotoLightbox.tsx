"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameId } from "@/lib/games";
import { DownloadIcon, XIcon } from "./icons";

type PhotoLightboxProps = {
  image: string | null;
  game: GameId;
  gameId: string;
  createdAt: string;
  alt: string;
  onClose: () => void;
};

export default function PhotoLightbox({ image, game, gameId, createdAt, alt, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    if (!image) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [image, onClose]);

  const filename = `${game}-${createdAt.slice(0, 10)}-${gameId}.jpg`;

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de la foto de la partida"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative flex-1 min-h-0 flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={alt} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/85 transition-colors hover:bg-black/80 hover:text-white"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="flex shrink-0 justify-center bg-card p-3 sm:p-4" onClick={(event) => event.stopPropagation()}>
            <a
              href={image}
              download={filename}
              className="inline-flex items-center gap-2 rounded border border-gold/50 px-4 py-2 text-xs font-display font-semibold uppercase tracking-wide text-gold transition-colors hover:bg-gold/10"
            >
              <DownloadIcon className="h-4 w-4" />
              Descargar foto
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
