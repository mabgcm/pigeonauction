"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BreedingPairModal from "@/components/loft/BreedingPairModal";
import { useAuth } from "@/components/AuthProvider";
import {
  buildBreedingMetrics,
  createBreedingPair,
  deleteBreedingPair,
  listenToBreedingPairs,
  listenToChicks,
  listenToEggs,
  listenToLoftEntries,
  markEggAsHatched,
  recordEggForPair,
  updateBreedingPair,
  updateEggStatus
} from "@/lib/loft";
import { formatDate } from "@/lib/format";
import type { BreedingPair, LoftChick, LoftEgg, LoftEntry } from "@/types/loft";

export default function BreedingPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [entries, setEntries] = useState<LoftEntry[]>([]);
  const [pairs, setPairs] = useState<BreedingPair[]>([]);
  const [eggs, setEggs] = useState<LoftEgg[]>([]);
  const [chicks, setChicks] = useState<LoftChick[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<BreedingPair | null>(null);
  const [expandedPairId, setExpandedPairId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubEntries = listenToLoftEntries(user.uid, setEntries);
    const unsubPairs = listenToBreedingPairs(user.uid, setPairs);
    const unsubEggs = listenToEggs(user.uid, setEggs);
    const unsubChicks = listenToChicks(user.uid, setChicks);
    return () => {
      unsubEntries();
      unsubPairs();
      unsubEggs();
      unsubChicks();
    };
  }, [user]);

  const visiblePairs = useMemo(() => pairs.filter((pair) => pair.status !== "archived"), [pairs]);
  const metrics = useMemo(() => buildBreedingMetrics(visiblePairs, eggs, chicks), [visiblePairs, eggs, chicks]);

  if (loading) {
    return <main className="mx-auto max-w-7xl px-6 py-12 text-neutral-600">Loading breeding management...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-4xl font-semibold text-neutral-900">Breeding Management</h1>
        <p className="max-w-xl text-neutral-600">Sign in to manage breeding pairs inside your loft.</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Loft</p>
          <h1 className="mt-2 text-4xl font-semibold text-neutral-900">Breeding Management</h1>
          <p className="mt-2 text-neutral-600">Track pairs, eggs, hatch windows, and breeding notes.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/loft"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
          >
            Back to Loft
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-[#1e3a8a] px-4 py-3 text-sm font-semibold text-white"
          >
            + New Pair
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 rounded-3xl border border-white/60 bg-white/90 px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div className="text-sm text-neutral-500">
          <span className="text-3xl font-semibold text-neutral-900">{metrics.totalPairs}</span> Total
        </div>
        <div className="text-sm text-emerald-600">
          <span className="text-3xl font-semibold text-neutral-900">{metrics.eggs}</span> Eggs
        </div>
        <div className="text-sm text-amber-600">
          <span className="text-3xl font-semibold text-neutral-900">{metrics.chicks}</span> Chicks
        </div>
        <div className="text-sm text-[#2563eb]">
          <span className="text-3xl font-semibold text-neutral-900">{metrics.success}%</span> Success
        </div>
      </div>

      {status ? <p className="text-sm text-neutral-600">{status}</p> : null}

      <div className="space-y-5">
        {visiblePairs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-neutral-500">
            No breeding pairs yet. Add your first pair to start tracking hatch cycles.
          </div>
        ) : (
          visiblePairs.map((pair) => {
            const pairEggs = eggs.filter((egg) => egg.pair_id === pair.id);
            const pairChicks = chicks.filter((chick) => chick.pair_id === pair.id);
            const successRate = pairEggs.length > 0 ? Math.round((pairChicks.length / pairEggs.length) * 100) : 0;
            const expanded = expandedPairId === pair.id;
            return (
              <article
                key={pair.id}
                className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">Father / Mother</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-neutral-900">
                      <span className="text-sky-600">{pair.father_ring_number}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-pink-600">{pair.mother_ring_number}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-500">Pairing: {formatDate(pair.pairing_date)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {pairEggs.length > 0 ? "Tracking eggs" : "Active"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await recordEggForPair(pair.id);
                        setStatus(`Egg recorded for ${pair.father_ring_number} × ${pair.mother_ring_number}.`);
                      }}
                      className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
                    >
                      Add Egg
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPair(pair)}
                      className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteBreedingPair(pair.id);
                        setStatus(`Pair ${pair.father_ring_number} × ${pair.mother_ring_number} archived.`);
                      }}
                      className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedPairId(expanded ? null : pair.id)}
                      className="rounded-2xl px-3 py-2 text-sm font-semibold text-[#1e3a8a]"
                    >
                      {expanded ? "Hide Details" : "Show Details"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Eggs</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{pairEggs.length}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Chicks</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{pairChicks.length}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Success</p>
                    <p className="mt-2 text-2xl font-semibold text-[#2563eb]">{successRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Expected Hatch</p>
                    <p className="mt-2 text-sm font-semibold text-neutral-900">
                      {pair.expected_hatch_at ? formatDate(pair.expected_hatch_at) : "Not set"}
                    </p>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-5 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Father</p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">{pair.father_name || pair.father_ring_number}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Mother</p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">{pair.mother_name || pair.mother_ring_number}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Last Egg Recorded</p>
                      <p className="mt-2 text-sm text-neutral-700">
                        {pair.last_egg_at ? formatDate(pair.last_egg_at) : "No egg recorded yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Note</p>
                      <p className="mt-2 text-sm text-neutral-700">{pair.note || "No note provided."}</p>
                    </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-neutral-400">Egg Records</p>
                          <span className="text-xs font-semibold text-neutral-500">{pairEggs.length} total</span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {pairEggs.length === 0 ? (
                            <p className="text-sm text-neutral-500">No eggs recorded yet.</p>
                          ) : (
                            pairEggs.map((egg) => (
                              <div key={egg.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-neutral-900">Egg {egg.sequence_number}</p>
                                    <p className="mt-1 text-xs text-neutral-500">
                                      Laid {formatDate(egg.laid_at)} • Hatch {formatDate(egg.expected_hatch_at)}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 capitalize">
                                    {egg.status}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {egg.status === "incubating" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await markEggAsHatched(egg.id);
                                          setStatus(`Egg ${egg.sequence_number} marked as hatched.`);
                                        }}
                                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                      >
                                        Mark Hatched
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateEggStatus(egg.id, "clear");
                                          setStatus(`Egg ${egg.sequence_number} marked as clear.`);
                                        }}
                                        className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                      >
                                        Mark Clear
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateEggStatus(egg.id, "lost");
                                          setStatus(`Egg ${egg.sequence_number} marked as lost.`);
                                        }}
                                        className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                      >
                                        Mark Lost
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-neutral-400">Chick Records</p>
                          <span className="text-xs font-semibold text-neutral-500">{pairChicks.length} total</span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {pairChicks.length === 0 ? (
                            <p className="text-sm text-neutral-500">No chicks hatched yet.</p>
                          ) : (
                            pairChicks.map((chick, index) => (
                              <div key={chick.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                                <p className="text-sm font-semibold text-neutral-900">Chick {index + 1}</p>
                                <p className="mt-1 text-xs text-neutral-500">Hatched {formatDate(chick.hatched_at)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <BreedingPairModal
        open={createOpen}
        title="Add New Pair"
        entries={entries}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          await createBreedingPair(user.uid, values);
          setStatus("Breeding pair created.");
        }}
      />

      <BreedingPairModal
        open={Boolean(editingPair)}
        title="Edit Pair"
        entries={entries}
        initialPair={editingPair}
        onClose={() => setEditingPair(null)}
        onSubmit={async (values) => {
          if (!editingPair) return;
          await updateBreedingPair(editingPair.id, values);
          setStatus("Breeding pair updated.");
          setEditingPair(null);
        }}
      />
    </main>
  );
}
