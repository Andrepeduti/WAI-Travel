import { supabase } from "@/integrations/supabase/client";

export interface ExtractedPlaceAI {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  location: string;
  country?: string;
}

/**
 * Extract frames from a video File at evenly distributed timestamps.
 * Returns an array of base64 JPEG data URLs.
 */
export async function extractVideoFrames(file: File, count = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.crossOrigin = "anonymous";

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener("loadedmetadata", async () => {
      try {
        const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        if (!duration) {
          cleanup();
          return resolve([]);
        }

        // Pick timestamps spread across the video (skip first & last 5%)
        const start = duration * 0.05;
        const end = duration * 0.95;
        const timestamps = Array.from({ length: count }, (_, i) =>
          start + ((end - start) * i) / Math.max(1, count - 1)
        );

        const frames: string[] = [];
        // Aim for ~640px wide for a reasonable upload size
        const targetW = 640;

        for (const t of timestamps) {
          const dataUrl = await captureFrameAt(video, t, targetW);
          if (dataUrl) frames.push(dataUrl);
        }

        cleanup();
        resolve(frames);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to load video for frame extraction"));
    });
  });
}

function captureFrameAt(video: HTMLVideoElement, time: number, targetWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        const ratio = video.videoHeight / video.videoWidth || 9 / 16;
        const w = Math.min(targetWidth, video.videoWidth || targetWidth);
        const h = Math.round(w * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(video, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(null);
      }
    };
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = Math.max(0, Math.min(time, (video.duration || 0) - 0.1));
    } catch {
      video.removeEventListener("seeked", onSeeked);
      resolve(null);
    }
  });
}

/** Call the AI extraction edge function. Throws on error with a friendly message. */
export async function extractPlacesFromLink(url: string): Promise<ExtractedPlaceAI[]> {
  const { data, error } = await supabase.functions.invoke("extract-video-places", {
    body: { mode: "link", url },
  });
  if (error) throw new Error(error.message || "Falha ao analisar o vídeo.");
  if (data?.error) throw new Error(data.error);
  return (data?.places ?? []) as ExtractedPlaceAI[];
}

export async function extractPlacesFromFile(file: File, hint?: string): Promise<ExtractedPlaceAI[]> {
  const frames = await extractVideoFrames(file, 12);
  if (frames.length === 0) throw new Error("Não foi possível ler frames deste vídeo.");
  const { data, error } = await supabase.functions.invoke("extract-video-places", {
    body: { mode: "frames", frames, hint },
  });
  if (error) throw new Error(error.message || "Falha ao analisar o vídeo.");
  if (data?.error) throw new Error(data.error);
  return (data?.places ?? []) as ExtractedPlaceAI[];
}
