"use client";

import type { LoftPigeon, PedigreeNode } from "@/types/loft";

function BirdCard({ label, pigeon }: { label: string; pigeon: LoftPigeon | null }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-900">{pigeon?.ring_number ?? "Unknown"}</p>
      <p className="mt-1 text-xs text-neutral-500">{pigeon?.name ?? "No name"}</p>
    </div>
  );
}

export default function FamilyTreePanel({ node }: { node: PedigreeNode | null }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Family Tree</h2>
          <p className="text-sm text-neutral-500">Pedigree linked to the reusable pigeon database.</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-3xl bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-5">
        <BirdCard label="Subject" pigeon={node?.pigeon ?? null} />
        <div className="grid gap-4 md:grid-cols-2">
          <BirdCard label="Father" pigeon={node?.father ?? null} />
          <BirdCard label="Mother" pigeon={node?.mother ?? null} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BirdCard label="Paternal Grandsire" pigeon={node?.paternalGrandfather ?? null} />
          <BirdCard label="Paternal Granddam" pigeon={node?.paternalGrandmother ?? null} />
          <BirdCard label="Maternal Grandsire" pigeon={node?.maternalGrandfather ?? null} />
          <BirdCard label="Maternal Granddam" pigeon={node?.maternalGrandmother ?? null} />
        </div>
      </div>
    </section>
  );
}
