"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile } from "@/lib/users";
import { getStorageClient } from "@/lib/storage";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const fallbackPhotos = ["/images/pigeon.jpg"];

export default function AuctionCreateForm() {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pigeonName, setPigeonName] = useState("");
  const [description, setDescription] = useState("");
  const [pedigree, setPedigree] = useState("");
  const [startingPrice, setStartingPrice] = useState("200");
  const [endDateTime, setEndDateTime] = useState(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

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

  const previewPhotos = useMemo(() => {
    if (photoFiles.length === 0) return fallbackPhotos;
    return photoFiles.map((file) => URL.createObjectURL(file));
  }, [photoFiles]);

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
    const db = requireDb();

    const auctionRef = await addDoc(collection(db, "auctions"), {
      seller_id: user.uid,
      pigeon_name: pigeonName.trim(),
      description: description.trim(),
      pedigree_info: pedigree.trim(),
      pigeon_photos: fallbackPhotos,
      starting_price: startPrice,
      current_price: startPrice,
      bid_count: 0,
      auction_start: now.toISOString(),
      auction_end: end.toISOString(),
      status: "pending",
      created_at: serverTimestamp()
    });

    if (photoFiles.length > 0) {
      const storage = getStorageClient();
      if (!storage) {
        setStatus("Storage is not available in this environment.");
        setSubmitting(false);
        return;
      }
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

    setSubmitting(false);
    setStatus("Auction created and submitted for approval.");
    setPigeonName("");
    setDescription("");
    setPedigree("");
    setPhotoFiles([]);
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur">
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
        <label className="flex flex-col gap-2 text-sm text-neutral-600">
          Pigeon name
          <input
            value={pigeonName}
            onChange={(e) => setPigeonName(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Blue Bar Homer"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-600">
          Starting price (CAD)
          <input
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            type="number"
            min={10}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-600">
          Auction end date & time
          <input
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            type="datetime-local"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-600 md:col-span-2">
          Pigeon description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Temperament, racing history, unique traits..."
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-600 md:col-span-2">
          Pedigree info (optional)
          <textarea
            value={pedigree}
            onChange={(e) => setPedigree(e.target.value)}
            className="min-h-[80px] rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-600 md:col-span-2">
          Pigeon photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setPhotoFiles(Array.from(event.target.files ?? []))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
      <button
        onClick={handleSubmit}
        disabled={!user || !isVerified || submitting || isBanned || !onboardingComplete}
        className="w-fit rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {submitting ? "Creating..." : "Create auction"}
      </button>
    </div>
  );
}
