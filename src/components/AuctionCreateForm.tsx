"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile } from "@/lib/users";
import { processPedigreeUpload } from "@/lib/functions";
import { getStorageClient } from "@/lib/storage";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getAuctionPrefillFromLoft } from "@/lib/loft";
import type { LoftAuctionPrefill } from "@/types/loft";

const fallbackPhotos = ["/images/pigeon.jpg"];

export default function AuctionCreateForm({ sourcePigeonId }: { sourcePigeonId?: string }) {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pigeonName, setPigeonName] = useState("");
  const [description, setDescription] = useState("");
  const [pedigreeFile, setPedigreeFile] = useState<File | null>(null);
  const [startingPrice, setStartingPrice] = useState("200");
  const [endDateTime, setEndDateTime] = useState(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [prefill, setPrefill] = useState<LoftAuctionPrefill | null>(null);
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (!user) {
        setLoadingProfile(false);
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setIsVerified(profile?.verification_status === "approved");
      setIsBanned(Boolean(profile?.banned));
      setOnboardingComplete(Boolean(profile?.onboarding_complete));
      setLoadingProfile(false);
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadPrefill() {
      if (!user || !sourcePigeonId) {
        setPrefill(null);
        setPrefillLoaded(true);
        return;
      }
      const result = await getAuctionPrefillFromLoft(user.uid, sourcePigeonId);
      if (!active) return;
      setPrefill(result);
      if (result) {
        setPigeonName((value) => value || result.pigeonName);
        setDescription((value) => value || result.description);
      }
      setPrefillLoaded(true);
    }
    loadPrefill().catch(() => {
      if (!active) return;
      setPrefillLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [sourcePigeonId, user]);

  const previewPhotos = useMemo(() => {
    if (photoFiles.length === 0 && prefill?.photoUrls?.length) return prefill.photoUrls;
    if (photoFiles.length === 0) return fallbackPhotos;
    return photoFiles.map((file) => URL.createObjectURL(file));
  }, [photoFiles, prefill?.photoUrls]);

  useEffect(() => {
    return () => {
      previewPhotos.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [previewPhotos]);

  async function handleSubmit() {
    if (!user) {
      setStatus("Please sign in first.");
      return;
    }
    if (!isVerified) {
      setStatus("Your account is not verified yet.");
      return;
    }
    if (isBanned) {
      setStatus("Your account is banned from listing.");
      return;
    }
    if (!onboardingComplete) {
      setStatus("Complete your profile before listing.");
      return;
    }
    if (pigeonName.trim().length < 2) {
      setStatus("Pigeon name is required.");
      return;
    }
    const startPrice = Number(startingPrice);
    if (!Number.isFinite(startPrice) || startPrice < 10) {
      setStatus("Starting price must be at least 10.");
      return;
    }
    const end = new Date(endDateTime);
    const now = new Date();
    if (!endDateTime || Number.isNaN(end.getTime())) {
      setStatus("Select a valid end date and time.");
      return;
    }
    if (end.getTime() <= now.getTime() + 5 * 60 * 1000) {
      setStatus("End time must be at least 5 minutes from now.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const db = requireDb();
      const storage = photoFiles.length > 0 || pedigreeFile ? getStorageClient() : null;

      if ((photoFiles.length > 0 || pedigreeFile) && !storage) {
        throw new Error("Storage is not available in this environment.");
      }

      const auctionRef = await addDoc(collection(db, "auctions"), {
        seller_id: user.uid,
        pigeon_name: pigeonName.trim(),
        description: description.trim(),
        pedigree_info: prefill?.pedigreeInfo ?? "",
        pedigree_status: pedigreeFile ? "processing" : "idle",
        pedigree_subject_id: prefill?.pedigreeSubjectId ?? null,
        pedigree_preview: prefill?.pedigreePreview ?? null,
        source_loft_pigeon_id: prefill?.pigeonId ?? null,
        pigeon_photos: prefill?.photoUrls?.length ? prefill.photoUrls : fallbackPhotos,
        starting_price: startPrice,
        current_price: startPrice,
        bid_count: 0,
        auction_start: now.toISOString(),
        auction_end: end.toISOString(),
        status: "pending",
        created_at: serverTimestamp()
      });

      if (photoFiles.length > 0 && storage) {
        const uploads = await Promise.all(
          photoFiles.map(async (file, index) => {
            const safeName = file.name.replace(/\s+/g, "-");
            const storageRef = ref(storage, `pigeons/${user.uid}/${auctionRef.id}/${index}-${safeName}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );
        await updateDoc(auctionRef, { pigeon_photos: uploads });
      }

      if (pedigreeFile && storage) {
        if (!pedigreeFile.type.startsWith("image/")) {
          throw new Error("Pedigree generator currently supports image uploads only.");
        }

        const safeName = pedigreeFile.name.replace(/\s+/g, "-");
        const pedigreeStorageRef = ref(storage, `pedigrees/originals/${user.uid}/${auctionRef.id}/${safeName}`);
        await uploadBytes(pedigreeStorageRef, pedigreeFile, {
          contentType: pedigreeFile.type
        });
        const sourceUrl = await getDownloadURL(pedigreeStorageRef);

        await updateDoc(auctionRef, {
          pedigree_source_url: sourceUrl,
          pedigree_source_path: pedigreeStorageRef.fullPath,
          pedigree_status: "processing"
        });

        try {
          await processPedigreeUpload({
            target: "auction",
            auctionId: auctionRef.id,
            storagePath: pedigreeStorageRef.fullPath,
            sourceUrl,
            fileName: pedigreeFile.name,
            contentType: pedigreeFile.type,
            pigeonName: pigeonName.trim()
          });
          setStatus("Auction created, pedigree extracted, and PDF generated.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Pedigree processing failed.";
          setStatus(`Auction created, but pedigree processing failed: ${message}`);
        }
      } else {
        setStatus("Auction created and submitted for approval.");
      }

      setPigeonName("");
      setDescription("");
      setPedigreeFile(null);
      setPhotoFiles([]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create auction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-neutral-200 bg-white p-6">
      {!user ? (
        <p className="text-sm text-neutral-600">Sign in to list your pigeon.</p>
      ) : loadingProfile ? (
        <p className="text-sm text-neutral-600">Checking verification status...</p>
      ) : isVerified ? (
        <p className="text-sm text-emerald-700">Verified account.</p>
      ) : !onboardingComplete ? (
        <p className="text-sm text-amber-700">Complete your profile before listing.</p>
      ) : isBanned ? (
        <p className="text-sm text-rose-700">Your account is banned from listing.</p>
      ) : (
        <p className="text-sm text-amber-700">Verification required before listing.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs uppercase tracking-wide text-neutral-500">
          Pigeon name
          <input
            value={pigeonName}
            onChange={(e) => setPigeonName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="Blue Bar Homer"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-neutral-500">
          Starting price (CAD)
          <input
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            type="number"
            min={10}
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-neutral-500">
          Auction end date & time
          <input
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            type="datetime-local"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-neutral-500 md:col-span-2">
          Pigeon description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 min-h-[120px] w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="Temperament, racing history, unique traits..."
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-neutral-500 md:col-span-2">
          Pedigree photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setPedigreeFile(event.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <span className="text-xs text-neutral-500">
            Upload a pedigree image and the AI will extract lineage, save reusable pigeon records, and build a PDF.
          </span>
        </label>
        <label className="text-xs uppercase tracking-wide text-neutral-500 md:col-span-2">
          Pigeon photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setPhotoFiles(Array.from(event.target.files ?? []))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <span className="text-xs text-neutral-500">
            Upload photos from your device. If none are selected, the demo image is used.
          </span>
          <div className="flex flex-wrap gap-3">
            {previewPhotos.map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt="Pigeon preview"
                className="h-20 w-20 rounded-xl object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </label>
      </div>

      {status && <p className="text-sm text-neutral-700">{status}</p>}
      {sourcePigeonId && prefillLoaded ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {prefill ? (
            <>
              Prefilled from loft pigeon <span className="font-semibold">{prefill.pigeonName}</span>.
            </>
          ) : (
            <>The selected loft pigeon could not be loaded for prefill.</>
          )}
        </div>
      ) : null}
      <button
        onClick={handleSubmit}
        disabled={!user || !isVerified || submitting || isBanned || !onboardingComplete}
        className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {submitting ? "Creating..." : "Create auction"}
      </button>
    </div>
  );
}
