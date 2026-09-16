export type ProjectHealth = "on-track" | "attention" | "blocked" | "planning";
export type ProjectPriority = "Critical" | "High" | "Medium" | "Low";
export type MilestoneStatus = "complete" | "in-progress" | "pending" | "blocked" | "deferred";

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  progress: number;
  status: MilestoneStatus;
  owner?: string;
  dueLabel?: string;
}

export interface ProjectRisk {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
  owner: string;
}

export interface ProjectUpdate {
  id: string;
  date: string;
  title: string;
  body: string;
  type: "progress" | "decision" | "blocker" | "approval";
}

export interface ProjectSource {
  label: string;
  kind: "HQ" | "Work";
  threadId: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  code: string;
  summary: string;
  progress: number;
  progressLabel: string;
  status: string;
  health: ProjectHealth;
  priority: ProjectPriority;
  phase: string;
  owner: string;
  collaborators: string[];
  targetDate?: string;
  lastUpdated: string;
  nextAction: string;
  blocker: string;
  accent: string;
  outcomes: string[];
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  updates: ProjectUpdate[];
  sources: ProjectSource[];
}

export interface PortfolioSnapshot {
  projects: Project[];
  dataMode: "neon" | "demo";
  asOf: string;
}
