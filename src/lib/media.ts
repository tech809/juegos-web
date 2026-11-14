export const MAX_VIDEO_SECONDS = 20;

export type PendingVideo = { blob: Blob; mime: string };

/** Un único archivo por partida: o una foto, o un vídeo (con su miniatura en `image`). */
export type MediaValue = {
  image: string | null;
  video: PendingVideo | null;
  existingVideo: boolean;
};

export const EMPTY_MEDIA: MediaValue = { image: null, video: null, existingVideo: false };

async function errorFrom(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error ?? fallback);
}

export async function uploadVideo(gameId: string, video: PendingVideo) {
  const res = await fetch(`/api/games/${gameId}/video`, {
    method: "PUT",
    headers: { "Content-Type": video.mime.split(";")[0] },
    body: video.blob,
  });
  if (!res.ok) throw await errorFrom(res, "No se pudo subir el vídeo");
}

export async function removeVideo(gameId: string) {
  const res = await fetch(`/api/games/${gameId}/video`, { method: "DELETE" });
  if (!res.ok) throw await errorFrom(res, "No se pudo quitar el vídeo");
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
}
