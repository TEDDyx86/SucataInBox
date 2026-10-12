"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, LoaderCircle } from "lucide-react";

type SubmissionResponse = { received?: boolean; error?: string };

export function ClipSubmissionForm() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/clip-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceUrl, displayName, consent, website }),
      });
      const result = await response.json() as SubmissionResponse;
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar o clipe. Tente novamente.");

      setSourceUrl("");
      setDisplayName("");
      setConsent(false);
      setWebsite("");
      setMessage({ kind: "success", text: "Recebemos seu clipe. Obrigado por contribuir!" });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível enviar o clipe. Tente novamente.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="clip-submission-title" className="mb-8 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
      <div className="mb-6 max-w-2xl">
        <h2 id="clip-submission-title" className="text-xl font-black tracking-tight text-white">Tem um momento do time para compartilhar?</h2>
        <p className="mt-1 text-sm leading-relaxed text-subtle">Envie um link público da Kick ou da Twitch. Nossa equipe cuida da publicação.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-1.5">
          <label htmlFor="clip-source-url" className="text-xs font-bold text-white">Link do clipe</label>
          <input
            id="clip-source-url"
            name="sourceUrl"
            type="url"
            required
            maxLength={2048}
            autoComplete="url"
            placeholder="https://kick.com/... ou https://clips.twitch.tv/..."
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="min-h-12 w-full rounded-lg border border-hairline bg-black/30 px-3 text-sm text-white placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <p className="text-xs text-faint">Aceitamos links públicos de clipes, não links de canais ou transmissões.</p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="clip-display-name" className="text-xs font-bold text-white">Apelido <span className="font-normal text-faint">(opcional)</span></label>
          <input
            id="clip-display-name"
            name="displayName"
            type="text"
            maxLength={40}
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="min-h-12 w-full rounded-lg border border-hairline bg-black/30 px-3 text-sm text-white placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {displayName.trim() && (
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-subtle">
              <input
                type="checkbox"
                name="consent"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              Concordo que meu apelido apareça publicamente no clipe, caso ele seja publicado.
            </label>
          )}
        </div>

        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="clip-website">Website</label>
          <input
            id="clip-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-black transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            {pending ? "Enviando…" : "Enviar clipe"}
          </button>
          {message && (
            <p role={message.kind === "error" ? "alert" : "status"} className={`inline-flex items-center gap-2 text-sm ${message.kind === "error" ? "text-red-300" : "text-emerald-300"}`}>
              {message.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {message.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
