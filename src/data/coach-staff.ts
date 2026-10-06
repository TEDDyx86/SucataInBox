import type { Social } from "./team";

export type CoachStaffRole = "Presidente" | "Coach";

export type CoachStaffMember = {
  id: string;
  name: string;
  role: CoachStaffRole;
  /** Perfil Kick: além de ser um link social, também é o identificador consultado na API. */
  kickUrl: string;
  /** Redes confirmadas publicamente; Kick é derivado de `kickUrl`. */
  socials: Social[];
};

export type CoachStaffLive = {
  isLive: boolean;
  avatarUrl?: string;
};

export type CoachStaffLiveStatus = Record<string, CoachStaffLive>;

/**
 * Presidentes e coaches monitorados na página COACH STAFF.
 *
 * As redes de quatro perfis vieram das próprias informações públicas das
 * páginas Kick. Soraka da Isa tem somente o Kick confirmado; o X é o link
 * informado diretamente pelo usuário. Não incluí contas inferidas por nomes
 * semelhantes.
 */
export const COACH_STAFF: CoachStaffMember[] = [
  {
    id: "jukes",
    name: "Jukes",
    role: "Presidente",
    kickUrl: "https://kick.com/jukes",
    socials: [
      { platform: "instagram", url: "https://www.instagram.com/jukeslol/", label: "Instagram" },
      { platform: "x", url: "https://x.com/jukeslol", label: "X" },
      { platform: "youtube", url: "https://www.youtube.com/@jukeslol", label: "YouTube" },
    ],
  },
  {
    id: "dynquedo",
    name: "Dynquedo",
    role: "Presidente",
    kickUrl: "https://kick.com/dynquedo1",
    socials: [
      { platform: "instagram", url: "https://www.instagram.com/dynqued0/", label: "Instagram" },
      { platform: "x", url: "https://x.com/dynquedo1", label: "X" },
      { platform: "youtube", url: "https://www.youtube.com/@dyNquedo1", label: "YouTube" },
    ],
  },
  {
    id: "samkz",
    name: "SamkZ",
    role: "Coach",
    kickUrl: "https://kick.com/samkz",
    socials: [
      { platform: "instagram", url: "https://www.instagram.com/samkzlol/", label: "Instagram" },
      { platform: "x", url: "https://x.com/samkzlol", label: "X" },
      { platform: "youtube", url: "https://www.youtube.com/@Samkzlol", label: "YouTube" },
      { platform: "tiktok", url: "https://www.tiktok.com/@samkz11", label: "TikTok" },
    ],
  },
  {
    id: "caiodurodo",
    name: "Caiodurodo",
    role: "Coach",
    kickUrl: "https://kick.com/caiodurodo",
    socials: [
      { platform: "instagram", url: "https://www.instagram.com/caiodurodo/", label: "Instagram" },
      { platform: "x", url: "https://x.com/caiodurodo", label: "X" },
      { platform: "youtube", url: "https://www.youtube.com/@caiodurodo", label: "YouTube" },
      { platform: "tiktok", url: "https://www.tiktok.com/@caiodurodo22", label: "TikTok" },
    ],
  },
  {
    id: "soraka-da-isa",
    name: "Soraka da Isa",
    role: "Coach",
    kickUrl: "https://kick.com/soraka-da-isa",
    socials: [
      { platform: "x", url: "https://x.com/EsquisIsa", label: "X" },
    ],
  },
];

/** Extrai o login que a API da Kick espera do URL público do canal. */
export function coachStaffKickHandle(member: CoachStaffMember): string {
  return new URL(member.kickUrl).pathname.split("/").filter(Boolean)[0];
}

/** Redes a exibir nos cards, sempre com Kick primeiro como plataforma ao vivo. */
export function coachStaffSocials(member: CoachStaffMember): Social[] {
  const kick: Social = {
    platform: "kick",
    url: member.kickUrl,
    label: "Kick",
  };
  return [kick, ...member.socials];
}

/** Conta pessoas do Coach Staff no ar; cada perfil aparece uma única vez. */
export function coachStaffLiveCount(status: CoachStaffLiveStatus): number {
  return Object.values(status).filter((member) => member.isLive).length;
}
