import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { projects } from "@/db/schema";
import { requireAiConnector } from "@/lib/ai-auth";
import { getPortfolioSnapshot } from "@/lib/data";

const createProjectSchema = z.object({
  name: z.string().min(3).max(220),
  shortName: z.string().min(2).max(120),
  summary: z.string().min(8).max(1200),
  owner: z.string().min(2).max(160),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.string().min(2).max(80).default("Planning"),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
});

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getPortfolioSnapshot());
}

export async function POST(request: Request) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid project payload.", details: parsed.error.flatten() }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: "A database is required for AI writes." }, { status: 503 });

  const input = parsed.data;
  const [created] = await getDb().insert(projects).values({
    slug: `${makeSlug(input.name)}-${Date.now().toString().slice(-5)}`,
    name: input.name,
    shortName: input.shortName,
    code: "AI",
    summary: input.summary,
    progress: input.progress,
    progressLabel: "AI update",
    status: input.status,
    health: "planning",
    priority: input.priority,
    phase: "Planning",
    owner: input.owner,
    collaborators: [],
    lastUpdated: new Date().toISOString().slice(0, 10),
    nextAction: "Define the first concrete milestone and owner.",
    blocker: "No active blocker",
    accent: "#e3262e",
    outcomes: [],
    sources: [],
  }).returning();

  return NextResponse.json({ ...created, persisted: true }, { status: 201 });
}
