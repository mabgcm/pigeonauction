"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoftSidebar from "@/components/loft/LoftSidebar";
import LoftPigeonForm from "@/components/loft/LoftPigeonForm";
import { useAuth } from "@/components/AuthProvider";
import {
  createDiaryEntry,
  createLoftPigeon,
  getExistingCategories,
  getLoftStats,
  getUpcomingReminders,
  listenToBreedingPairs,
  listenToDiaryEntries,
  listenToEggs,
  listenToLoftEntries
} from "@/lib/loft";
import { formatDate } from "@/lib/format";
import type { BreedingPair, LoftDiaryEntry, LoftEgg, LoftEntry } from "@/types/loft";

export default function LoftOverviewPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [entries, setEntries] = useState<LoftEntry[]>([]);
  const [pairs, setPairs] = useState<BreedingPair[]>([]);
  const [eggs, setEggs] = useState<LoftEgg[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<LoftDiaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryBody, setDiaryBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubEntries = listenToLoftEntries(user.uid, setEntries);
    const unsubPairs = listenToBreedingPairs(user.uid, setPairs);
    const unsubEggs = listenToEggs(user.uid, setEggs);
    const unsubDiary = listenToDiaryEntries(user.uid, (items) =>
      setDiaryEntries(items.filter((entry) => !(entry as { archived?: boolean }).archived))
    );
    getExistingCategories(user.uid).then(setCategoryOptions).catch(() => undefined);
    return () => {
      unsubEntries();
      unsubPairs();
      unsubEggs();
      unsubDiary();
    };
  }, [user]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.status !== status) return false;
      if (!query) return true;
      return (
        entry.ring_number.toLowerCase().includes(query) ||
        (entry.name ?? "").toLowerCase().includes(query)
      );
    });
  }, [entries, search, status]);

  const stats = useMemo(() => getLoftStats(entries), [entries]);
  const reminders = useMemo(() => getUpcomingReminders(pairs, eggs), [pairs, eggs]);

  if (loading) {
    return <main className="mx-auto max-w-7xl px-6 py-12 text-neutral-600">Loading loft...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-4xl font-semibold text-neutral-900">My Loft</h1>
        <p className="max-w-xl text-neutral-600">
          Sign in to manage your pigeons, breeding pairs, reminders, and pedigree records.
        </p>
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Loft</p>
          <h1 className="mt-2 text-4xl font-semibold text-neutral-900">Loft Overview</h1>
          <p className="mt-2 text-neutral-600">General status and key loft statistics for your birds.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/loft/breeding"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
          >
            Breeding Management
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-[#1e3a8a] px-4 py-3 text-sm font-semibold text-white"
          >
            Add pigeon
          </button>
        </div>
      </div>

      {feedback ? <p className="text-sm text-neutral-600">{feedback}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <LoftSidebar
          entries={filteredEntries}
          selectedId={filteredEntries[0]?.id}
          status={status}
          search={search}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onAdd={() => setCreateOpen(true)}
        />

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Pigeons", value: stats.total, tone: "text-[#1e3a8a]" },
              { label: "Male", value: stats.male, tone: "text-sky-600" },
              { label: "Female", value: stats.female, tone: "text-pink-600" },
              { label: "Juvenile", value: stats.juvenile, tone: "text-amber-600" }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <p className="text-sm font-medium text-neutral-500">{item.label}</p>
                <p className={`mt-3 text-4xl font-semibold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Category Distribution</h2>
                  <p className="text-sm text-neutral-500">How your active pigeons are organized inside the loft.</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {stats.categories.length === 0 ? (
                  <p className="text-sm text-neutral-500">No categories yet. Add one when creating or editing a pigeon.</p>
                ) : (
                  stats.categories.map((category) => (
                    <div key={category.label} className="grid grid-cols-[1fr_auto] items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-[#1e3a8a]" />
                        <span className="text-sm font-medium text-neutral-700">{category.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">{category.count}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Upcoming Reminders</h2>
                  <p className="text-sm text-neutral-500">Breeding cycles that need attention soon.</p>
                </div>
                <Link href="/loft/breeding" className="text-sm font-semibold text-[#1e3a8a]">
                  View breeding
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {reminders.length === 0 ? (
                  <p className="text-sm text-neutral-500">No reminders yet. Add your first breeding pair to generate reminders.</p>
                ) : (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <p className="text-sm font-semibold text-neutral-900">{reminder.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">{reminder.subtitle}</p>
                      <p className="mt-2 text-xs font-medium text-[#1e3a8a]">{formatDate(reminder.due_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Loft Diary</h2>
                  <p className="text-sm text-neutral-500">Recent activity from your loft records.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <input
                    value={diaryTitle}
                    onChange={(event) => setDiaryTitle(event.target.value)}
                    placeholder="Diary title"
                    className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none"
                  />
                  <textarea
                    value={diaryBody}
                    onChange={(event) => setDiaryBody(event.target.value)}
                    placeholder="Write a loft note, treatment reminder, or observation..."
                    className="min-h-[110px] rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!diaryTitle.trim() || !diaryBody.trim()) {
                          setFeedback("Diary title and note are required.");
                          return;
                        }
                        await createDiaryEntry(user.uid, {
                          title: diaryTitle,
                          body: diaryBody
                        });
                        setDiaryTitle("");
                        setDiaryBody("");
                        setFeedback("Loft diary entry added.");
                      }}
                      className="rounded-2xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Add diary entry
                    </button>
                  </div>
                </div>
                {diaryEntries.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-sm font-semibold text-neutral-900">{entry.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDate(entry.entry_date)}</p>
                    <p className="mt-2 text-sm text-neutral-700">{entry.body}</p>
                  </div>
                ))}
                {diaryEntries.length === 0 ? <p className="text-sm text-neutral-500">No diary entries yet.</p> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Recently Added Pigeons</h2>
                  <p className="text-sm text-neutral-500">Jump back into the birds you added most recently.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {entries.slice(0, 6).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/loft/pigeons/${entry.id}`}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-neutral-900">{entry.ring_number}</p>
                    <p className="mt-1 text-xs text-neutral-500">{entry.name || "Unnamed pigeon"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
                {entries.length === 0 ? <p className="text-sm text-neutral-500">No pigeons added yet.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">Add Loft Pigeon</h2>
                <p className="mt-1 text-sm text-neutral-500">Create a loft record linked to the global pigeon database.</p>
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
                await createLoftPigeon(user.uid, values);
                const nextCategories = await getExistingCategories(user.uid);
                setCategoryOptions(nextCategories);
              }}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
