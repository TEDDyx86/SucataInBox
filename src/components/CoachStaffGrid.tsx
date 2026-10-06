"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  COACH_STAFF,
  coachStaffSocials,
  type CoachStaffLiveStatus,
  type CoachStaffMember,
} from "@/data/coach-staff";
import type { SocialPlatform } from "@/data/team";
import { PLATFORM_CONFIG } from "@/data/social";
import { BrandIcon } from "./BrandIcon";

const POLL_MS = 60_000;

export function CoachStaffGrid({
  initialStatus,
}: {
  initialStatus: CoachStaffLiveStatus;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/coach-staff", { cache: "no-store" });
        if (response.ok && !cancelled) {
          setStatus((await response.json()) as CoachStaffLiveStatus);
        }
      } catch {
        // Preserva o último estado conhecido enquanto a rede falha.
      }
    }

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const presidents = COACH_STAFF.filter((member) => member.role === "Presidente");
  const coaches = COACH_STAFF.filter((member) => member.role === "Coach");

  return (
    <div className="space-y-10">
      <StaffGroup title="Presidentes" members={presidents} status={status} />
      <StaffGroup title="Coaches" members={coaches} status={status} />
    </div>
  );
}

function StaffGroup({
  title,
  members,
  status,
}: {
  title: string;
  members: CoachStaffMember[];
  status: CoachStaffLiveStatus;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-subtle">
        <span className="h-px w-6 bg-accent/70" />
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <StaffCard key={member.id} member={member} live={status[member.id]} />
        ))}
      </div>
    </section>
  );
}

function StaffCard({
  member,
  live,
}: {
  member: CoachStaffMember;
  live: CoachStaffLiveStatus[string] | undefined;
}) {
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="flex h-full flex-col rounded-2xl border border-hairline bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-raised text-lg font-black text-subtle">
          {live?.avatarUrl ? (
            <Image
              src={live.avatarUrl}
              alt={`Foto de ${member.name}`}
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight text-white">{member.name}</h3>
            {live?.isLive && (
              <span
                role="img"
                aria-label={`${member.name} está ao vivo`}
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400"
              />
            )}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-faint">
            {member.role}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
        {coachStaffSocials(member).map((social) => {
          const platform: SocialPlatform = social.platform;
          const style = PLATFORM_CONFIG[platform];
          return (
            <a
              key={social.url}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${social.label} de ${member.name} (abre em nova aba)`}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${style.bg} ${style.border} ${style.text} ${style.hoverBg}`}
            >
              <BrandIcon platform={platform} className="h-3.5 w-3.5 shrink-0" />
              {social.label}
            </a>
          );
        })}
      </div>
    </article>
  );
}
