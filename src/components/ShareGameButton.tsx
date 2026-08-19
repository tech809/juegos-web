"use client";

import { useState } from "react";
import type { GameId } from "@/lib/games";
import { ShareIcon } from "./icons";

export type SharePlayer = { name: string; color: string };

type Palette = {
  bg: string;
  bgDeep: string;
  ink: string;
  muted: string;
  gold: string;
  goldBright: string;
  wine: string;
  onDark: string;
};

/**
 * Colores fijos (no dependen del tema del navegador): la imagen exportada
 * debe verse siempre igual, la comparta quien la comparta.
 */
const PALETTES: Record<GameId, Palette> = {
  catan: {
    bg: "#f2e4bd",
    bgDeep: "#e3cf9c",
    ink: "#2b1d0e",
    muted: "#6b5535",
    gold: "#c99a2e",
    goldBright: "#e8c15c",
    wine: "#7a1f2b",
    onDark: "#f6e9c8",
  },
  mus: {
    bg: "#153a2c",
    bgDeep: "#0c2119",
    ink: "#eef1e4",
    muted: "#b9c9bb",
    gold: "#c9a227",
    goldBright: "#e8c34a",
    wine: "#9c1c24",
    onDark: "#f6e9c8",
  },
};

const GAME_LABEL: Record<GameId, string> = { catan: "Catán", mus: "Mus" };
const SERIF = 'Georgia, "Times New Roman", "Iowan Old Style", serif';
const APP_NAME = "Crónicas de la Mesa";
const APP_SITE = "juegos.proactivefuture.eu";

const CROWN_PATH = "M3 8l3.5 3L12 5l5.5 6L21 8l-1.8 9.5H4.8L3 8z";

const W = 1080;
const PHOTO_X = 80;
const PHOTO_W = W - PHOTO_X * 2;
const PHOTO_H = 760;
const PHOTO_Y = 236;

function formatLongDate(iso: string) {
  const date = new Date(iso + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Texto centrado con separación entre letras (canvas no tiene letter-spacing fiable). */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
) {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  const previous = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = previous;
}

/** Baja el cuerpo de letra hasta que el texto quepa; si no cabe, lo recorta. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = "bold"
) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${SERIF}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${SERIF}`;
  }
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 4) {
    out = out.slice(0, -2);
  }
  return out === text ? text : `${out}…`;
}

function drawCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const path = new Path2D(CROWN_PATH);
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawAvatars(
  ctx: CanvasRenderingContext2D,
  players: SharePlayer[],
  cx: number,
  cy: number,
  radius: number,
  palette: Palette
) {
  if (players.length === 0) return;
  const step = radius * 1.75;
  const startX = cx - (step * (players.length - 1)) / 2;
  players.forEach((p, i) => {
    const x = startX + step * i;
    ctx.beginPath();
    ctx.arc(x, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color || palette.wine;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.goldBright;
    ctx.stroke();

    ctx.fillStyle = palette.onDark;
    ctx.font = `bold ${Math.round(radius)}px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((p.name.charAt(0) || "?").toUpperCase(), x, cy + 2);
    ctx.textBaseline = "alphabetic";
  });
}

export type ShareGameButtonProps = {
  game: GameId;
  /** En catán, 1 jugador; en mus, los 2 de la pareja ganadora. */
  winners: SharePlayer[];
  rivals: SharePlayer[];
  createdAt: string;
  image?: string | null;
  countsForStats?: boolean;
  /**
   * solid   = botón principal (sello de vino), para el lightbox.
   * ghost   = botón pequeño con borde dorado sobre pergamino.
   * icon    = solo icono, sobre pergamino (junto al botón de deshacer).
   * overlay = solo icono, sobre una foto oscura.
   */
  variant?: "solid" | "ghost" | "icon" | "overlay";
  label?: string;
  className?: string;
};

export default function ShareGameButton({
  game,
  winners,
  rivals,
  createdAt,
  image,
  countsForStats = true,
  variant = "solid",
  label = "Compartir",
  className = "",
}: ShareGameButtonProps) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const joiner = game === "mus" ? " y " : ", ";
  const winnerNames = winners.map((p) => p.name).join(" y ");
  const rivalNames = rivals.map((p) => p.name).join(joiner);

  async function buildCard(): Promise<Blob | null> {
    const palette = PALETTES[game];
    const photo = image ? await loadImage(image) : null;

    const contentY = photo ? PHOTO_Y + PHOTO_H + 80 : 300;
    const badge = !countsForStats;
    const H = contentY + 360 + (badge ? 64 : 0) + 170;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fondo con viñeta
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    const vignette = ctx.createRadialGradient(W / 2, H * 0.35, W * 0.2, W / 2, H * 0.5, H * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, palette.bgDeep);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // Marco ornamentado
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 7;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = palette.goldBright;
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, W - 88, H - 88);

    ctx.textAlign = "center";

    // Cabecera
    ctx.fillStyle = palette.gold;
    ctx.font = `bold 34px ${SERIF}`;
    drawTracked(ctx, APP_NAME.toUpperCase(), W / 2, 118, 7);

    ctx.fillStyle = palette.wine;
    ctx.font = `italic 32px ${SERIF}`;
    ctx.fillText(`Partida de ${GAME_LABEL[game]}`, W / 2, 166);

    // Filete con rombo
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(200, 196);
    ctx.lineTo(W / 2 - 26, 196);
    ctx.moveTo(W / 2 + 26, 196);
    ctx.lineTo(W - 200, 196);
    ctx.stroke();
    ctx.save();
    ctx.translate(W / 2, 196);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = palette.gold;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();

    // Foto de la partida
    if (photo) {
      drawCover(ctx, photo, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 5;
      ctx.strokeRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
    }

    // Corona + avatares de los ganadores
    drawCrown(ctx, W / 2, contentY + 6, 70, palette.goldBright);
    drawAvatars(ctx, winners, W / 2, contentY + 118, 58, palette);

    // Nombre(s) del ganador
    ctx.fillStyle = palette.ink;
    const fitted = fitText(ctx, winnerNames, W - 200, 76, 34);
    ctx.fillText(fitted, W / 2, contentY + 236);

    // Rivales
    if (rivals.length > 0) {
      ctx.fillStyle = palette.muted;
      // fitText deja ya el ctx.font ajustado al tamaño que cabe
      const line = fitText(ctx, `venció a ${rivalNames}`, W - 220, 32, 22, "italic");
      ctx.fillText(line, W / 2, contentY + 288);
    }

    // Fecha
    ctx.fillStyle = palette.gold;
    ctx.font = `28px ${SERIF}`;
    ctx.fillText(formatLongDate(createdAt), W / 2, contentY + 340);

    // Sello de partida amistosa
    if (badge) {
      const text = "No cuenta para el ranking";
      ctx.font = `bold 24px ${SERIF}`;
      const boxW = ctx.measureText(text).width + 56;
      const boxX = W / 2 - boxW / 2;
      const boxY = contentY + 366;
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, 46);
      ctx.fillStyle = palette.gold;
      ctx.fillText(text, W / 2, boxY + 31);
    }

    // Pie: sello de la app
    const footY = H - 92;
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(240, footY - 46);
    ctx.lineTo(W - 240, footY - 46);
    ctx.stroke();

    ctx.fillStyle = palette.muted;
    ctx.font = `24px ${SERIF}`;
    drawTracked(ctx, APP_SITE.toUpperCase(), W / 2, footY, 4);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }

  async function share() {
    setBusy(true);
    setFeedback(null);
    try {
      const blob = await buildCard();
      if (!blob) {
        setFeedback("No se pudo crear la imagen");
        return;
      }
      const fileName = `partida-${game}-${createdAt.slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const shareData: ShareData = {
        files: [file],
        title: `${APP_NAME} · ${GAME_LABEL[game]}`,
        text: `${winnerNames} ${winners.length > 1 ? "ganaron" : "ganó"} la partida de ${GAME_LABEL[game]}`,
      };

      if (typeof navigator !== "undefined" && navigator.canShare?.(shareData) && navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          // el usuario ha cancelado el diálogo: no es un error que mostrar
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setFeedback("Imagen descargada");
    } catch {
      setFeedback("No se pudo compartir");
    } finally {
      setBusy(false);
    }
  }

  const iconOnly = variant === "icon" || variant === "overlay";
  const base = "inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50";
  const STYLES: Record<NonNullable<ShareGameButtonProps["variant"]>, string> = {
    solid: "seal-btn px-4 py-2.5 rounded bg-wine text-[#f6e9c8] text-sm hover:brightness-110 active:scale-[0.99]",
    ghost:
      "px-2.5 py-1.5 rounded border-2 border-gold/60 text-gold text-[11px] font-display font-semibold uppercase tracking-wide hover:bg-gold/10",
    icon: "p-1.5 rounded text-gold/80 hover:text-gold hover:bg-gold/10",
    overlay: "p-1.5 rounded bg-black/50 text-white/80 hover:text-gold-bright hover:bg-black/70",
  };

  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        title="Compartir el resultado"
        aria-label="Compartir el resultado"
        className={`${base} ${STYLES[variant]}`}
      >
        <ShareIcon className="w-4 h-4 shrink-0" />
        {!iconOnly && <span>{busy ? "Grabando…" : label}</span>}
      </button>
      {feedback && <span className="text-[10px] italic opacity-70">{feedback}</span>}
    </span>
  );
}
