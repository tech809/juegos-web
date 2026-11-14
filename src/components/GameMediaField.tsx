"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CameraIcon, PencilIcon, XIcon } from "./icons";
import ImageEditModal from "./ImageEditModal";
import VideoTrimModal from "./VideoTrimModal";
import { EMPTY_MEDIA, MAX_VIDEO_SECONDS, isVideoFile, type MediaValue } from "@/lib/media";

/** Foto o vídeo de la partida: solo se admite un archivo. */
export default function GameMediaField({
  value,
  onChange,
  gameId,
}: {
  value: MediaValue;
  onChange: (value: MediaValue) => void;
  /** Id de la partida, solo al editar (para previsualizar su vídeo guardado). */
  gameId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingImage, setEditingImage] = useState<File | string | null>(null);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);

  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!value.video) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingUrl(null);
      return;
    }
    const u = URL.createObjectURL(value.video.blob);
    setPendingUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value.video]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (isVideoFile(file)) setTrimmingFile(file);
    else setEditingImage(file);
  }

  const videoSrc = pendingUrl ?? (value.existingVideo && gameId ? `/api/games/${gameId}/video` : null);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value.image ? (
        <div className="relative">
          {videoSrc ? (
            <video
              src={videoSrc}
              poster={value.image}
              controls
              playsInline
              preload="metadata"
              className="w-full h-44 object-cover rounded border-2 border-border bg-black"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.image} alt="Foto de la partida" className="w-full h-36 object-cover rounded border-2 border-border" />
          )}
          <div className="absolute top-1.5 right-1.5 flex gap-1.5">
            {!videoSrc && (
              <button
                type="button"
                onClick={() => setEditingImage(value.image)}
                className="bg-black/60 text-white rounded-full p-1"
                aria-label="Editar imagen"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(EMPTY_MEDIA)}
              className="bg-black/60 text-white rounded-full p-1"
              aria-label={videoSrc ? "Quitar vídeo" : "Quitar imagen"}
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded border-2 border-dashed border-border text-sm font-display flex items-center justify-center gap-2 opacity-70 hover:opacity-100 hover:border-gold transition-colors"
          >
            <CameraIcon className="w-4 h-4" />
            Añadir foto o vídeo (opcional)
          </button>
          <p className="text-[11px] opacity-50 italic mt-1.5">
            Un solo archivo por partida. Los vídeos, de hasta {MAX_VIDEO_SECONDS} s: si son más largos podrás recortarlos.
          </p>
        </div>
      )}

      <AnimatePresence>
        {editingImage && (
          <ImageEditModal
            source={editingImage}
            onCancel={() => setEditingImage(null)}
            onConfirm={(dataUrl) => {
              onChange({ image: dataUrl, video: null, existingVideo: false });
              setEditingImage(null);
            }}
          />
        )}
        {trimmingFile && (
          <VideoTrimModal
            file={trimmingFile}
            onCancel={() => setTrimmingFile(null)}
            onConfirm={({ blob, mime, poster }) => {
              onChange({ image: poster, video: { blob, mime }, existingVideo: false });
              setTrimmingFile(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
