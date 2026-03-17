import { randomUUID } from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const PEDIGREE_MODEL = "gpt-4o";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const pedigreeBirdSchema = z.object({
  ring_number: z.string().trim().nullable(),
  name: z.string().trim().nullable(),
  sex: z.enum(["male", "female", "unknown"]),
  color: z.string().trim().nullable(),
  breeder: z.string().trim().nullable(),
  owner: z.string().trim().nullable(),
  notes: z.string().trim().nullable()
});

const pedigreeExtractionSchema = z.object({
  confidence: z.number().min(0).max(1),
  source_language: z.string().trim().nullable(),
  notes: z.array(z.string().trim()).max(12),
  subject: pedigreeBirdSchema,
  father: pedigreeBirdSchema.nullable(),
  mother: pedigreeBirdSchema.nullable(),
  paternal_grandsire: pedigreeBirdSchema.nullable(),
  paternal_granddam: pedigreeBirdSchema.nullable(),
  maternal_grandsire: pedigreeBirdSchema.nullable(),
  maternal_granddam: pedigreeBirdSchema.nullable()
});

const processPedigreeRequestSchema = z.object({
  target: z.enum(["auction", "loft"]).default("auction"),
  auctionId: z.string().min(1).optional(),
  storagePath: z.string().min(1),
  sourceUrl: z.string().url(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  pigeonName: z.string().trim().min(1)
}).superRefine((value, ctx) => {
  if (value.target === "auction" && !value.auctionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "auctionId is required when target is auction.",
      path: ["auctionId"]
    });
  }
});

type PedigreeBird = z.infer<typeof pedigreeBirdSchema>;
type PedigreeExtraction = z.infer<typeof pedigreeExtractionSchema>;
type PedigreeSlot = keyof Pick<
  PedigreeExtraction,
  | "subject"
  | "father"
  | "mother"
  | "paternal_grandsire"
  | "paternal_granddam"
  | "maternal_grandsire"
  | "maternal_granddam"
>;

type StoredPigeon = {
  id: string;
  bird: PedigreeBird;
};

type ProcessPedigreePayload = z.infer<typeof processPedigreeRequestSchema>;

function normalizeString(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function cleanNullableString(value?: string | null) {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeRingNumber(value?: string | null) {
  const normalized = cleanNullableString(value);
  return normalized ? normalized.replace(/[^A-Z0-9]+/gi, "").toUpperCase() : null;
}

function ensureBird(value: PedigreeBird | null | undefined, fallbackName?: string) {
  const subjectName = cleanNullableString(fallbackName);
  return {
    ring_number: cleanNullableString(value?.ring_number),
    name: cleanNullableString(value?.name) ?? subjectName,
    sex: value?.sex ?? "unknown",
    color: cleanNullableString(value?.color),
    breeder: cleanNullableString(value?.breeder),
    owner: cleanNullableString(value?.owner),
    notes: cleanNullableString(value?.notes)
  } satisfies PedigreeBird;
}

function makeDownloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function setCorsHeaders(response: {
  set: (name: string, value: string) => unknown;
}) {
  response.set("Access-Control-Allow-Origin", "https://pigeonauction.vercel.app");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.set("Access-Control-Max-Age", "3600");
}

function summarizeBird(label: string, bird: PedigreeBird | null | undefined) {
  if (!bird) return `${label}: Unknown`;
  const segments = [bird.name, bird.ring_number, bird.color].filter(Boolean);
  return `${label}: ${segments.length > 0 ? segments.join(" | ") : "Unknown"}`;
}

function buildPedigreeSummary(extraction: PedigreeExtraction) {
  return [
    summarizeBird("Subject", extraction.subject),
    summarizeBird("Father", extraction.father),
    summarizeBird("Mother", extraction.mother)
  ].join("\n");
}

async function extractPedigreeFromImage(params: {
  apiKey: string;
  bytes: Buffer;
  contentType: string;
  pigeonName: string;
  fileName: string;
}) {
  const { apiKey, bytes, contentType, pigeonName, fileName } = params;
  const client = new OpenAI({ apiKey });
  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  const response = await client.responses.create({
    model: PEDIGREE_MODEL,
    instructions:
      "You extract pigeon pedigree data from a pedigree image. Return only what is visible. Never invent missing ancestors or ring numbers. Use null when text is unreadable. Keep sex as male, female, or unknown.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Extract the pedigree from this uploaded image for the pigeon "${pigeonName}".`,
              `Source file: ${fileName}.`,
              "Return the subject, parents, and grandparents if visible.",
              "If multiple names or ring numbers conflict, choose the most legible value and add a note."
            ].join("\n")
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "high"
          }
        ]
      }
    ],
    text: {
      format: zodTextFormat(pedigreeExtractionSchema, "pigeon_pedigree_extraction")
    }
  });

  return pedigreeExtractionSchema.parse(JSON.parse(response.output_text));
}

async function upsertPigeon(slot: PedigreeSlot, bird: PedigreeBird, pedigreeId: string, jobId: string) {
  const db = getFirestore();
  const normalizedRingNumber = normalizeRingNumber(bird.ring_number);
  const now = new Date().toISOString();
  let ref = normalizedRingNumber
    ? (
        await db
          .collection("pigeons")
          .where("normalized_ring_number", "==", normalizedRingNumber)
          .limit(1)
          .get()
      ).docs[0]?.ref
    : undefined;

  const payload = {
    ring_number: bird.ring_number,
    normalized_ring_number: normalizedRingNumber,
    name: bird.name,
    normalized_name: bird.name ? normalizeString(bird.name).toLowerCase() : null,
    sex: bird.sex,
    color: bird.color,
    breeder: bird.breeder,
    owner: bird.owner,
    notes: bird.notes,
    latest_pedigree_id: pedigreeId,
    updated_at: now,
    source_slots: FieldValue.arrayUnion(slot),
    pedigree_ids: FieldValue.arrayUnion(pedigreeId),
    job_ids: FieldValue.arrayUnion(jobId)
  };

  if (!ref) {
    ref = db.collection("pigeons").doc();
    await ref.set({
      ...payload,
      created_at: now
    });
    return { id: ref.id, bird };
  }

  await ref.set(payload, { merge: true });
  return { id: ref.id, bird };
}

async function upsertLoftEntry(params: {
  uid: string;
  pigeonId: string;
  bird: PedigreeBird;
}) {
  const { uid, pigeonId, bird } = params;
  const db = getFirestore();
  const now = new Date().toISOString();
  const ref = db.collection("loft_entries").doc(pigeonId);
  const existing = await ref.get();
  const categories = ["Pedigree Import"];

  if (!existing.exists) {
    await ref.set({
      user_id: uid,
      pigeon_id: pigeonId,
      ring_number: bird.ring_number ?? "",
      name: bird.name ?? "",
      sex: bird.sex,
      color: bird.color ?? "",
      photo_url: "",
      status: "active",
      categories,
      notes: bird.notes ?? "",
      created_at: now,
      updated_at: now
    });
    return ref.id;
  }

  const data = existing.data() as {
    user_id?: string;
    categories?: string[];
  };

  if (data.user_id !== uid) {
    throw new HttpsError("permission-denied", "This pigeon is already assigned to another loft.");
  }

  await ref.set(
    {
      ring_number: bird.ring_number ?? "",
      name: bird.name ?? "",
      sex: bird.sex,
      color: bird.color ?? "",
      status: "active",
      categories: Array.from(new Set([...(data.categories ?? []), ...categories])),
      notes: bird.notes ?? "",
      updated_at: now
    },
    { merge: true }
  );

  return ref.id;
}

async function generatePedigreePdf(extraction: PedigreeExtraction, summary: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  page.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: rgb(0.95, 0.96, 0.98)
  });

  page.drawText("Pigeon Pedigree", {
    x: margin,
    y: height - 58,
    size: 24,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.2)
  });

  page.drawText(`Confidence ${Math.round(extraction.confidence * 100)}%`, {
    x: margin,
    y: height - 82,
    size: 11,
    font,
    color: rgb(0.35, 0.4, 0.48)
  });

  y = height - 145;

  const columns = [
    { title: "Subject", bird: extraction.subject, x: margin, width: 235 },
    { title: "Father", bird: extraction.father, x: margin + 260, width: 235 },
    { title: "Mother", bird: extraction.mother, x: margin + 520, width: 235 }
  ];

  for (const column of columns) {
    page.drawRectangle({
      x: column.x,
      y: y - 118,
      width: column.width,
      height: 118,
      borderColor: rgb(0.82, 0.85, 0.9),
      borderWidth: 1,
      color: rgb(1, 1, 1)
    });

    page.drawText(column.title, {
      x: column.x + 12,
      y: y - 20,
      size: 13,
      font: boldFont,
      color: rgb(0.08, 0.12, 0.2)
    });

    const lines = [
      `Name: ${column.bird?.name ?? "Unknown"}`,
      `Ring: ${column.bird?.ring_number ?? "Unknown"}`,
      `Sex: ${column.bird?.sex ?? "unknown"}`,
      `Color: ${column.bird?.color ?? "Unknown"}`,
      `Breeder: ${column.bird?.breeder ?? "Unknown"}`
    ];

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: column.x + 12,
        y: y - 42 - index * 15,
        size: 10,
        font,
        color: rgb(0.24, 0.28, 0.35)
      });
    });
  }

  const grandparentTop = y - 160;
  const grandparents: Array<{ title: string; bird: PedigreeBird | null }> = [
    { title: "Paternal grandsire", bird: extraction.paternal_grandsire },
    { title: "Paternal granddam", bird: extraction.paternal_granddam },
    { title: "Maternal grandsire", bird: extraction.maternal_grandsire },
    { title: "Maternal granddam", bird: extraction.maternal_granddam }
  ];

  grandparents.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const boxX = margin + col * 380;
    const boxY = grandparentTop - row * 92;

    page.drawRectangle({
      x: boxX,
      y: boxY - 70,
      width: 340,
      height: 70,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 1
    });

    page.drawText(item.title, {
      x: boxX + 10,
      y: boxY - 18,
      size: 11,
      font: boldFont,
      color: rgb(0.08, 0.12, 0.2)
    });

    page.drawText(`Name: ${item.bird?.name ?? "Unknown"}`, {
      x: boxX + 10,
      y: boxY - 36,
      size: 10,
      font,
      color: rgb(0.24, 0.28, 0.35)
    });

    page.drawText(`Ring: ${item.bird?.ring_number ?? "Unknown"}`, {
      x: boxX + 10,
      y: boxY - 51,
      size: 10,
      font,
      color: rgb(0.24, 0.28, 0.35)
    });
  });

  page.drawText("Summary", {
    x: margin,
    y: 95,
    size: 12,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.2)
  });

  summary.split("\n").forEach((line, index) => {
    page.drawText(line, {
      x: margin,
      y: 78 - index * 14,
      size: 10,
      font,
      color: rgb(0.24, 0.28, 0.35)
    });
  });

  if (extraction.notes.length > 0) {
    page.drawText(`Notes: ${extraction.notes.join(" | ")}`, {
      x: margin,
      y: 26,
      size: 9,
      font,
      color: rgb(0.35, 0.4, 0.48),
      maxWidth: width - margin * 2
    });
  }

  return Buffer.from(await pdf.save());
}

async function runPedigreeProcessing(uid: string, requestData: unknown) {
    const payload = processPedigreeRequestSchema.parse(requestData);
    if (!payload.contentType.startsWith("image/")) {
      throw new HttpsError("invalid-argument", "Only image pedigree uploads are supported.");
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();
    let auctionRef: FirebaseFirestore.DocumentReference | null = null;
    let auction: { seller_id?: string; pigeon_name?: string } | null = null;

    if (payload.target === "auction") {
      auctionRef = db.collection("auctions").doc(payload.auctionId!);
      const auctionSnap = await auctionRef.get();

      if (!auctionSnap.exists) {
        throw new HttpsError("not-found", "Auction not found.");
      }

      auction = auctionSnap.data() as { seller_id?: string; pigeon_name?: string };
      if (auction.seller_id !== uid) {
        throw new HttpsError("permission-denied", "You can only process your own auctions.");
      }
    }

    const file = bucket.file(payload.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", "Uploaded pedigree image not found.");
    }

    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    if (size > MAX_FILE_BYTES) {
      throw new HttpsError("invalid-argument", "Pedigree image is too large.");
    }

    const jobRef = db.collection("pedigree_jobs").doc();
    const pedigreeRef = db.collection("pedigrees").doc();
    const documentRef = db.collection("pedigree_documents").doc();
    const now = new Date().toISOString();

    await Promise.all([
      jobRef.set({
        auction_id: payload.auctionId ?? null,
        target: payload.target,
        user_id: uid,
        status: "processing",
        source_path: payload.storagePath,
        created_at: now,
        updated_at: now
      }),
      ...(auctionRef
        ? [
            auctionRef.set(
              {
                pedigree_job_id: jobRef.id,
                pedigree_status: "processing",
                pedigree_error: null,
                pedigree_source_url: payload.sourceUrl,
                pedigree_source_path: payload.storagePath
              },
              { merge: true }
            )
          ]
        : [])
    ]);

    try {
      const [bytes] = await file.download();
      const extraction = await extractPedigreeFromImage({
        apiKey: OPENAI_API_KEY.value(),
        bytes,
        contentType: payload.contentType,
        pigeonName: auction?.pigeon_name ?? payload.pigeonName,
        fileName: payload.fileName
      });

      const subject = ensureBird(extraction.subject, auction?.pigeon_name ?? payload.pigeonName);
      const normalizedExtraction: PedigreeExtraction = {
        ...extraction,
        subject,
        father: extraction.father ? ensureBird(extraction.father) : null,
        mother: extraction.mother ? ensureBird(extraction.mother) : null,
        paternal_grandsire: extraction.paternal_grandsire ? ensureBird(extraction.paternal_grandsire) : null,
        paternal_granddam: extraction.paternal_granddam ? ensureBird(extraction.paternal_granddam) : null,
        maternal_grandsire: extraction.maternal_grandsire ? ensureBird(extraction.maternal_grandsire) : null,
        maternal_granddam: extraction.maternal_granddam ? ensureBird(extraction.maternal_granddam) : null
      };

      const stored = new Map<PedigreeSlot, StoredPigeon | null>();
      const slots: PedigreeSlot[] = [
        "subject",
        "father",
        "mother",
        "paternal_grandsire",
        "paternal_granddam",
        "maternal_grandsire",
        "maternal_granddam"
      ];

      for (const slot of slots) {
        const bird = normalizedExtraction[slot];
        if (!bird) {
          stored.set(slot, null);
          continue;
        }
        stored.set(slot, await upsertPigeon(slot, bird, pedigreeRef.id, jobRef.id));
      }

      const subjectStored = stored.get("subject");
      if (!subjectStored?.id) {
        throw new HttpsError("internal", "The pedigree subject could not be stored.");
      }

      const relationshipUpdates = [
        {
          slot: "subject" as const,
          fatherId: stored.get("father")?.id ?? null,
          motherId: stored.get("mother")?.id ?? null
        },
        {
          slot: "father" as const,
          fatherId: stored.get("paternal_grandsire")?.id ?? null,
          motherId: stored.get("paternal_granddam")?.id ?? null
        },
        {
          slot: "mother" as const,
          fatherId: stored.get("maternal_grandsire")?.id ?? null,
          motherId: stored.get("maternal_granddam")?.id ?? null
        }
      ];

      await Promise.all(
        relationshipUpdates.map(async (item) => {
          const pigeon = stored.get(item.slot);
          if (!pigeon) return;
          await db.collection("pigeons").doc(pigeon.id).set(
            {
              father_pigeon_id: item.fatherId,
              mother_pigeon_id: item.motherId,
              updated_at: new Date().toISOString()
            },
            { merge: true }
          );
        })
      );

      const preview = {
        confidence: normalizedExtraction.confidence,
        source_language: normalizedExtraction.source_language,
        notes: normalizedExtraction.notes,
        subject: {
          pigeon_id: subjectStored.id,
          ...normalizedExtraction.subject
        },
        father: normalizedExtraction.father
          ? {
              pigeon_id: stored.get("father")?.id ?? null,
              ...normalizedExtraction.father
            }
          : null,
        mother: normalizedExtraction.mother
          ? {
              pigeon_id: stored.get("mother")?.id ?? null,
              ...normalizedExtraction.mother
            }
          : null
      };

      const loftEntryId = await upsertLoftEntry({
        uid,
        pigeonId: subjectStored.id,
        bird: normalizedExtraction.subject
      });

      const summary = buildPedigreeSummary(normalizedExtraction);
      const pdfBytes = await generatePedigreePdf(normalizedExtraction, summary);
      const pdfScope = payload.target === "auction" ? payload.auctionId : "loft";
      const pdfPath = `pedigrees/pdfs/${uid}/${pdfScope}/${pedigreeRef.id}.pdf`;
      const pdfToken = randomUUID();

      await bucket.file(pdfPath).save(pdfBytes, {
        contentType: "application/pdf",
        metadata: {
          cacheControl: "private, max-age=3600",
          metadata: {
            firebaseStorageDownloadTokens: pdfToken
          }
        }
      });

      const pdfUrl = makeDownloadUrl(bucket.name, pdfPath, pdfToken);

      await Promise.all([
        documentRef.set({
          auction_id: payload.auctionId ?? null,
          target: payload.target,
          user_id: uid,
          source_url: payload.sourceUrl,
          source_path: payload.storagePath,
          file_name: payload.fileName,
          content_type: payload.contentType,
          extracted_json: normalizedExtraction,
          preview,
          generated_pdf_path: pdfPath,
          generated_pdf_url: pdfUrl,
          pedigree_id: pedigreeRef.id,
          created_at: now,
          updated_at: new Date().toISOString()
        }),
        pedigreeRef.set({
          auction_id: payload.auctionId ?? null,
          target: payload.target,
          user_id: uid,
          subject_pigeon_id: stored.get("subject")?.id ?? null,
          loft_entry_id: loftEntryId,
          slot_pigeon_ids: Object.fromEntries(
            slots.map((slot) => [slot, stored.get(slot)?.id ?? null])
          ),
          preview,
          summary,
          document_id: documentRef.id,
          created_at: now,
          updated_at: new Date().toISOString()
        }),
        ...(auctionRef
          ? [
              auctionRef.set(
                {
                  pedigree_info: summary,
                  pedigree_job_id: jobRef.id,
                  pedigree_status: "completed",
                  pedigree_error: null,
                  pedigree_subject_id: subjectStored.id,
                  pedigree_pdf_url: pdfUrl,
                  pedigree_preview: preview
                },
                { merge: true }
              )
            ]
          : []),
        jobRef.set(
          {
            status: "completed",
            target: payload.target,
            summary,
            preview,
            pedigree_id: pedigreeRef.id,
            document_id: documentRef.id,
            subject_pigeon_id: subjectStored.id,
            loft_entry_id: loftEntryId,
            pdf_url: pdfUrl,
            updated_at: new Date().toISOString()
          },
          { merge: true }
        )
      ]);

      return {
        jobId: jobRef.id,
        pedigreeId: pedigreeRef.id,
        subjectPigeonId: subjectStored.id,
        loftEntryId,
        pdfUrl,
        preview,
        summary
      };
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? "The pedigree image could not be normalized into the required schema."
          : error instanceof Error
            ? error.message
            : "Pedigree processing failed.";

      await Promise.all([
        jobRef.set(
          {
            status: "failed",
            error: message,
            updated_at: new Date().toISOString()
          },
          { merge: true }
        ),
        ...(auctionRef
          ? [
              auctionRef.set(
                {
                  pedigree_status: "failed",
                  pedigree_error: message
                },
                { merge: true }
              )
            ]
          : [])
      ]);

      throw new HttpsError("internal", message);
    }
}

export const processPedigreeUpload = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
    cors: true,
    invoker: "public",
    secrets: [OPENAI_API_KEY]
  },
  async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed." });
      return;
    }

    const authHeader = request.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      response.status(401).json({ error: "Missing Firebase ID token.", code: "unauthenticated" });
      return;
    }

    try {
      const decoded = await getAuth().verifyIdToken(match[1]);
      const result = await runPedigreeProcessing(decoded.uid, request.body);
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof HttpsError) {
        response.status(error.httpErrorCode.status).json({
          error: error.message,
          code: error.code
        });
        return;
      }

      if (error instanceof z.ZodError) {
        response.status(400).json({
          error: "Invalid request payload.",
          code: "invalid-argument",
          details: error.flatten()
        });
        return;
      }

      const message = error instanceof Error ? error.message : "Pedigree processing failed.";
      response.status(500).json({
        error: message,
        code: "internal"
      });
    }
  }
);
