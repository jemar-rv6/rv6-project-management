import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { milestones, projects } from "@/db/schema";
import { requireAiConnector } from "@/lib/ai-auth";

const milestoneSchema = z.object({
  title: z.string().min(3).max(240),
  description: z.string().max(2000).optional(),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.enum(["complete", "in-progress", "pending", "blocked", "deferred"]).default("pending"),
  owner: z.string().max(160).optional(),
  dueLabel: z.string().max(120).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  if (!hasDatabase()) return NextResponse.json({ error: "A database is required for AI reads." }, { status: 503 });
  const { id } = await context.params;
  const rows = await getDb().select().from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.position));
  return NextResponse.json(rows);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  if (!hasDatabase()) return NextResponse.json({ error: "A database is required for AI writes." }, { status: 503 });
  const parsed = milestoneSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid milestone payload.", details: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const db = getDb();
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const existing = await db.select({ position: milestones.position }).from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.position));
  const [created] = await db.insert(milestones).values({ projectId: id, ...parsed.data, position: existing.length }).returning();
  return NextResponse.json({ ...created, persisted: true }, { status: 201 });
}
