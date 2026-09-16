import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { milestones, projectUpdates, projects } from "@/db/schema";

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
  const input = updateSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Invalid project update." }, { status: 400 });
  }

  const { id } = await context.params;
  const change = {
    progress: input.data.progress,
    health: input.data.health,
    status: input.data.status,
    priority: input.data.priority,
    phase: input.data.phase,
    owner: input.data.owner,
    targetDate: input.data.targetDate,
    nextAction: input.data.nextAction,
    blocker: input.data.blocker,
    progressLabel: hasDatabase() ? "Manual update" : "Local update",
    lastUpdated: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
  };

  if (!hasDatabase()) {
    return NextResponse.json({ id, ...change, persisted: false });
  }

  const db = getDb();
  const [updated] = await db.update(projects).set(change).where(eq(projects.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  if (input.data.milestones) {
    await Promise.all(input.data.milestones.map((milestone) => db
      .update(milestones)
      .set({ progress: milestone.progress, status: milestone.status })
      .where(eq(milestones.id, milestone.id))));
  }

  const [createdUpdate] = input.data.update
    ? await db.insert(projectUpdates).values({
        projectId: id,
        updateDate: new Date().toISOString().slice(0, 10),
        title: input.data.update.title,
        body: input.data.update.body,
        type: input.data.update.type,
      }).returning()
    : [];

  return NextResponse.json({ ...updated, persisted: true, update: createdUpdate ?? null });
}
