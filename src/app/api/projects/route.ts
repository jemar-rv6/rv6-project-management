import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { projects } from "@/db/schema";
import { getPortfolioSnapshot } from "@/lib/data";

const createProjectSchema = z.object({
  name: z.string().min(3).max(220),
  shortName: z.string().min(2).max(120),
  summary: z.string().min(8).max(1200),
  owner: z.string().min(2).max(160),
  progress: z.number().int().min(0).max(100),
  status: z.string().min(2).max(80),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
});

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  return NextResponse.json(await getPortfolioSnapshot());
}

export async function POST(request: Request) {
  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete every required field." }, { status: 400 });
  }

  const input = parsed.data;
  const draft = {
    slug: `${makeSlug(input.name)}-${Date.now().toString().slice(-5)}`,
    name: input.name,
    shortName: input.shortName,
    code: "NEW",
    summary: input.summary,
    progress: input.progress,
    progressLabel: hasDatabase() ? "Manual" : "Local draft",
    status: input.status,
    health: "planning",
    priority: input.priority,
    phase: "Planning",
    owner: input.owner,
    collaborators: [] as string[],
    lastUpdated: new Date().toISOString().slice(0, 10),
    nextAction: "Define the first concrete milestone and owner.",
    blocker: "No active blocker",
    accent: "#e3262e",
    outcomes: [] as string[],
    sources: [],
  };

  if (!hasDatabase()) {
    return NextResponse.json({ id: crypto.randomUUID(), ...draft, persisted: false });
  }

  const [created] = await getDb().insert(projects).values(draft).returning();
  return NextResponse.json({ ...created, persisted: true }, { status: 201 });
}
