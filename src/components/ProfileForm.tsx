"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile, updateUserProfileName } from "@/lib/users";

export default function ProfileForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setName(profile?.name || user.displayName || "");
      setEmail(user.email ?? "");
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setStatus(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setStatus("Name must be at least 2 characters.");
      return;
    }
    setLoading(true);
    await updateUserProfileName(user.uid, trimmed);
    setLoading(false);
    setStatus("Profile updated.");
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">
        Sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Email</label>
          <p className="mt-1 text-sm text-neutral-700">{email}</p>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Username</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {status && <p className="text-sm text-neutral-600">{status}</p>}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {loading ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
