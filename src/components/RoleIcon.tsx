"use client";

import Image from "next/image";
import type { Lane } from "@/data/team";

const LANE_ICON_PATHS: Record<Lane, string> = {
  TOP: "/lanes/top.png",
  JUNGLE: "/lanes/jungle.png",
  MID: "/lanes/mid.png",
  BOT: "/lanes/bot.png",
  SUPPORT: "/lanes/support.png",
};

const LANE_ALT: Record<Lane, string> = {
  TOP: "Rota do Topo (Top)",
  JUNGLE: "Selva (Jungle)",
  MID: "Rota do Meio (Mid)",
  BOT: "Atirador (Bot)",
  SUPPORT: "Suporte",
};

export function RoleIcon({
  lane,
  className = "h-8 w-8",
}: {
  lane: Lane;
  className?: string;
}) {
  const src = LANE_ICON_PATHS[lane] ?? LANE_ICON_PATHS.TOP;
  const alt = LANE_ALT[lane] ?? "Rota";

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={36}
        height={36}
        className="h-full w-full object-contain filter drop-shadow-[0_0_8px_rgba(200,155,60,0.4)]"
      />
    </div>
  );
}