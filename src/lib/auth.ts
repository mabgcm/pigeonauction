import { getAuth, type Auth } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

export function getAuthClient(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}
