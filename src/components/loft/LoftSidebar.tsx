"use client";

import Link from "next/link";
import type { LoftEntry } from "@/types/loft";

export default function LoftSidebar({
  entries,
  selectedId,
  status,
  search,
  onSearchChange,
  onStatusChange,
  onAdd
}: {
  entries: LoftEntry[];
  selectedId?: string;
  status: "active" | "archived";
  search: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "active" | "archived") => void;
  onAdd: () => void;
}) {
  return (
    <aside className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-neutral-900">My Pigeons</h2>
        <p className="text-sm text-neutral-500">{entries.length} pigeons in this view</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
        {(["active", "archived"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusChange(value)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${
              status === value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by ring number or name..."
        className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-2xl bg-[#1e3a8a] px-4 py-3 text-sm font-semibold text-white"
        >
          + Add
        </button>
        <Link
          href="/loft/scan"
          className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-700"
        >
          Scan Pedigree
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
            No pigeons match this filter yet.
          </div>
        ) : (
          entries.map((entry) => {
            const isSelected = entry.id === selectedId;
            return (
              <Link
                key={entry.id}
                href={`/loft/pigeons/${entry.id}`}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                  isSelected
                    ? "border-[#1e3a8a] bg-[#eff6ff]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-xl">
                  {entry.photo_url ? (
                    <img src={entry.photo_url} alt={entry.ring_number} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span>🕊️</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{entry.ring_number}</p>
                  <p className="truncate text-xs text-neutral-500">{entry.name || "Unnamed pigeon"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      entry.sex === "male"
                        ? "bg-sky-500"
                        : entry.sex === "female"
                          ? "bg-pink-500"
                          : "bg-neutral-400"
                    }`}
                  />
                  {entry.categories.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {entry.categories[0]}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
