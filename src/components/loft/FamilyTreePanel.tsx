"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LoftPigeon, PedigreeNode } from "@/types/loft";

type TreeBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pigeon: LoftPigeon | null;
  accent: "subject" | "male" | "female" | "unknown";
};

const BOX_WIDTH = 220;
const BOX_HEIGHT = 92;
const CANVAS_WIDTH = 1500;
const CANVAS_HEIGHT = 620;

function getAccent(pigeon: LoftPigeon | null): TreeBox["accent"] {
  if (!pigeon) return "unknown";
  if (pigeon.sex === "male") return "male";
  if (pigeon.sex === "female") return "female";
  return "unknown";
}

function TreeNode({ box }: { box: TreeBox }) {
  const topLine =
    box.accent === "subject"
      ? "text-amber-700"
      : box.accent === "male"
        ? "text-sky-700"
        : box.accent === "female"
          ? "text-pink-700"
          : "text-neutral-500";

  return (
    <foreignObject x={box.x} y={box.y} width={box.width} height={box.height}>
      <div className="h-full w-full rounded-xl border-2 border-neutral-800 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
        <p className={`truncate text-sm font-bold uppercase tracking-wide ${topLine}`}>
          {box.pigeon?.ring_number ?? "Unknown"}
        </p>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-neutral-700">
          {box.pigeon?.name ?? box.pigeon?.color ?? "Pedigree record not linked yet"}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500">
          {box.pigeon?.notes ?? box.pigeon?.breeder ?? box.pigeon?.owner ?? ""}
        </p>
      </div>
    </foreignObject>
  );
}

function Connector({
  from,
  to
}: {
  from: TreeBox;
  to: TreeBox;
}) {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  const midX = startX + (endX - startX) / 2;

  return (
    <path
      d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
      fill="none"
      stroke="#64748b"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default function FamilyTreePanel({ node }: { node: PedigreeNode | null }) {
  const [zoom, setZoom] = useState(1);

  const boxes = useMemo(() => {
    const subject: TreeBox = {
      id: "subject",
      x: 70,
      y: 264,
      width: 190,
      height: 72,
      pigeon: node?.pigeon ?? null,
      accent: "subject"
    };
    const father: TreeBox = {
      id: "father",
      x: 360,
      y: 182,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      pigeon: node?.father ?? null,
      accent: getAccent(node?.father ?? null)
    };
    const mother: TreeBox = {
      id: "mother",
      x: 360,
      y: 344,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      pigeon: node?.mother ?? null,
      accent: getAccent(node?.mother ?? null)
    };
    const paternalGrandfather: TreeBox = {
      id: "paternalGrandfather",
      x: 720,
      y: 104,
      width: BOX_WIDTH,
      height: 112,
      pigeon: node?.paternalGrandfather ?? null,
      accent: getAccent(node?.paternalGrandfather ?? null)
    };
    const paternalGrandmother: TreeBox = {
      id: "paternalGrandmother",
      x: 720,
      y: 244,
      width: BOX_WIDTH,
      height: 112,
      pigeon: node?.paternalGrandmother ?? null,
      accent: getAccent(node?.paternalGrandmother ?? null)
    };
    const maternalGrandfather: TreeBox = {
      id: "maternalGrandfather",
      x: 720,
      y: 384,
      width: BOX_WIDTH,
      height: 112,
      pigeon: node?.maternalGrandfather ?? null,
      accent: getAccent(node?.maternalGrandfather ?? null)
    };
    const maternalGrandmother: TreeBox = {
      id: "maternalGrandmother",
      x: 1080,
      y: 244,
      width: BOX_WIDTH,
      height: 112,
      pigeon: node?.maternalGrandmother ?? null,
      accent: getAccent(node?.maternalGrandmother ?? null)
    };

    return {
      subject,
      father,
      mother,
      paternalGrandfather,
      paternalGrandmother,
      maternalGrandfather,
      maternalGrandmother
    };
  }, [node]);

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Family Tree</h2>
          <p className="text-sm text-neutral-500">Zoomable pedigree linked to the reusable pigeon database.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.7, Number((value - 0.1).toFixed(2))))}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(2))))}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            +
          </button>
          <Link
            href="/loft/scan"
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            Scan Pedigree
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-3xl border border-neutral-200 bg-white">
        <div
          className="origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        >
          <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
            <Connector from={boxes.subject} to={boxes.father} />
            <Connector from={boxes.subject} to={boxes.mother} />
            <Connector from={boxes.father} to={boxes.paternalGrandfather} />
            <Connector from={boxes.father} to={boxes.paternalGrandmother} />
            <Connector from={boxes.mother} to={boxes.maternalGrandfather} />
            <Connector from={boxes.mother} to={boxes.maternalGrandmother} />

            <TreeNode box={boxes.subject} />
            <TreeNode box={boxes.father} />
            <TreeNode box={boxes.mother} />
            <TreeNode box={boxes.paternalGrandfather} />
            <TreeNode box={boxes.paternalGrandmother} />
            <TreeNode box={boxes.maternalGrandfather} />
            <TreeNode box={boxes.maternalGrandmother} />
          </svg>
        </div>
      </div>
    </section>
  );
}
