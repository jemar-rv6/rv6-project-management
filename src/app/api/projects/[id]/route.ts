import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { projects } from "@/db/schema";

const updateSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  status: z.string().min(2).max(80).optional(),
  nextAction: z.string().min(3).max(1200).optional(),
  blocker: z.string().max(1200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Invalid project update." }, { status: 400 });
  }

  const { id } = await context.params;
  const change = {
    ...input.data,
    progressLabel: hasDatabase() ? "Manual update" : "Local update",
    lastUpdated: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
  };

  if (!hasDatabase()) {
    return NextResponse.json({ id, ...change, persisted: false });
  }

  const [updated] = await getDb().update(projects).set(change).where(eq(projects.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ ...updated, persisted: true });
}
