"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckIcon, XIcon } from "./icons";
import { MAX_VIDEO_SECONDS, type PendingVideo } from "@/lib/media";

const MIN_SECONDS = 1;
const MAX_WIDTH = 640;
const MAX_BYTES = 3_900_000;

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.001) return resolve();
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}

type Encoded = PendingVideo & { poster: string };

/** Reproduce el tramo elegido sobre un canvas y lo regraba a baja resolución y bitrate. */
async function encode(
  video: HTMLVideoElement,
  start: number,
  end: number,
  onProgress: (p: number) => void,
  cancel: { current: boolean }
): Promise<Encoded> {
  const mime = pickMime();
  if (!mime) throw new Error("Este navegador no puede preparar vídeos. Prueba con Chrome o Safari actualizados.");

  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
  canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar el vídeo");

  await seek(video, start);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const poster = canvas.toDataURL("image/jpeg", 0.8);

  const stream = canvas.captureStream(24);
  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    if (audioCtx.state === "running") {
      // el audio se desvía al grabador: mientras se prepara, el vídeo no suena por los altavoces
      video.muted = false;
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } else {
      await audioCtx.close();
      audioCtx = null;
    }
  } catch {
    audioCtx = null;
  }

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 650_000, audioBitsPerSecond: 64_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  // Los temporizadores y los eventos del vídeo siguen funcionando con la pestaña en segundo plano
  // (requestAnimationFrame no), así que la grabación nunca se queda colgada.
  let finished = false;
  let timer = 0;
  let watchdog = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearInterval(timer);
    window.clearTimeout(watchdog);
    video.removeEventListener("timeupdate", checkEnd);
    video.removeEventListener("ended", finish);
    video.pause();
    if (recorder.state !== "inactive") recorder.stop();
  };
  function checkEnd() {
    if (video.currentTime >= end || video.ended || cancel.current) finish();
  }
  const draw = () => {
    if (finished) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onProgress(Math.min(1, Math.max(0, (video.currentTime - start) / (end - start))));
    checkEnd();
  };

  recorder.start(250);
  try {
    await video.play();
  } catch {
    finish();
    throw new Error("El navegador no dejó reproducir el vídeo para prepararlo");
  }
  video.addEventListener("timeupdate", checkEnd);
  video.addEventListener("ended", finish);
  timer = window.setInterval(draw, 1000 / 24);
  watchdog = window.setTimeout(finish, (end - start) * 1000 + 4000);
  await stopped;
  if (audioCtx) audioCtx.close().catch(() => {});

  if (cancel.current) throw new Error("cancelado");
  const blob = new Blob(chunks, { type: recorder.mimeType || mime });
  if (blob.size === 0) throw new Error("No se pudo preparar el vídeo");
  if (blob.size > MAX_BYTES) throw new Error("El vídeo ha quedado demasiado pesado. Elige un tramo más corto.");
  return { blob, mime: blob.type, poster };
}

const fmt = (s: number) => `${s.toFixed(1).replace(".", ",")} s`;

export default function VideoTrimModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (result: Encoded) => void;
}) {
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cancelRef = useRef(false);

  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const encoding = progress !== null;
  const length = end - start;

  function onMetadata() {
    const v = videoRef.current;
    if (!v) return;
    if (!isFinite(v.duration) || v.duration <= 0 || !v.videoWidth) {
      setError("No se pudo leer este vídeo. Prueba con otro archivo.");
      return;
    }
    setDuration(v.duration);
    setEnd(Math.min(v.duration, MAX_VIDEO_SECONDS));
  }

  function changeStart(value: number) {
    let s = Math.min(value, duration - MIN_SECONDS);
    s = Math.max(0, s);
    let e = end;
    if (e - s > MAX_VIDEO_SECONDS) e = s + MAX_VIDEO_SECONDS;
    if (e < s + MIN_SECONDS) e = Math.min(duration, s + MIN_SECONDS);
    setStart(s);
    setEnd(e);
    if (videoRef.current) videoRef.current.currentTime = s;
  }

  function changeEnd(value: number) {
    let e = Math.max(value, MIN_SECONDS);
    e = Math.min(e, duration);
    let s = start;
    if (e - s > MAX_VIDEO_SECONDS) s = e - MAX_VIDEO_SECONDS;
    if (e < s + MIN_SECONDS) s = Math.max(0, e - MIN_SECONDS);
    setStart(s);
    setEnd(e);
    if (videoRef.current) videoRef.current.currentTime = e;
  }

  async function confirm() {
    const v = videoRef.current;
    if (!v || encoding) return;
    setError(null);
    cancelRef.current = false;
    v.pause();
    setProgress(0);
    try {
      onConfirm(await encode(v, start, end, setProgress, cancelRef));
    } catch (e) {
      if (!(e instanceof Error && e.message === "cancelado")) {
        setError(e instanceof Error ? e.message : "No se pudo preparar el vídeo");
      }
      setProgress(null);
    }
  }

  function cancel() {
    cancelRef.current = true;
    onCancel();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={encoding ? undefined : cancel}
    >
      <div onClick={(e) => e.stopPropagation()} className="ornate rounded-sm bg-card w-full max-w-md p-4 sm:p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold">Ajustar vídeo</h3>
          <button type="button" onClick={cancel} className="p-1 rounded opacity-60 hover:opacity-100" aria-label="Cancelar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {url && (
          <video
            ref={videoRef}
            src={url}
            playsInline
            preload="auto"
            controls={!encoding}
            onLoadedMetadata={onMetadata}
            onError={() => setError("Este navegador no puede abrir ese vídeo. Prueba con otro archivo o formato.")}
            className="w-full max-h-[40vh] rounded border-2 border-border bg-black mb-3"
          />
        )}

        {duration > 0 && (
          <div className="space-y-3 mb-3">
            <label className="block text-xs font-display font-semibold uppercase tracking-wide opacity-70">
              Inicio · {fmt(start)}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={start}
                disabled={encoding}
                onChange={(e) => changeStart(Number(e.target.value))}
                className="w-full accent-[var(--gold)]"
              />
            </label>
            <label className="block text-xs font-display font-semibold uppercase tracking-wide opacity-70">
              Final · {fmt(end)}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={end}
                disabled={encoding}
                onChange={(e) => changeEnd(Number(e.target.value))}
                className="w-full accent-[var(--gold)]"
              />
            </label>
            <p className="text-xs italic opacity-70">
              Tramo elegido: <strong className="not-italic">{fmt(length)}</strong> (máximo {MAX_VIDEO_SECONDS} s).
              {duration > MAX_VIDEO_SECONDS && " Tu vídeo es más largo: ajusta el tramo que quieres conservar."}
            </p>
          </div>
        )}

        {encoding && (
          <div className="mb-3">
            <div className="h-2 rounded bg-border overflow-hidden">
              <div className="h-full bg-gold-bright transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </div>
            <p className="text-xs italic opacity-70 mt-1">
              Preparando el vídeo… tarda lo que dura el tramo. No cierres esta ventana.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-wine font-semibold mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancel}
            className="flex-1 py-2.5 rounded border-2 border-border text-sm font-display font-semibold hover:border-gold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={encoding || duration === 0}
            className="flex-1 seal-btn py-2.5 rounded bg-wine text-[#f6e9c8] text-sm font-display font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" /> Usar vídeo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
