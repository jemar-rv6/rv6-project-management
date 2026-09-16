import {
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { ProjectSource } from "@/lib/types";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 220 }).notNull(),
    shortName: varchar("short_name", { length: 120 }).notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    summary: text("summary").notNull(),
    progress: integer("progress").notNull().default(0),
    progressLabel: varchar("progress_label", { length: 80 }).notNull().default("Manual"),
    status: varchar("status", { length: 80 }).notNull().default("Planning"),
    health: varchar("health", { length: 24 }).notNull().default("planning"),
    priority: varchar("priority", { length: 24 }).notNull().default("Medium"),
    phase: varchar("phase", { length: 120 }).notNull().default("Planning"),
    owner: varchar("owner", { length: 160 }).notNull(),
    collaborators: jsonb("collaborators").$type<string[]>().notNull().default([]),
    targetDate: date("target_date"),
    lastUpdated: date("last_updated").notNull(),
    nextAction: text("next_action").notNull(),
    blocker: text("blocker").notNull().default("No active blocker"),
    accent: varchar("accent", { length: 16 }).notNull().default("#e3262e"),
    outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
    sources: jsonb("sources").$type<ProjectSource[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("projects_slug_idx").on(table.slug)],
);

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  progress: integer("progress").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  owner: varchar("owner", { length: 160 }),
  dueLabel: varchar("due_label", { length: 120 }),
  position: integer("position").notNull().default(0),
});

export const risks = pgTable("risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  detail: text("detail").notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("medium"),
  mitigation: text("mitigation").notNull(),
  owner: varchar("owner", { length: 160 }).notNull(),
  position: integer("position").notNull().default(0),
});

export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  updateDate: date("update_date").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 24 }).notNull().default("progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
