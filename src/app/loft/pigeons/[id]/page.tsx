"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoftSidebar from "@/components/loft/LoftSidebar";
import LoftPigeonForm from "@/components/loft/LoftPigeonForm";
import FamilyTreePanel from "@/components/loft/FamilyTreePanel";
import { useAuth } from "@/components/AuthProvider";
import { createLoftPigeon, getExistingCategories, getLoftPigeon, getPedigreeNode, listenToLoftEntries, updateLoftPigeon } from "@/lib/loft";
import type { LoftEntry, LoftPigeon, PedigreeNode } from "@/types/loft";

export default function LoftPigeonPage({ params }: { params: { id: string } }) {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LoftEntry[]>([]);
  const [entry, setEntry] = useState<LoftEntry | null>(null);
  const [pigeon, setPigeon] = useState<LoftPigeon | null>(null);
  const [pedigree, setPedigree] = useState<PedigreeNode | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToLoftEntries(user.uid, setEntries);
    getExistingCategories(user.uid).then(setCategoryOptions).catch(() => undefined);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.uid;
    let active = true;
    async function loadPigeon() {
      try {
        const data = await getLoftPigeon(params.id);
        if (!active) return;
        if (!data || data.entry.user_id !== userId) {
          setError("This loft pigeon could not be found.");
          setEntry(null);
          setPigeon(null);
          setPedigree(null);
          return;
        }
        setEntry(data.entry);
        setPigeon(data.pigeon);
        const node = await getPedigreeNode(params.id);
        if (!active) return;
        setPedigree(node);
        setStatus(data.entry.status);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load loft pigeon.");
      }
    }
    loadPigeon();
    return () => {
      active = false;
    };
  }, [params.id, user]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((item) => {
      if (item.status !== status) return false;
      if (!query) return true;
      return item.ring_number.toLowerCase().includes(query) || (item.name ?? "").toLowerCase().includes(query);
    });
  }, [entries, search, status]);

  if (loading) {
    return <main className="mx-auto max-w-7xl px-6 py-12 text-neutral-600">Loading pigeon...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-4xl font-semibold text-neutral-900">My Loft</h1>
        <p className="max-w-xl text-neutral-600">Sign in to view and update your loft pigeons.</p>
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
    <main className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Loft</p>
        <h1 className="mt-2 text-4xl font-semibold text-neutral-900">{pigeon?.ring_number ?? "Loft Pigeon"}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_520px]">
        <LoftSidebar
          entries={filteredEntries}
          selectedId={params.id}
          status={status}
          search={search}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onAdd={() => setCreateOpen(true)}
        />

        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          {error ? (
            <p className="text-sm text-rose-700">{error}</p>
          ) : pigeon && entry ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">Basic Information</p>
                  <h2 className="mt-2 text-2xl font-semibold text-neutral-900">{pigeon.name || pigeon.ring_number}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {entry.status}
                  </span>
                  <Link
                    href={`/auctions/new?pigeonId=${params.id}`}
                    className="rounded-2xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white"
                  >
                    List in Auction
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[0.6fr_1fr]">
                <div className="rounded-3xl border border-neutral-200 bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-5">
                  <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white">
                    {pigeon.photo_url ? (
                      <img src={pigeon.photo_url} alt={pigeon.ring_number} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      <div className="text-center text-neutral-400">
                        <div className="text-6xl">🕊️</div>
                        <p className="mt-3 text-sm">Add a photo URL to display a pigeon image.</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {entry.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                <LoftPigeonForm
                  mode="edit"
                  initialPigeon={pigeon}
                  initialEntry={entry}
                  categoryOptions={categoryOptions}
                  onSubmit={async (values) => {
                    await updateLoftPigeon(user.uid, params.id, values);
                    const [nextData, nextCategories] = await Promise.all([
                      getLoftPigeon(params.id),
                      getExistingCategories(user.uid)
                    ]);
                    if (nextData) {
                      setPigeon(nextData.pigeon);
                      setEntry(nextData.entry);
                      const nextPedigree = await getPedigreeNode(params.id);
                      setPedigree(nextPedigree);
                    }
                    setCategoryOptions(nextCategories);
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Loading loft pigeon...</p>
          )}
        </section>

        <FamilyTreePanel node={pedigree} />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">Add Loft Pigeon</h2>
                <p className="mt-1 text-sm text-neutral-500">Create a new pigeon and add it directly to this loft.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-xl text-neutral-400">
                ×
              </button>
            </div>
            <LoftPigeonForm
              mode="create"
              categoryOptions={categoryOptions}
              onClose={() => setCreateOpen(false)}
              onSubmit={async (values) => {
                const id = await createLoftPigeon(user.uid, values);
                setCreateOpen(false);
                router.push(`/loft/pigeons/${id}`);
              }}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
