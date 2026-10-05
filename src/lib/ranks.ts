/**
 * Metadados e arte dos elos do League of Legends.
 *
 * Os emblemas em `public/ranks` são as medalhas de tier, já recortadas no
 * conteúdo e convertidas para WebP por `scripts/optimize-assets.mjs`. A divisão
 * (I a IV) não tem arte própria: ela aparece no texto ao lado do emblema.
 */

export type TierKey =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "EMERALD"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER"
  | "UNRANKED";

export type TierMeta = {
  /** Nome do elo em português. */
  label: string;
  /** Chave do tier usada no arquivo de arte. */
  key: Lowercase<TierKey>;
  /** Classes Tailwind do texto/anel. */
  text: string;
  ring: string;
  glow: string;
};

const T = (
  key: Lowercase<TierKey>,
  label: string,
  text: string,
  ring: string,
  glow: string,
): TierMeta => ({ key, label, text, ring, glow });

export const TIER_META: Record<TierKey, TierMeta> = {
  IRON: T(
    "iron",
    "Ferro",
    "text-zinc-300",
    "ring-zinc-500/30",
    "shadow-[0_0_22px_rgba(161,161,170,0.18)]",
  ),
  BRONZE: T(
    "bronze",
    "Bronze",
    "text-amber-500",
    "ring-amber-700/40",
    "shadow-[0_0_22px_rgba(217,119,6,0.22)]",
  ),
  SILVER: T(
    "silver",
    "Prata",
    "text-slate-200",
    "ring-slate-400/40",
    "shadow-[0_0_22px_rgba(203,213,225,0.22)]",
  ),
  GOLD: T(
    "gold",
    "Ouro",
    "text-yellow-400",
    "ring-yellow-500/40",
    "shadow-[0_0_22px_rgba(234,179,8,0.28)]",
  ),
  PLATINUM: T(
    "platinum",
    "Platina",
    "text-cyan-300",
    "ring-cyan-400/40",
    "shadow-[0_0_22px_rgba(34,211,238,0.28)]",
  ),
  EMERALD: T(
    "emerald",
    "Esmeralda",
    "text-emerald-300",
    "ring-emerald-500/40",
    "shadow-[0_0_22px_rgba(16,185,129,0.28)]",
  ),
  DIAMOND: T(
    "diamond",
    "Diamante",
    "text-sky-300",
    "ring-sky-500/40",
    "shadow-[0_0_22px_rgba(14,165,233,0.32)]",
  ),
  MASTER: T(
    "master",
    "Mestre",
    "text-purple-300",
    "ring-purple-500/40",
    "shadow-[0_0_22px_rgba(168,85,247,0.32)]",
  ),
  GRANDMASTER: T(
    "grandmaster",
    "Grão-Mestre",
    "text-rose-400",
    "ring-rose-500/40",
    "shadow-[0_0_22px_rgba(244,63,94,0.32)]",
  ),
  CHALLENGER: T(
    "challenger",
    "Desafiante",
    "text-amber-200",
    "ring-amber-300/50",
    "shadow-[0_0_26px_rgba(252,211,77,0.4)]",
  ),
  UNRANKED: T(
    "iron",
    "Sem Ranque",
    "text-zinc-500",
    "ring-zinc-800",
    "",
  ),
};

/**
 * Dimensões intrínsecas de cada PNG. Declarar isso evita layout shift:
 * sem elas o Next usaria um retângulo quadrado e o card "pularia" no load.
 */
type TierArt = { src: string; width: number; height: number };

const TIER_ART: Record<Lowercase<TierKey>, TierArt | null> = {
  iron: { src: "/ranks/iron.webp", width: 384, height: 235 },
  bronze: { src: "/ranks/bronze.webp", width: 384, height: 255 },
  silver: { src: "/ranks/silver.webp", width: 384, height: 272 },
  gold: { src: "/ranks/gold.webp", width: 382, height: 324 },
  platinum: { src: "/ranks/platinum.webp", width: 384, height: 328 },
  emerald: { src: "/ranks/emerald.webp", width: 384, height: 287 },
  diamond: { src: "/ranks/diamond.webp", width: 384, height: 246 },
  master: { src: "/ranks/master.webp", width: 380, height: 291 },
  grandmaster: { src: "/ranks/grandmaster.webp", width: 384, height: 305 },
  challenger: { src: "/ranks/challenger.webp", width: 384, height: 300 },
  unranked: null,
};

/** Divisões possíveis por tier (I a IV). */
const ROMAN = ["", "I", "II", "III", "IV"];

const ROMAN_TO_NUM: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
};

/**
 * A Riot API devolve a divisão em algarismo romano ("I".."IV"), mas alguns
 * registros trazem o número. Aceitamos os dois formatos.
 */
function divisionNumber(division?: string): number {
  const raw = (division ?? "").trim().toUpperCase();
  if (!raw) return Number.NaN;
  if (raw in ROMAN_TO_NUM) return ROMAN_TO_NUM[raw];
  const num = Number.parseInt(raw, 10);
  return Number.isFinite(num) ? num : Number.NaN;
}

/** Normaliza o tier vindo da Riot API. */
export function tierKeyOf(tier?: string): TierKey {
  const key = (tier ?? "").toUpperCase() as TierKey;
  return key in TIER_META ? key : "UNRANKED";
}

/** Arte do emblema do elo, ou null quando o jogador está sem ranque. */
export function tierArt(tier?: string): TierArt | null {
  const key = tierKeyOf(tier);
  if (key === "UNRANKED") return null;
  return TIER_ART[TIER_META[key].key] ?? null;
}

/** Nome completo do elo, ex.: "Ouro III" ou "Desafiante". */
export function tierLabel(tier?: string, division?: string): string {
  const meta = TIER_META[tierKeyOf(tier)];
  const num = divisionNumber(division);
  const suffix = Number.isFinite(num) && ROMAN[num] ? ` ${ROMAN[num]}` : "";
  return `${meta.label}${suffix}`;
}
