"use client";

import { useEffect, useRef } from "react";

export function TwitchClipEmbed({ clipId, title }: { clipId: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const url = new URL("https://clips.twitch.tv/embed");
    url.searchParams.set("clip", clipId);
    url.searchParams.set("parent", window.location.hostname);
    url.searchParams.set("autoplay", "false");
    url.searchParams.set("preload", "metadata");
    iframe.src = url.toString();
  }, [clipId]);

  return (
    <div className="flex min-h-[300px] items-center justify-center bg-black">
      <iframe
        ref={iframeRef}
        title={`Clipe da Twitch: ${title}`}
        allowFullScreen
        allow="autoplay; fullscreen"
        className="aspect-video h-auto min-h-[300px] w-full border-0"
      />
    </div>
  );
}
