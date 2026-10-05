export type Lane = "TOP" | "JUNGLE" | "MID" | "BOT" | "SUPPORT";

export type PlayerRole = "Titular" | "Capitão" | "Reserva" | "Coach";

export type SocialPlatform =
  | "twitch"
  | "kick"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "discord";

export type Social = {
  platform: SocialPlatform;
  /** URL completa do perfil. */
  url: string;
  /** Texto exibido no botão. */
  label: string;
};

export type Player = {
  /** Identificador único do jogador. */
  id: string;
  /** Nome de exibição / Nickname. */
  name: string;
  /** Posição / Rota no jogo. */
  lane: Lane;
  /**
   * Caminho da foto do jogador dentro de `public` (ex.: "/players/aninha.jpg").
   * Ausente = o card mostra o placeholder com o ícone da rota.
   */
  photo?: string;
  /** Função no time (Capitão, Coach, etc.). */
  teamRole?: PlayerRole;
  /** Campeões favoritos / assinaturas. */
  favoriteChampions?: string[];
  /** Dados para consulta na Riot API e op.gg. */
  riotId: {
    gameName: string;
    tagLine: string;
  };
  /**
   * Link do perfil no OP.GG. Ausente = derivado do Riot ID (ver `opggUrl`).
   * Existe porque o OP.GG usa o nome com espaço literal na URL.
   */
  opgg?: string;
  /**
   * Slug do canal na Kick. Ausente = o jogador não tem canal,
   * e por isso não exibirá badge de live na Kick.
   */
  kick?: string;
  /** Redes sociais do jogador. */
  socials: Social[];
};

/**
 * Elenco Oficial da equipe SUCATA IN BOX na Copa Brasil Low Elo (CBLOW).
 */
export const TEAM: Player[] = [
  {
    id: "aninha-gameplay",
    photo: "/players/aninha-gameplay.webp",
    name: "ANINHA GAMEPLAY",
    lane: "TOP",
    favoriteChampions: ["Gwen", "Mordekaiser", "Ornn"],
    riotId: { gameName: "Aninha gameplay", tagLine: "2108" },
    opgg: "https://op.gg/pt/lol/summoners/br/Aninha%20gameplay-2108",
    socials: [
      {
        platform: "instagram",
        url: "https://www.instagram.com/aninha_gameplay_trynda/",
        label: "Instagram",
      },
      {
        platform: "twitch",
        url: "https://www.twitch.tv/aninha_gameplay_trynda",
        label: "Twitch",
      },
    ],
  },
  {
    id: "yasuocadeirante",
    photo: "/players/yasuocadeirante.webp",
    name: "YASUOCADEIRANTE",
    lane: "TOP",
    favoriteChampions: ["Yasuo", "Yone", "Jax"],
    riotId: { gameName: "yasuocadeirante", tagLine: "mono" },
    opgg: "https://op.gg/pt/lol/summoners/br/yasuocadeirante-mono",
    kick: "vinnycaffe",
    socials: [
      {
        platform: "tiktok",
        url: "https://tiktok.com/@vinnycafffe",
        label: "TikTok",
      },
      {
        platform: "kick",
        url: "https://kick.com/vinnycaffe",
        label: "Kick",
      },
    ],
  },
  {
    id: "rammus",
    photo: "/players/rammus.webp",
    name: "RAMMUS",
    lane: "JUNGLE",
    riotId: { gameName: "RAMMUS", tagLine: "TAUNT" },
    opgg: "https://op.gg/pt/lol/summoners/br/RAMMUS-TAUNT",
    socials: [],
  },
  {
    id: "youGlubGlub",
    photo: "/players/youglubglub.webp",
    name: "YOUGLUBGLUB",
    lane: "MID",
    teamRole: "Capitão",
    favoriteChampions: ["Fizz", "Ahri", "Sylas"],
    riotId: { gameName: "YouGlubGlub", tagLine: "Glub" },
    opgg: "https://op.gg/pt/lol/summoners/br/YouGlubGlub-Glub",
    kick: "glub-lol",
    socials: [
      {
        platform: "x",
        url: "https://x.com/Tatoozin",
        label: "X",
      },
      {
        platform: "kick",
        url: "https://kick.com/glub-lol",
        label: "Kick",
      },
    ],
  },
  {
    id: "lyer",
    photo: "/players/lyer.webp",
    name: "LYER",
    lane: "MID",
    riotId: { gameName: "Lyer", tagLine: "5641" },
    opgg: "https://op.gg/pt/lol/summoners/br/Lyer-5641",
    socials: [],
  },
  {
    id: "mychamaqueeuvou",
    photo: "/players/mychamaqueeuvou.webp",
    name: "MYCHAMAQUEEUVOU",
    lane: "BOT",
    favoriteChampions: ["Jinx", "Kai'Sa", "Jhin"],
    riotId: { gameName: "mychamaqueeuvou", tagLine: "velo" },
    opgg: "https://op.gg/pt/lol/summoners/br/mychamaqueeuvou-velo",
    socials: [
      {
        platform: "x",
        url: "https://x.com/my_chamaqueeuvo",
        label: "X",
      },
      {
        platform: "twitch",
        url: "https://www.twitch.tv/my_chamaqueeuvou",
        label: "Twitch",
      },
    ],
  },
  {
    id: "gabis-koersen",
    photo: "/players/gabis-koersen.webp",
    name: "GABIS KOERSEN",
    lane: "SUPPORT",
    riotId: { gameName: "Gabis Koersen", tagLine: "BR1" },
    opgg: "https://op.gg/pt/lol/summoners/br/Gabis-Koersen-BR1",
    socials: [],
  },
  {
    id: "coelha-pistoleira",
    photo: "/players/coelha-pistoleira.webp",
    name: "COELHAPISTOLEIRA",
    lane: "SUPPORT",
    riotId: { gameName: "Coelhapistoleira", tagLine: "TTV" },
    opgg: "https://op.gg/pt/lol/summoners/br/Coelhapistoleira-TTV",
    kick: "coelhapistoleira",
    socials: [
      {
        platform: "kick",
        url: "https://kick.com/coelhapistoleira",
        label: "Kick",
      },
    ],
  },
];

export const LANE_CONFIG: Record<
  Lane,
  {
    label: string;
    color: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  TOP: {
    label: "Top",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  JUNGLE: {
    label: "Jungle",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
  MID: {
    label: "Mid",
    color: "text-sky-400",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
  },
  BOT: {
    label: "Bot",
    color: "text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
  },
  SUPPORT: {
    label: "Support",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
};

/**
 * Link do perfil no OP.GG. Usa `player.opgg` quando informado; caso contrário
 * deriva do Riot ID (o OP.GG abre tanto em /lol/ quanto em /pt/lol/).
 */
export function opggUrl(player: Player): string {
  if (player.opgg) return player.opgg;
  const base = `${player.riotId.gameName}-${player.riotId.tagLine}`;
  return `https://www.op.gg/lol/summoners/br/${encodeURIComponent(base)}`;
}