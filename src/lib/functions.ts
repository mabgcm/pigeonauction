import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase";
import type { ProcessPedigreeRequest, ProcessPedigreeResponse } from "@/types/pedigree";

export function getFunctionsClient(): Functions | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFunctions(app, "us-central1");
}

export async function processPedigreeUpload(payload: ProcessPedigreeRequest) {
  const functions = getFunctionsClient();
  if (!functions) {
    throw new Error("Functions are not available in this environment.");
  }

  const callable = httpsCallable<ProcessPedigreeRequest, ProcessPedigreeResponse>(
    functions,
    "processPedigreeUpload"
  );
  try {
    const result = await callable(payload);
    return result.data;
  } catch (error: unknown) {
    const maybeFirebaseError = error as { code?: string; message?: string; details?: unknown };
    const details =
      typeof maybeFirebaseError.details === "string"
        ? maybeFirebaseError.details
        : maybeFirebaseError.details
          ? JSON.stringify(maybeFirebaseError.details)
          : "";

    const parts = [maybeFirebaseError.code, maybeFirebaseError.message, details].filter(Boolean);
    throw new Error(parts.join(" | ") || "Pedigree function call failed.");
  }
}
