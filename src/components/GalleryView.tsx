"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameId } from "@/lib/games";
import type { GamePhoto, PhotosResponse } from "@/lib/types";
import { CameraIcon, ChevronDownIcon, CrownIcon, GalleryIcon, XIcon } from "./icons";
import Skeleton from "./Skeleton";
import ShareGameButton from "./ShareGameButton";

const PAGE_SIZE = 12;

function formatShort(iso: string) {
  const date = new Date(iso + "Z");
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatLong(iso: string) {
  const date = new Date(iso + "Z");
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinNames(players: { name: string }[], game: GameId) {
  return players.map((p) => p.name).join(game === "mus" ? " y " : ", ");
}

export default function GalleryView({ game }: { game: GameId }) {
  const isMus = game === "mus";
  const [photos, setPhotos] = useState<GamePhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (offset: number) => {
      const res = await fetch(`/api/photos?game=${game}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error("fallo al cargar");
      return (await res.json()) as PhotosResponse;
    },
    [game]
  );

  // `game` viene fijado por la ruta (/galeria vs /mus/galeria), así que el
  // componente se monta de nuevo al cambiar de juego: basta con cargar la
  // primera tanda al montar, sin resetear estado a mano.
  useEffect(() => {
    let cancelled = false;
    fetchPage(0)
      .then((data) => {
        if (cancelled) return;
        setPhotos(data.photos);
        setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo abrir el archivo de estampas. Comprueba tu conexión.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchPage(photos.length);
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.photos.filter((p) => !seen.has(p.id))];
      });
      setTotal(data.total);
    } catch {
      setError("No se pudieron traer más estampas.");
    } finally {
      setLoadingMore(false);
    }
  }

  const open = openIndex !== null ? photos[openIndex] : undefined;

  const move = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        const next = current + delta;
        if (next < 0 || next >= photos.length) return current;
        return next;
      });
    },
    [photos.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [openIndex, move]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <GalleryIcon className="w-6 h-6 text-wine" />
          Galería
        </h2>
        {total > 0 && (
          <span className="text-xs font-display uppercase tracking-wide opacity-60">
            {total} {total === 1 ? "estampa" : "estampas"}
          </span>
        )}
      </div>
      <p className="text-sm opacity-70 italic mb-5">
        {isMus
          ? "Retratos de las noches de mus, con su pareja vencedora."
          : "Retratos de las batallas por la isla, con su vencedor."}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : error && photos.length === 0 ? (
        <p className="text-sm text-wine font-semibold">{error}</p>
      ) : photos.length === 0 ? (
        <div className="ornate rounded-sm bg-card px-6 py-10 text-center">
          <CameraIcon className="w-10 h-10 mx-auto text-gold mb-3 opacity-80" />
          <p className="font-display font-bold text-lg mb-1">Aún no hay estampas</p>
          <p className="text-sm opacity-70 italic">
            Adjunta una foto al registrar una partida y quedará colgada en esta galería para la posteridad.
          </p>
        </div>
      ) : (
        <>
          {error && <p className="text-xs text-wine font-semibold mb-2">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-sm border-2 border-border hover:border-gold transition-colors text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image}
                  alt={`Partida ganada por ${joinNames(photo.winners, game)}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                {!photo.counts_for_stats && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-display font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/60 text-gold-bright border border-gold-bright/40">
                    No cuenta
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2">
                  <p className="font-display font-bold text-[13px] sm:text-sm text-[#f6e9c8] truncate flex items-center gap-1 drop-shadow">
                    <CrownIcon className="w-3.5 h-3.5 text-gold-bright shrink-0" />
                    {joinNames(photo.winners, game)}
                  </p>
                  <p className="text-[10px] text-[#f2e4bd]/70 italic">{formatShort(photo.created_at)}</p>
                </div>
              </button>
            ))}
          </div>

          {photos.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 py-2.5 rounded border-2 border-dashed border-border text-sm font-display font-semibold uppercase tracking-wide opacity-70 hover:opacity-100 hover:border-gold transition-colors disabled:opacity-40"
            >
              {loadingMore ? "Desempolvando…" : "Ver más"}
            </button>
          )}
        </>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-6"
            onClick={() => setOpenIndex(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="ornate rounded-sm bg-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open.image}
                  alt={`Partida ganada por ${joinNames(open.winners, game)}`}
                  className="w-full max-h-[60vh] object-contain bg-black/40"
                />
                <button
                  type="button"
                  onClick={() => setOpenIndex(null)}
                  aria-label="Cerrar"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/85 hover:text-white hover:bg-black/80 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>

                {openIndex !== null && openIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    aria-label="Estampa anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/85 hover:bg-black/75 transition-colors"
                  >
                    <ChevronDownIcon className="w-5 h-5 rotate-90" />
                  </button>
                )}
                {openIndex !== null && openIndex < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => move(1)}
                    aria-label="Estampa siguiente"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/85 hover:bg-black/75 transition-colors"
                  >
                    <ChevronDownIcon className="w-5 h-5 -rotate-90" />
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-3 shrink-0">
                    {open.winners.map((p) => (
                      <div
                        key={p.id}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold border-2"
                        style={{ backgroundColor: p.color, borderColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg truncate flex items-center gap-1.5">
                      <CrownIcon className="w-4 h-4 text-gold shrink-0" />
                      {joinNames(open.winners, game)}
                    </p>
                    {open.rivals.length > 0 && (
                      <p className="text-xs opacity-60 truncate">venció a {joinNames(open.rivals, game)}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs opacity-55 italic mt-2">{formatLong(open.created_at)}</p>
                {!open.counts_for_stats && (
                  <span className="inline-block mt-2 text-[9px] font-display font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-gold/40 text-gold opacity-80">
                    No cuenta para el ranking
                  </span>
                )}

                <div className="mt-4 flex justify-center">
                  <ShareGameButton
                    game={game}
                    winners={open.winners}
                    rivals={open.rivals}
                    createdAt={open.created_at}
                    image={open.image}
                    countsForStats={open.counts_for_stats}
                    label="Compartir estampa"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
