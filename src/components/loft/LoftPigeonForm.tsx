"use client";

import { useState } from "react";
import type { LoftEntry, LoftPigeon, LoftPigeonFormInput } from "@/types/loft";

const defaultCategories = ["Young Bird 2026", "Breeding", "Race Team", "Pedigree Only", "Stock Loft"];

export default function LoftPigeonForm({
  mode,
  initialPigeon,
  initialEntry,
  categoryOptions,
  onSubmit,
  onClose
}: {
  mode: "create" | "edit";
  initialPigeon?: LoftPigeon | null;
  initialEntry?: LoftEntry | null;
  categoryOptions: string[];
  onSubmit: (values: LoftPigeonFormInput & { status?: LoftEntry["status"] }) => Promise<void>;
  onClose?: () => void;
}) {
  const [ringNumber, setRingNumber] = useState(initialPigeon?.ring_number ?? "");
  const [name, setName] = useState(initialPigeon?.name ?? "");
  const [sex, setSex] = useState<LoftPigeonFormInput["sex"]>(initialPigeon?.sex ?? "unknown");
  const [color, setColor] = useState(initialPigeon?.color ?? "");
  const [breeder, setBreeder] = useState(initialPigeon?.breeder ?? "");
  const [owner, setOwner] = useState(initialPigeon?.owner ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialPigeon?.photo_url ?? "");
  const [notes, setNotes] = useState(initialPigeon?.notes ?? "");
  const [categoriesText, setCategoriesText] = useState((initialEntry?.categories ?? []).join(", "));
  const [status, setStatus] = useState<LoftEntry["status"]>(initialEntry?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = Array.from(
    new Set(
      [...defaultCategories, ...categoryOptions, ...categoriesText.split(",").map((item) => item.trim())].filter(Boolean)
    )
  );

  async function handleSubmit() {
    if (ringNumber.trim().length < 3) {
      setError("Ring number is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ring_number: ringNumber,
        name,
        sex,
        color,
        breeder,
        owner,
        notes,
        photo_url: photoUrl,
        categories: categoriesText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        status
      });
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pigeon.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-neutral-700">
          Ring Number
          <input
            value={ringNumber}
            onChange={(event) => setRingNumber(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Sex
          <select
            value={sex}
            onChange={(event) => setSex(event.target.value as LoftPigeonFormInput["sex"])}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          >
            <option value="unknown">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Color
          <input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Breeder
          <input
            value={breeder}
            onChange={(event) => setBreeder(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Owner
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700 md:col-span-2">
          Photo URL
          <input
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            placeholder="https://..."
          />
        </label>
        <label className="text-sm font-medium text-neutral-700 md:col-span-2">
          Categories
          <input
            value={categoriesText}
            onChange={(event) => setCategoriesText(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            placeholder="Young Bird 2026, Breeding"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  const list = categoriesText
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (list.includes(category)) return;
                  setCategoriesText(list.length > 0 ? `${list.join(", ")}, ${category}` : category);
                }}
                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600"
              >
                {category}
              </button>
            ))}
          </div>
        </label>
        <label className="text-sm font-medium text-neutral-700 md:col-span-2">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 min-h-[120px] w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        {mode === "edit" ? (
          <label className="text-sm font-medium text-neutral-700">
            Loft Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LoftEntry["status"])}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="flex justify-end gap-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-2xl bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Add pigeon" : "Update pigeon"}
        </button>
      </div>
    </div>
  );
}
