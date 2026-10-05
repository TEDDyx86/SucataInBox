import type { SocialPlatform } from "./team";

export type PlatformInfo = {
  bg: string;
  hoverBg: string;
  text: string;
  border: string;
  label: string;
};

export const PLATFORM_CONFIG: Record<SocialPlatform, PlatformInfo> = {
  kick: {
    bg: "bg-[#53FC18]/10",
    hoverBg: "hover:bg-[#53FC18]/20 hover:border-[#53FC18]/60",
    text: "text-[#53FC18]",
    border: "border-[#53FC18]/30",
    label: "Kick",
  },
  twitch: {
    bg: "bg-[#9146FF]/10",
    hoverBg: "hover:bg-[#9146FF]/20 hover:border-[#9146FF]/60",
    text: "text-[#A970FF]",
    border: "border-[#9146FF]/30",
    label: "Twitch",
  },
  youtube: {
    bg: "bg-[#FF0000]/10",
    hoverBg: "hover:bg-[#FF0000]/20 hover:border-[#FF0000]/60",
    text: "text-[#FF4D4D]",
    border: "border-[#FF0000]/30",
    label: "YouTube",
  },
  instagram: {
    bg: "bg-[#E1306C]/10",
    hoverBg: "hover:bg-[#E1306C]/20 hover:border-[#E1306C]/60",
    text: "text-[#E879A8]",
    border: "border-[#E1306C]/30",
    label: "Instagram",
  },
  tiktok: {
    bg: "bg-[#25F4EE]/10",
    hoverBg: "hover:bg-[#25F4EE]/20 hover:border-[#25F4EE]/60",
    text: "text-[#5FF6F1]",
    border: "border-[#25F4EE]/30",
    label: "TikTok",
  },
  x: {
    bg: "bg-white/5",
    hoverBg: "hover:bg-white/10 hover:border-white/30",
    text: "text-zinc-200",
    border: "border-white/15",
    label: "X (Twitter)",
  },
  discord: {
    bg: "bg-[#5865F2]/10",
    hoverBg: "hover:bg-[#5865F2]/20 hover:border-[#5865F2]/60",
    text: "text-[#7289DA]",
    border: "border-[#5865F2]/30",
    label: "Discord",
  },
};