import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { milestones, projectUpdates, projects } from "@/db/schema";
import { requireAiConnector } from "@/lib/ai-auth";

const updateSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  health: z.enum(["on-track", "attention", "blocked", "planning"]).optional(),
  status: z.string().min(2).max(80).optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  phase: z.string().min(2).max(120).optional(),
  owner: z.string().min(2).max(160).optional(),
  targetDate: z.string().date().optional().nullable(),
  nextAction: z.string().min(3).max(1200).optional(),
  blocker: z.string().max(1200).optional(),
  milestones: z.array(z.object({
    id: z.string().uuid(),
    progress: z.number().int().min(0).max(100),
    status: z.enum(["complete", "in-progress", "pending", "blocked", "deferred"]),
  })).optional(),
  update: z.object({
    title: z.string().min(3).max(240),
    body: z.string().min(3),
    type: z.enum(["progress", "decision", "blocker", "approval"]),
  }).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  if (!hasDatabase()) return NextResponse.json({ error: "A database is required for AI writes." }, { status: 503 });

  const input = updateSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Invalid project update.", details: input.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const db = getDb();
  const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  if (input.data.milestones?.length) {
    const projectMilestones = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, id));
    const allowedIds = new Set(projectMilestones.map((milestone) => milestone.id));
    if (input.data.milestones.some((milestone) => !allowedIds.has(milestone.id))) {
      return NextResponse.json({ error: "One or more milestones do not belong to this project." }, { status: 400 });
    }
  }

  const [updated] = await db.update(projects).set({
    ...(input.data.progress !== undefined && { progress: input.data.progress }),
    ...(input.data.health !== undefined && { health: input.data.health }),
    ...(input.data.status !== undefined && { status: input.data.status }),
    ...(input.data.priority !== undefined && { priority: input.data.priority }),
    ...(input.data.phase !== undefined && { phase: input.data.phase }),
    ...(input.data.owner !== undefined && { owner: input.data.owner }),
    ...(input.data.targetDate !== undefined && { targetDate: input.data.targetDate }),
    ...(input.data.nextAction !== undefined && { nextAction: input.data.nextAction }),
    ...(input.data.blocker !== undefined && { blocker: input.data.blocker }),
    progressLabel: "AI update",
    lastUpdated: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
  }).where(eq(projects.id, id)).returning();

  if (input.data.milestones) {
    await Promise.all(input.data.milestones.map((milestone) => db.update(milestones)
      .set({ progress: milestone.progress, status: milestone.status })
      .where(and(eq(milestones.id, milestone.id), eq(milestones.projectId, id)))));
  }

  const [createdUpdate] = input.data.update
    ? await db.insert(projectUpdates).values({ projectId: id, updateDate: new Date().toISOString().slice(0, 10), ...input.data.update }).returning()
    : [];

  return NextResponse.json({ ...updated, persisted: true, update: createdUpdate ?? null });
}
