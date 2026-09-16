import { asc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db/client";
import { milestones, projectUpdates, projects, risks } from "@/db/schema";
import { reportAsOf, seedProjects } from "@/lib/seed-data";
import type { PortfolioSnapshot, Project } from "@/lib/types";

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  if (!hasDatabase()) {
    return { projects: seedProjects, dataMode: "demo", asOf: reportAsOf };
  }

  try {
    const db = getDb();
    const projectRows = await db.select().from(projects).orderBy(asc(projects.createdAt));

    if (projectRows.length === 0) {
      return { projects: seedProjects, dataMode: "demo", asOf: reportAsOf };
    }

    const assembled = await Promise.all(
      projectRows.map(async (row): Promise<Project> => {
        const [milestoneRows, riskRows, updateRows] = await Promise.all([
          db.select().from(milestones).where(eq(milestones.projectId, row.id)).orderBy(asc(milestones.position)),
          db.select().from(risks).where(eq(risks.projectId, row.id)).orderBy(asc(risks.position)),
          db.select().from(projectUpdates).where(eq(projectUpdates.projectId, row.id)).orderBy(projectUpdates.updateDate),
        ]);

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          shortName: row.shortName,
          code: row.code,
          summary: row.summary,
          progress: row.progress,
          progressLabel: row.progressLabel,
          status: row.status,
          health: row.health as Project["health"],
          priority: row.priority as Project["priority"],
          phase: row.phase,
          owner: row.owner,
          collaborators: row.collaborators,
          targetDate: row.targetDate ?? undefined,
          lastUpdated: row.lastUpdated,
          nextAction: row.nextAction,
          blocker: row.blocker,
          accent: row.accent,
          outcomes: row.outcomes,
          milestones: milestoneRows.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? undefined,
            progress: item.progress,
            status: item.status as Project["milestones"][number]["status"],
            owner: item.owner ?? undefined,
            dueLabel: item.dueLabel ?? undefined,
          })),
          risks: riskRows.map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            severity: item.severity as Project["risks"][number]["severity"],
            mitigation: item.mitigation,
            owner: item.owner,
          })),
          updates: updateRows.map((item) => ({
            id: item.id,
            date: item.updateDate,
            title: item.title,
            body: item.body,
            type: item.type as Project["updates"][number]["type"],
          })),
          sources: row.sources,
        };
      }),
    );

    return { projects: assembled, dataMode: "neon", asOf: reportAsOf };
  } catch (error) {
    console.error("Neon portfolio read failed; showing the reviewed seed snapshot.", error);
    return { projects: seedProjects, dataMode: "demo", asOf: reportAsOf };
  }
}
