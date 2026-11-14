/** Distintivo ▶ para marcar en una miniatura que la partida tiene vídeo. */
export default function PlayBadge({ small = false }: { small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-label="Vídeo">
      <span
        className={`flex items-center justify-center rounded-full bg-black/55 text-white/90 border border-white/40 ${
          small ? "h-8 w-8" : "h-12 w-12"
        }`}
      >
        <svg viewBox="0 0 24 24" className={small ? "h-4 w-4" : "h-6 w-6"} fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </span>
  );
}
