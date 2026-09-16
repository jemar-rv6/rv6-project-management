import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { milestones, projectUpdates, projects, risks } from "../src/db/schema";
import { seedProjects } from "../src/lib/seed-data";

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL before seeding.");

const db = drizzle({ client: neon(connectionString) });

async function seed() {
  for (const project of seedProjects) {
  const [created] = await db
    .insert(projects)
    .values({
      slug: project.slug,
      name: project.name,
      shortName: project.shortName,
      code: project.code,
      summary: project.summary,
      progress: project.progress,
      progressLabel: project.progressLabel,
      status: project.status,
      health: project.health,
      priority: project.priority,
      phase: project.phase,
      owner: project.owner,
      collaborators: project.collaborators,
      targetDate: project.targetDate,
      lastUpdated: project.lastUpdated,
      nextAction: project.nextAction,
      blocker: project.blocker,
      accent: project.accent,
      outcomes: project.outcomes,
      sources: project.sources,
    })
    .onConflictDoUpdate({
      target: projects.slug,
      set: {
        name: project.name,
        shortName: project.shortName,
        code: project.code,
        summary: project.summary,
        progress: project.progress,
        progressLabel: project.progressLabel,
        status: project.status,
        health: project.health,
        priority: project.priority,
        phase: project.phase,
        owner: project.owner,
        collaborators: project.collaborators,
        lastUpdated: project.lastUpdated,
        nextAction: project.nextAction,
        blocker: project.blocker,
        accent: project.accent,
        outcomes: project.outcomes,
        sources: project.sources,
        updatedAt: new Date(),
      },
    })
    .returning({ id: projects.id });

  await db.delete(milestones).where(eq(milestones.projectId, created.id));
  await db.delete(risks).where(eq(risks.projectId, created.id));
  await db.delete(projectUpdates).where(eq(projectUpdates.projectId, created.id));

  if (project.milestones.length) {
    await db.insert(milestones).values(project.milestones.map((item, position) => ({
      projectId: created.id,
      title: item.title,
      description: item.description,
      progress: item.progress,
      status: item.status,
      owner: item.owner,
      dueLabel: item.dueLabel,
      position,
    })));
  }

  if (project.risks.length) {
    await db.insert(risks).values(project.risks.map((item, position) => ({
      projectId: created.id,
      title: item.title,
      detail: item.detail,
      severity: item.severity,
      mitigation: item.mitigation,
      owner: item.owner,
      position,
    })));
  }

  if (project.updates.length) {
    await db.insert(projectUpdates).values(project.updates.map((item) => ({
      projectId: created.id,
      updateDate: item.date,
      title: item.title,
      body: item.body,
      type: item.type,
    })));
  }
  }

  console.log(`Seeded ${seedProjects.length} RV6 projects.`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
