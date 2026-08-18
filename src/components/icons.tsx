export function CrestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4 L42 10 V22 C42 33 34.5 41 24 44 C13.5 41 6 33 6 22 V10 Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M24 4 L42 10 V22 C42 33 34.5 41 24 44 C13.5 41 6 33 6 22 V10 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 12 L30 24 L24 36 L18 24 Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.8 9.5H4.8L3 8z"
        fill="currentColor"
      />
      <rect x="4.5" y="18.3" width="15" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.5l7.5 3v5.2c0 5-3.2 8.9-7.5 10.8-4.3-1.9-7.5-5.8-7.5-10.8V5.5l7.5-3z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l6-6M14.5 3.5l6 6-2.5 2.5-6-6zM9 15l1.5-1.5M3 3l6 6-2.5 2.5-6-6zM21 21l-6-6" />
      <path d="M18.5 9.5L21 7M5.5 14.5L3 17" />
    </svg>
  );
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1-.4-1.8-1-2.5.6 2.6-1 3.5-1 3.5.3-2-1-3.2-2-5C13.5 4 12.8 3 12 2zM8.5 13a4.7 4.7 0 009.4 0c0-1.3-.5-2.2-1.4-3.1.2 2.3-1.5 3.1-2.6 3.1-1.5 0-2.4-1-2.6-2.4C10 11.4 8.5 12 8.5 13z" />
    </svg>
  );
}

export function ScrollIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H8" />
      <path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2" />
      <path d="M9 9h7M9 13h7M9 17h4" />
    </svg>
  );
}

export function LaurelIcon({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 100"
      className={className}
      fill="currentColor"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <ellipse
          key={i}
          cx={20 - (i % 2 === 0 ? 10 : 4)}
          cy={10 + i * 12}
          rx="9"
          ry="5"
          transform={`rotate(${-30 + i * 4} ${20 - (i % 2 === 0 ? 10 : 4)} ${10 + i * 12})`}
          opacity={0.55 + (i % 3) * 0.1}
        />
      ))}
      <path d="M20 5 C10 30, 10 70, 22 96" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}

export function UndoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h9a5 5 0 010 10h-2" />
      <path d="M8 5.5L4 10l4 4.5" />
    </svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4 3 4H5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.35-4.35" />
    </svg>
  );
}

export function CardsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2.5"
        y="7"
        width="12"
        height="16"
        rx="1.5"
        transform="rotate(-12 8.5 15)"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="9.5" y="5" width="12" height="16" rx="1.5" fill="currentColor" fillOpacity="0.85" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 9v6M12.5 12h6" stroke="var(--parchment)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
