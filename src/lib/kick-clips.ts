export type ParsedKickClipUrl = {
  clipId: string;
  channelSlug: string;
};

const KICK_HOSTS = new Set(["kick.com", "www.kick.com"]);
const CLIP_ID_PATTERN = /^clip_[a-z0-9]{20,32}$/i;

/** Accept only public Kick clip pages, never arbitrary URLs from a submitted form. */
export function parseKickClipUrl(input: string): ParsedKickClipUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Informe um link válido de clipe da Kick.");
  }

  if (url.protocol !== "https:" || !KICK_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("O link precisa ser uma página HTTPS da Kick.");
  }

  const match = url.pathname.match(/^\/([a-z0-9_-]+)\/clips\/(clip_[a-z0-9]{20,32})\/?$/i);
  if (!match || !CLIP_ID_PATTERN.test(match[2])) {
    throw new Error("O link não parece ser um clipe público da Kick.");
  }

  return { channelSlug: match[1].toLowerCase(), clipId: match[2] };
}
