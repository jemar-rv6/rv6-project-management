import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { milestones } from "@/db/schema";
import { requireAiConnector } from "@/lib/ai-auth";

const deleteSchema = z.object({ confirmation: z.literal("DELETE_MILESTONE") });

export async function DELETE(request: Request, context: { params: Promise<{ id: string; milestoneId: string }> }) {
  const unauthorized = requireAiConnector(request);
  if (unauthorized) return unauthorized;
  if (!hasDatabase()) return NextResponse.json({ error: "A database is required for AI deletes." }, { status: 503 });

  const input = deleteSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Deletion requires confirmation: DELETE_MILESTONE." }, { status: 400 });

  const { id, milestoneId } = await context.params;
  const [deleted] = await getDb().delete(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, id)))
    .returning({ id: milestones.id, title: milestones.title });
  if (!deleted) return NextResponse.json({ error: "Milestone not found for this project." }, { status: 404 });
  return NextResponse.json({ deleted: true, milestone: deleted });
}