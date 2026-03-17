"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/AuthProvider";
import { processPedigreeUpload } from "@/lib/functions";
import { getStorageClient } from "@/lib/storage";

export default function LoftScanPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pigeonName, setPigeonName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-6 py-12 text-neutral-600">Loading loft scanner...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-4xl font-semibold text-neutral-900">Scan Pedigree</h1>
        <p className="max-w-xl text-neutral-600">Sign in to import a pedigree directly into your loft.</p>
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Loft</p>
          <h1 className="mt-2 text-4xl font-semibold text-neutral-900">Scan Pedigree</h1>
          <p className="mt-2 text-neutral-600">
            Upload a pedigree image and import the subject pigeon directly into your loft.
          </p>
        </div>
        <Link
          href="/loft"
          className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
        >
          Back to Loft
        </Link>
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div className="grid gap-5">
          <label className="text-sm font-medium text-neutral-700">
            Pigeon Name
            <input
              value={pigeonName}
              onChange={(event) => setPigeonName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="Optional if visible on pedigree"
            />
          </label>

          <label className="text-sm font-medium text-neutral-700">
            Pedigree Image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            />
            <p className="mt-2 text-xs text-neutral-500">
              The image will be sent to OpenAI, converted into structured pedigree JSON, and saved into your loft.
            </p>
          </label>

          {status ? <p className="text-sm text-neutral-700">{status}</p> : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!file || submitting}
              onClick={async () => {
                if (!file) return;
                const storage = getStorageClient();
                if (!storage) {
                  setStatus("Storage is not available in this environment.");
                  return;
                }

                setSubmitting(true);
                setStatus("Uploading pedigree image...");

                try {
                  const safeName = file.name.replace(/\s+/g, "-");
                  const storageRef = ref(
                    storage,
                    `pedigrees/originals/${user.uid}/loft/${Date.now()}-${safeName}`
                  );
                  await uploadBytes(storageRef, file, { contentType: file.type });
                  const sourceUrl = await getDownloadURL(storageRef);

                  setStatus("Processing pedigree with AI...");
                  const result = await processPedigreeUpload({
                    target: "loft",
                    storagePath: storageRef.fullPath,
                    sourceUrl,
                    fileName: file.name,
                    contentType: file.type,
                    pigeonName: pigeonName.trim() || file.name.replace(/\.[^.]+$/, "")
                  });

                  setStatus("Pedigree imported. Opening loft pigeon...");
                  router.push(`/loft/pigeons/${result.subjectPigeonId}`);
                } catch (error) {
                  setStatus(error instanceof Error ? error.message : "Pedigree import failed.");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="rounded-2xl bg-[#1e3a8a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Processing..." : "Import to My Loft"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
