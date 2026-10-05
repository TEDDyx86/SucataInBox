/**
 * Otimiza os assets estáticos que são maiores do que o site jamais exibe.
 *
 * Contexto: `public/ranks/*.png` somava 1,4 MB em PNG de 32 bits para ícones
 * que aparecem com no máximo 96px de largura, e `public/players/*.webp` tinha
 * fotos 1254x1254 (Next entrega no máximo w=384 para `sizes="176px"`).
 *
 * O ganho real NÃO é de runtime — o `next/image` já reamostra e serve variants
 * do tamanho certo. O ganho é de tamanho de repositório e de upload no deploy.
 *
 * Uso: node scripts/optimize-assets.mjs
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const RANKS = join(process.cwd(), "public", "ranks");
const PLAYERS = join(process.cwd(), "public", "players");

/** Largura máxima: cobre DPR 3 no maior tamanho de exibição (96px / 176px). */
const RANKS_MAX_WIDTH = 384;
const PLAYERS_MAX_WIDTH = 640;

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function optimizeRank(file) {
  const src = join(RANKS, file);
  const dst = src.replace(/\.png$/, ".webp");
  const before = (await stat(src)).size;

  const meta = await sharp(src).metadata();
  await sharp(src)
    .resize({ width: Math.min(meta.width, RANKS_MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(dst);

  const after = (await stat(dst)).size;
  await unlink(src);
  console.log(
    `ranks/${file.replace(/\.png$/, ".webp")}  ${kb(before)} -> ${kb(after)}`,
  );
}

async function optimizePlayer(file) {
  const src = join(PLAYERS, file);
  const tmp = join(PLAYERS, `_tmp_${file}`);
  const before = (await stat(src)).size;

  await sharp(src)
    .resize({ width: PLAYERS_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(tmp);

  // O dev server segura o arquivo original enquanto serve a imagem, o que
  // trava o unlink no Windows. Retry curto em vez de abortar o lote inteiro.
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await unlink(src);
      const { rename } = await import("node:fs/promises");
      await rename(tmp, src);
      const after = (await stat(src)).size;
      console.log(`players/${file}  ${kb(before)} -> ${kb(after)}`);
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  await unlink(tmp).catch(() => {});
  console.log(`players/${file}  PULADO (arquivo travado: ${lastErr.code})`);
}

const ranks = (await readdir(RANKS)).filter((f) => f.endsWith(".png"));
const players = (await readdir(PLAYERS)).filter((f) => f.endsWith(".webp"));

console.log("ranks:");
for (const f of ranks) await optimizeRank(f);
console.log("players:");
for (const f of players) await optimizePlayer(f);
