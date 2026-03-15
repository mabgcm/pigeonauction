"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    signInWithGoogle().catch(() => undefined);
  }, [loading, user, signInWithGoogle]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold text-neutral-900">Sign in</h1>
      <p className="text-neutral-600">Redirecting to Google sign-in...</p>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        {loading ? (
          <p className="text-neutral-500">Checking session...</p>
        ) : user ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">Signed in as {user.email}</p>
            <button
              onClick={signOutUser}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-400"
            >
              Sign out
            </button>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">If the redirect didn’t open, try refreshing the page.</p>
        )}
      </div>
    </main>
  );
}
