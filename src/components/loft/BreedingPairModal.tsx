"use client";

import { useEffect, useState } from "react";
import type { BreedingPair, LoftEntry } from "@/types/loft";

function toDateInputValue(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return new Date(value).toISOString().slice(0, 10);
}

export default function BreedingPairModal({
  open,
  title,
  entries,
  initialPair,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  entries: LoftEntry[];
  initialPair?: BreedingPair | null;
  onClose: () => void;
  onSubmit: (values: { father_pigeon_id: string; mother_pigeon_id: string; pairing_date: string; note?: string }) => Promise<void>;
}) {
  const males = entries.filter((entry) => entry.status === "active" && entry.sex === "male");
  const females = entries.filter((entry) => entry.status === "active" && entry.sex === "female");
  const [fatherId, setFatherId] = useState("");
  const [motherId, setMotherId] = useState("");
  const [pairingDate, setPairingDate] = useState(toDateInputValue());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFatherId(initialPair?.father_pigeon_id ?? "");
    setMotherId(initialPair?.mother_pigeon_id ?? "");
    setPairingDate(toDateInputValue(initialPair?.pairing_date));
    setNote(initialPair?.note ?? "");
    setError(null);
    setSaving(false);
  }, [initialPair, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">Select male and female, then set the pairing date.</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-neutral-400">
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="text-sm font-medium text-neutral-700">
            Father
            <select
              value={fatherId}
              onChange={(event) => setFatherId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            >
              <option value="">Select</option>
              {males.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.ring_number}
                  {entry.name ? ` ${entry.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Mother
            <select
              value={motherId}
              onChange={(event) => setMotherId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            >
              <option value="">Select</option>
              {females.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.ring_number}
                  {entry.name ? ` ${entry.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Pairing Date
            <input
              type="date"
              value={pairingDate}
              onChange={(event) => setPairingDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-[100px] w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!fatherId || !motherId) {
                setError("Select both father and mother.");
                return;
              }
              if (fatherId === motherId) {
                setError("Father and mother must be different pigeons.");
                return;
              }
              setSaving(true);
              setError(null);
              try {
                await onSubmit({
                  father_pigeon_id: fatherId,
                  mother_pigeon_id: motherId,
                  pairing_date: pairingDate,
                  note
                });
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save breeding pair.");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="rounded-2xl bg-[#1e3a8a] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
