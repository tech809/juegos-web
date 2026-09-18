"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckIcon, FlipIcon, UndoIcon, XIcon } from "./icons";

type Rect = { x: number; y: number; w: number; h: number };

/** Gira una imagen en un <canvas> y devuelve su dataURL ya rotada. */
function rotateImage(src: string, quarterTurns: 1 | 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("No se pudo girar la imagen"));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo girar la imagen"));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((quarterTurns * 90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = src;
  });
}

/** Voltea una imagen horizontalmente (espejo) y devuelve su dataURL. */
function flipImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("No se pudo voltear la imagen"));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo voltear la imagen"));
        return;
      }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = src;
  });
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export default function ImageEditModal({
  source,
  onCancel,
  onConfirm,
}: {
  /** Un fichero recién elegido, o el dataURL de una foto ya subida para re-editarla. */
  source: File | string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof source === "string") {
      setSrcUrl(source);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSrcUrl(reader.result as string);
    reader.readAsDataURL(source);
  }, [source]);

  async function handleRotate(dir: 1 | 3) {
    if (!srcUrl || busy) return;
    setBusy(true);
    try {
      const rotated = await rotateImage(srcUrl, dir);
      setSrcUrl(rotated);
      setCropRect(null);
    } catch {
      // si falla el giro, se queda la imagen tal cual estaba
    } finally {
      setBusy(false);
    }
  }

  async function handleFlip() {
    if (!srcUrl || busy) return;
    setBusy(true);
    try {
      const flipped = await flipImage(srcUrl);
      setSrcUrl(flipped);
      setCropRect(null);
    } catch {
      // si falla el volteo, se queda la imagen tal cual estaba
    } finally {
      setBusy(false);
    }
  }

  function pointFromEvent(e: React.PointerEvent) {
    const bounds = imgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: clamp01((e.clientX - bounds.left) / bounds.width),
      y: clamp01((e.clientY - bounds.top) / bounds.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    dragStart.current = p;
    setCropRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const p = pointFromEvent(e);
    const start = dragStart.current;
    setCropRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }

  function handlePointerUp() {
    dragStart.current = null;
    setCropRect((r) => (r && r.w > 0.03 && r.h > 0.03 ? r : null));
  }

  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const rect = cropRect ?? { x: 0, y: 0, w: 1, h: 1 };
    const sx = rect.x * img.naturalWidth;
    const sy = rect.y * img.naturalHeight;
    const sw = rect.w * img.naturalWidth;
    const sh = rect.h * img.naturalHeight;
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / sw);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL("image/jpeg", 0.8));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ornate rounded-sm bg-card w-full max-w-md p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold">Ajustar foto</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded opacity-60 hover:opacity-100" aria-label="Cancelar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {srcUrl ? (
          <>
            <div className="relative select-none touch-none mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={srcUrl}
                alt="Foto a editar"
                draggable={false}
                className="w-full h-auto rounded border-2 border-border block"
              />
              <div
                className="absolute inset-0 cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {cropRect && (
                  <div
                    className="absolute border-2 border-gold-bright bg-gold-bright/15 pointer-events-none"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.w * 100}%`,
                      height: `${cropRect.h * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            <p className="text-[11px] opacity-50 italic mb-3">
              Arrastra sobre la foto para recortarla. Si no recortas, se usa entera.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleRotate(3)}
                disabled={busy}
                className="px-3 py-1.5 rounded text-sm font-display font-semibold border-2 border-border hover:border-gold flex items-center gap-1.5 disabled:opacity-50"
              >
                <UndoIcon className="w-4 h-4" /> Girar izq.
              </button>
              <button
                type="button"
                onClick={() => handleRotate(1)}
                disabled={busy}
                className="px-3 py-1.5 rounded text-sm font-display font-semibold border-2 border-border hover:border-gold flex items-center gap-1.5 disabled:opacity-50"
              >
                <UndoIcon className="w-4 h-4 scale-x-[-1]" /> Girar der.
              </button>
              <button
                type="button"
                onClick={handleFlip}
                disabled={busy}
                className="px-3 py-1.5 rounded text-sm font-display font-semibold border-2 border-border hover:border-gold flex items-center gap-1.5 disabled:opacity-50"
              >
                <FlipIcon className="w-4 h-4" /> Voltear
              </button>
              {cropRect && (
                <button
                  type="button"
                  onClick={() => setCropRect(null)}
                  className="px-3 py-1.5 rounded text-sm font-display font-semibold border-2 border-dashed border-border opacity-70 hover:opacity-100"
                >
                  Quitar recorte
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded border-2 border-border text-sm font-display font-semibold hover:border-gold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="flex-1 seal-btn py-2.5 rounded bg-wine text-[#f6e9c8] text-sm font-display font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" /> Usar foto
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm opacity-60 italic py-8 text-center">Cargando imagen…</p>
        )}
      </div>
    </motion.div>
  );
}
