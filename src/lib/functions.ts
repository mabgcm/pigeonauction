import { getAuthClient } from "@/lib/auth";
import type { ProcessPedigreeRequest, ProcessPedigreeResponse } from "@/types/pedigree";

function getPedigreeEndpointUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/processPedigreeUpload`;
}

export async function processPedigreeUpload(payload: ProcessPedigreeRequest) {
  const auth = getAuthClient();
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("Sign in before generating a pedigree.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(getPedigreeEndpointUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });

  let data: Partial<ProcessPedigreeResponse> & {
    error?: string;
    code?: string;
    details?: unknown;
  };

  try {
    data = (await response.json()) as typeof data;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Pedigree function returned invalid JSON.");
  }

  if (!response.ok) {
    const details =
      typeof data.details === "string"
        ? data.details
        : data.details
          ? JSON.stringify(data.details)
          : "";
    const parts = [data.code, data.error, details].filter(Boolean);
    throw new Error(parts.join(" | ") || `Pedigree request failed with status ${response.status}.`);
  }

  return data as ProcessPedigreeResponse;
}
