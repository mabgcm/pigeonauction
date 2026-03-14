"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuthClient } from "@/lib/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/users";
import { usePathname, useRouter } from "next/navigation";

export type AuthUser = Pick<User, "uid" | "email" | "displayName" | "photoURL">;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const { uid, email, displayName, photoURL } = currentUser;
        setUser({ uid, email, displayName, photoURL });
        (async () => {
          await upsertUserProfile({ uid, email, displayName });
          const profile = await getUserProfile(uid);
          if (profile && !profile.onboarding_complete && pathname !== "/profile") {
            router.push("/profile");
          }
        })().catch(() => undefined);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        const auth = getAuthClient();
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      signOutUser: async () => {
        const auth = getAuthClient();
        if (!auth) return;
        await signOut(auth);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
