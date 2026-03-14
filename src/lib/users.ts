import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import type { UserProfile } from "@/types/auction";

const ANON_PREFIX = "Pigeon";

function generateAnonymousName() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${ANON_PREFIX}-${suffix}`;
}

export async function upsertUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
}) {
  const db = requireDb();
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data() as Partial<UserProfile>;
    const updates: Partial<UserProfile> = {
      email: user.email ?? "",
      updated_at: serverTimestamp() as unknown as string
    };
    if (!data.full_name && user.displayName) {
      updates.full_name = user.displayName;
    }
    if (!data.anonymous_name) {
      updates.anonymous_name = generateAnonymousName();
    }
    await updateDoc(ref, updates);
    return;
  }

  const payload: Partial<UserProfile> = {
    id: user.uid,
    email: user.email ?? "",
    name: user.displayName ?? "",
    anonymous_name: generateAnonymousName(),
    role: "buyer",
    verification_status: "pending",
    onboarding_complete: false,
    full_name: user.displayName ?? "",
    created_at: new Date().toISOString(),
    updated_at: serverTimestamp() as unknown as string
  };

  await setDoc(ref, payload, { merge: true });
}

export async function getUserProfile(userId: string) {
  const db = requireDb();
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) } as UserProfile;
}

export async function updateUserProfileName(userId: string, name: string) {
  const db = requireDb();
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { name, updated_at: serverTimestamp() });
}

export async function updateUserProfileDetails(
  userId: string,
  payload: Partial<UserProfile>
) {
  const db = requireDb();
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { ...payload, updated_at: serverTimestamp() });
}
