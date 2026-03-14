"use client";

import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/users";

export default function BidderName({ userId, fallback }: { userId: string; fallback?: string }) {
  const [name, setName] = useState(fallback || "");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!userId) return;
      const profile = await getUserProfile(userId);
      if (!isMounted) return;
      if (profile?.anonymous_name) setName(profile.anonymous_name);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return <span className="text-xs text-neutral-500">{name || "User"}</span>;
}
