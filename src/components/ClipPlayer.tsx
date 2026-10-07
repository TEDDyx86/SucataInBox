"use client";

import { useEffect, useRef, useState } from "react";
import { chooseHlsPlaybackStrategy } from "@/lib/hls-playback-strategy";
import { TwitchClipEmbed } from "@/components/TwitchClipEmbed";

export function ClipPlayer({
  id,
  sourceClipId,
  sourcePlatform,
  title,
}: {
  id: string;
  sourceClipId: string;
  sourcePlatform: "kick" | "twitch";
  title: string;
}) {
  return sourcePlatform === "twitch"
    ? <TwitchClipEmbed clipId={sourceClipId} title={title} />
    : <KickClipPlayer clipId={id} title={title} />;
}

function KickClipPlayer({ clipId, title }: { clipId: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const media = video;
    let disposed = false;
    let destroy: (() => void) | undefined;

    async function attachPlayback() {
      try {
        const playlist = `/api/clips/${clipId}/playlist`;
        const { default: Hls } = await import("hls.js");
        if (disposed) return;
        const strategy = chooseHlsPlaybackStrategy(
          media.canPlayType("application/vnd.apple.mpegurl"),
          Hls.isSupported(),
        );
        if (strategy === "native") {
          media.src = playlist;
          return;
        }
        if (strategy === "unsupported") {
          setError(true);
          return;
        }

        const player = new Hls({ enableWorker: true, lowLatencyMode: false });
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError(true);
        });
        player.loadSource(playlist);
        player.attachMedia(media);
        destroy = () => player.destroy();
      } catch {
        setError(true);
      }
    }

    void attachPlayback();
    return () => {
      disposed = true;
      destroy?.();
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  }, [clipId]);

  return (
    <div className="relative aspect-video bg-black">
      <video
        ref={videoRef}
        poster={`/api/clips/${clipId}/thumbnail`}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        onError={() => setError(true)}
        className="h-full w-full"
      />
      {error && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
          <p className="max-w-md text-sm text-white">
            Não foi possível carregar este clipe agora. Tente novamente mais tarde.
          </p>
        </div>
      )}
    </div>
  );
}
