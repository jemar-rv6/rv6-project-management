"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  LayoutDashboard,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  Target,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import type { PortfolioSnapshot, Project, ProjectHealth, ProjectPriority } from "@/lib/types";

const STORAGE_KEY = "rv6-project-command-v1";

const priorityRank: Record<ProjectPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const healthLabel: Record<ProjectHealth, string> = {
  "on-track": "On track",
  attention: "Needs attention",
  blocked: "Blocked",
  planning: "Planning",
};

function initials(value: string) {
  return value
    .split(/\s|\+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string, compact = false) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", compact
    ? { month: "short", day: "numeric" }
    : { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function accentStyle(accent: string) {
  return { "--project-accent": accent } as CSSProperties;
}

export function Dashboard({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const [projects, setProjects] = useState(snapshot.projects);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ProjectHealth>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBossView, setShowBossView] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (snapshot.dataMode === "demo") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Project[];
          // Restore browser-only demo edits after hydration; server snapshots stay authoritative in Neon mode.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          if (Array.isArray(parsed) && parsed.length) setProjects(parsed);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
    setHydrated(true);
  }, [snapshot.dataMode]);

  useEffect(() => {
    if (hydrated && snapshot.dataMode === "demo") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [hydrated, projects, snapshot.dataMode]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null;
  const overall = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
    : 0;
  const attentionCount = projects.filter((project) => project.health === "attention" || project.health === "blocked").length;
  const totalMilestones = projects.reduce((sum, project) => sum + project.milestones.length, 0);
  const completeMilestones = projects.reduce(
    (sum, project) => sum + project.milestones.filter((milestone) => milestone.status === "complete").length,
    0,
  );

  const focusItems = useMemo(
    () => [...projects].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.progress - b.progress).slice(0, 5),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesFilter = filter === "all" || project.health === filter;
      const matchesQuery = !lowered || [project.name, project.summary, project.owner, project.status, project.phase]
        .join(" ")
        .toLowerCase()
        .includes(lowered);
      return matchesFilter && matchesQuery;
    });
  }, [filter, projects, query]);

  function showToast(message: string) {
    setToast(message);
  }

  async function addProject(input: {
    name: string;
    shortName: string;
    summary: string;
    owner: string;
    progress: number;
    status: string;
    priority: ProjectPriority;
  }) {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Could not create the project.");
    const result = await response.json();
    const created: Project = {
      id: result.id,
      slug: result.slug,
      name: input.name,
      shortName: input.shortName,
      code: "NEW",
      summary: input.summary,
      progress: input.progress,
      progressLabel: result.persisted ? "Manual" : "Local draft",
      status: input.status,
      health: "planning",
      priority: input.priority,
      phase: "Planning",
      owner: input.owner,
      collaborators: [],
      lastUpdated: new Date().toISOString().slice(0, 10),
      nextAction: "Define the first concrete milestone and owner.",
      blocker: "No active blocker",
      accent: "#e3262e",
      outcomes: [],
      milestones: [],
      risks: [],
      updates: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          title: "Project created",
          body: "The project was added to the RV6 portfolio and is ready for planning.",
          type: "progress",
        },
      ],
      sources: [],
    };
    setProjects((current) => [...current, created]);
    setShowAdd(false);
    setSelectedId(created.id);
    showToast(result.persisted ? "Project saved to Neon." : "Project saved to this browser in demo mode.");
  }

  async function updateProject(id: string, changes: Pick<Project, "progress" | "status" | "nextAction" | "blocker">) {
    const original = projects.find((project) => project.id === id);
    if (!original) return;
    const updatedAt = new Date().toISOString().slice(0, 10);
    setProjects((current) => current.map((project) => project.id === id
      ? { ...project, ...changes, progressLabel: snapshot.dataMode === "neon" ? "Manual update" : "Local update", lastUpdated: updatedAt }
      : project));

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error("Update failed");
      const result = await response.json();
      showToast(result.persisted ? "Project update saved to Neon." : "Project update saved locally.");
      setEditProject(null);
    } catch {
      setProjects((current) => current.map((project) => project.id === id ? original : project));
      showToast("The update could not be saved. Your previous values were restored.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Primary navigation">
          <button className="nav-button active" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <LayoutDashboard /> Portfolio <span className="nav-count">{projects.length}</span>
          </button>
          <button className="nav-button" type="button" onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}>
            <FolderKanban /> Projects
          </button>
          <button className="nav-button" type="button" onClick={() => setShowBossView(true)}>
            <BarChart3 /> Boss report
          </button>
        </nav>

        <div className="sidebar-label">ACTIVE PROJECTS</div>
        <div className="sidebar-projects">
          {projects.map((project) => (
            <button key={project.id} className="sidebar-project" type="button" onClick={() => setSelectedId(project.id)}>
              <span className="sidebar-dot" style={{ background: project.accent }} />
              <span className="sidebar-project-name">{project.shortName}</span>
              <span className="sidebar-project-percent">{project.progress}%</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="database-status">
            <span className={`database-dot ${snapshot.dataMode === "neon" ? "live" : ""}`} />
            {snapshot.dataMode === "neon" ? "Neon connected" : "Demo data mode"}
          </div>
          <div className="sidebar-footnote">
            {snapshot.dataMode === "neon"
              ? "Updates persist to the RV6 portfolio database."
              : "Changes persist in this browser until Neon is connected."}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand"><Brand compact /></div>
          <div className="search-wrap">
            <Search />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, owners, status, or phase…"
              aria-label="Search projects"
            />
          </div>
          <div className="top-actions">
            <button className="button secondary" type="button" aria-label="Open boss view" onClick={() => setShowBossView(true)}>
              <Printer /> <span>Boss view</span>
            </button>
            <button className="button primary" type="button" aria-label="Add project" onClick={() => setShowAdd(true)}>
              <Plus /> <span>Add project</span>
            </button>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">RV6 OPERATIONS</div>
              <h1>Project command center</h1>
              <p className="page-subtitle">
                One working view of progress, next actions, approval gates, risks, and the evidence behind every RV6 initiative.
              </p>
            </div>
            <div className="report-date"><CalendarDays /> Baseline reviewed {formatDate(snapshot.asOf)}</div>
          </section>

          <section className="hero-grid">
            <div className="portfolio-card">
              <div>
                <div className="portfolio-kicker">PORTFOLIO STATUS · {projects.length} ACTIVE INITIATIVES</div>
                <h2>The work is moving. Approval and source-data dependencies are now the main constraint.</h2>
                <p>
                  Lead Time and Blog are technically mature. AI Support has a validated foundation. Folder Structure and Website Restructure need coordinated inputs before the broader catalog program can accelerate.
                </p>
                <div className="hero-badges">
                  <span className="hero-badge"><strong>{completeMilestones}</strong> milestones complete</span>
                  <span className="hero-badge"><strong>{attentionCount}</strong> projects need attention</span>
                  <span className="hero-badge"><strong>{snapshot.dataMode === "neon" ? "Live" : "Reviewed"}</strong> data source</span>
                </div>
              </div>
              <ProgressOrbit value={overall} />
            </div>

            <div className="focus-card">
              <div className="section-title-row">
                <h2>Immediate focus</h2>
                <span className="mini-label">NEXT ACTIONS</span>
              </div>
              <div className="focus-list">
                {focusItems.map((project, index) => (
                  <button className="focus-item" key={project.id} type="button" onClick={() => setSelectedId(project.id)} style={{ border: 0, background: "transparent", textAlign: "left", width: "100%" }}>
                    <span className="focus-number">{index + 1}</span>
                    <span>
                      <strong>{project.shortName}</strong>
                      <span>{project.nextAction}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="metric-grid" aria-label="Portfolio metrics">
            <MetricCard icon={<Target />} label="Overall completion" value={`${overall}%`} note="Equal-weight portfolio average" />
            <MetricCard icon={<Activity />} label="Milestones complete" value={`${completeMilestones}/${totalMilestones}`} note="Across all active workstreams" />
            <MetricCard icon={<ShieldAlert />} label="Needs attention" value={String(attentionCount)} note="Blocked or dependency-sensitive" />
            <MetricCard icon={<Users />} label="Core owners" value={String(new Set(projects.map((project) => project.owner)).size)} note="Cross-functional accountability" />
          </section>

          <section className="projects-section" id="projects">
            <div className="section-heading">
              <div>
                <h2>Portfolio</h2>
                <p>Open a project for its full milestone, risk, decision, and source history.</p>
              </div>
              <div className="filters" aria-label="Project filters">
                {(["all", "on-track", "attention", "blocked", "planning"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-chip ${filter === value ? "active" : ""}`}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all" ? "All" : healthLabel[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="project-grid">
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onOpen={() => setSelectedId(project.id)} />
              ))}
              {visibleProjects.length === 0 && (
                <div className="empty-state">
                  <Search size={22} />
                  <h3>No projects match this view</h3>
                  <p>Try another search phrase or clear the health filter.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditProject(selectedProject)}
        />
      )}
      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onSubmit={addProject} />}
      {editProject && (
        <EditProjectModal
          project={projects.find((project) => project.id === editProject.id) ?? editProject}
          onClose={() => setEditProject(null)}
          onSubmit={(changes) => updateProject(editProject.id, changes)}
        />
      )}
      {showBossView && <BossReport projects={projects} overall={overall} asOf={snapshot.asOf} onClose={() => setShowBossView(false)} />}
      {toast && <div className="toast"><CheckCircle2 /> {toast}</div>}
    </div>
  );
}

function ProgressOrbit({ value }: { value: number }) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-orbit" aria-label={`${value}% overall completion`}>
      <svg viewBox="0 0 152 152" aria-hidden="true">
        <circle className="orbit-track" cx="76" cy="76" r={radius} />
        <circle className="orbit-value" cx="76" cy="76" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      </svg>
      <div className="orbit-number"><strong>{value}%</strong><span>OVERALL</span></div>
    </div>
  );
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function MiniRing({ value, accent }: { value: number; accent: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="mini-ring" style={accentStyle(accent)}>
      <svg viewBox="0 0 74 74" aria-hidden="true">
        <circle className="track" cx="37" cy="37" r={radius} />
        <circle className="value" cx="37" cy="37" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      </svg>
      <strong>{value}%</strong>
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <article className="project-card" style={accentStyle(project.accent)}>
      <div className="project-card-main">
        <div className="project-meta">
          <span className="project-code">{project.code}</span>
          <span className={`status-pill ${project.health}`}>{healthLabel[project.health]}</span>
          <span className="project-code">{project.status}</span>
        </div>
        <h3>{project.name}</h3>
        <p className="project-summary">{project.summary}</p>
        <div className="next-action">
          <div className="next-action-label">NEXT ACTION</div>
          <div className="next-action-text">{project.nextAction}</div>
        </div>
        <div className="project-footer">
          <div className="owner-avatars">
            {[project.owner, ...project.collaborators].slice(0, 3).map((person) => <span className="avatar" key={person}>{initials(person)}</span>)}
          </div>
          <span className="owner-label">{project.owner}</span>
          <button type="button" className="open-project" onClick={onOpen}>View details <ArrowRight /></button>
        </div>
      </div>
      <div className="project-card-side">
        <div>
          <MiniRing value={project.progress} accent={project.accent} />
          <div className="progress-caption">{project.progressLabel}</div>
        </div>
        <div className="project-phase">{project.phase}</div>
      </div>
    </article>
  );
}

function ProjectDetail({ project, onClose, onEdit }: { project: Project; onClose: () => void; onEdit: () => void }) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="project-drawer" style={accentStyle(project.accent)} aria-label={`${project.name} details`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span className="drawer-accent" />
            <span><strong>{project.shortName}</strong><span>Updated {formatDate(project.lastUpdated)}</span></span>
          </div>
          <div className="drawer-actions">
            <button className="button ghost" type="button" onClick={onEdit}><Pencil /> Update</button>
            <button className="close-button" type="button" onClick={onClose} aria-label="Close project details"><X /></button>
          </div>
        </div>

        <div className="drawer-content">
          <div className="detail-hero">
            <div className="detail-hero-top">
              <div>
                <div className="project-code">{project.code} · {project.status}</div>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
              </div>
              <div className="big-percent">{project.progress}<span>%</span></div>
            </div>
            <div className="detail-progress"><span style={{ width: `${project.progress}%` }} /></div>
          </div>

          <div className="detail-facts">
            <div className="detail-fact"><span>OWNER</span><strong>{project.owner}</strong></div>
            <div className="detail-fact"><span>PHASE</span><strong>{project.phase}</strong></div>
            <div className="detail-fact"><span>PRIORITY</span><strong>{project.priority}</strong></div>
          </div>

          <section className="detail-card">
            <div className="section-title-row"><h3>Executive snapshot</h3><span className={`status-pill ${project.health}`}>{healthLabel[project.health]}</span></div>
            <div className="action-grid">
              <div className="action-box"><span>NEXT ACTION</span><p>{project.nextAction}</p></div>
              <div className="action-box alert"><span>ACTIVE BLOCKER</span><p>{project.blocker}</p></div>
            </div>
          </section>

          <section className="detail-card">
            <div className="section-title-row"><h3>Milestone plan</h3><span className="mini-label">{project.milestones.length} ITEMS</span></div>
            <p className="detail-card-sub">Completion is based on the full outcome, not only the technical build.</p>
            <div className="milestone-list">
              {project.milestones.length ? project.milestones.map((milestone) => (
                <div className="milestone-row" key={milestone.id}>
                  <span className={`milestone-state ${milestone.status}`}>
                    {milestone.status === "complete" ? <Check /> : milestone.status === "in-progress" ? <CircleDashed /> : milestone.status === "blocked" ? <X /> : null}
                  </span>
                  <span className="milestone-copy">
                    <strong>{milestone.title}</strong>
                    <span>{[milestone.owner, milestone.dueLabel].filter(Boolean).join(" · ") || "Owner to be assigned"}</span>
                    <span className="micro-bar"><span style={{ width: `${milestone.progress}%` }} /></span>
                  </span>
                  <span className="milestone-percent">{milestone.progress}%</span>
                </div>
              )) : <div className="empty-state"><Target size={20} /><h3>No milestones yet</h3><p>Add the first milestone during planning.</p></div>}
            </div>
          </section>

          <section className="detail-card">
            <div className="section-title-row"><h3>Risks & controls</h3><span className="mini-label">ACTIVE</span></div>
            <div className="risk-list">
              {project.risks.length ? project.risks.map((risk) => (
                <div className="risk-item" key={risk.id}>
                  <div className="risk-top"><strong>{risk.title}</strong><span className={`severity ${risk.severity}`}>{risk.severity}</span></div>
                  <p>{risk.detail}</p>
                  <div className="risk-mitigation"><b>Control:</b> {risk.mitigation} · <b>Owner:</b> {risk.owner}</div>
                </div>
              )) : <p className="detail-card-sub">No risks have been recorded yet.</p>}
            </div>
          </section>

          <section className="detail-card">
            <div className="section-title-row"><h3>Recent decisions & updates</h3><span className="mini-label">TIMELINE</span></div>
            <div className="timeline">
              {[...project.updates].sort((a, b) => b.date.localeCompare(a.date)).map((update) => (
                <div className="timeline-item" key={update.id}>
                  <span className="timeline-date">{formatDate(update.date, true)}</span>
                  <span className="timeline-copy"><strong>{update.title}</strong><p>{update.body}</p></span>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-card">
            <div className="section-title-row"><h3>Source record</h3><span className="mini-label">TRACEABILITY</span></div>
            <p className="detail-card-sub">Status was consolidated from these HQ and implementation tasks.</p>
            <div className="source-list">
              {project.sources.length ? project.sources.map((source) => (
                <span className="source-chip" key={source.threadId}><b>{source.kind}</b>{source.label}</span>
              )) : <span className="source-chip"><b>NEW</b> Manual project</span>}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function AddProjectModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (input: { name: string; shortName: string; summary: string; owner: string; progress: number; status: string; priority: ProjectPriority }) => Promise<void>;
}) {
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name: String(data.get("name")),
        shortName: String(data.get("shortName")),
        summary: String(data.get("summary")),
        owner: String(data.get("owner")),
        progress,
        status: String(data.get("status")),
        priority: String(data.get("priority")) as ProjectPriority,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the project.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div><h2>Add a future RV6 project</h2><p>Start with the executive-level facts. Milestones, risks, and updates can be added as the work becomes clear.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close add project"><X /></button>
        </div>
        <div className="form-grid">
          <div className="field full"><label htmlFor="name">PROJECT NAME</label><input id="name" name="name" required minLength={3} placeholder="e.g. RV6 Marketing Analytics Dashboard" /></div>
          <div className="field"><label htmlFor="shortName">SHORT NAME</label><input id="shortName" name="shortName" required placeholder="Marketing Dashboard" /></div>
          <div className="field"><label htmlFor="owner">OWNER</label><input id="owner" name="owner" required placeholder="Jemar + Orlando" /></div>
          <div className="field"><label htmlFor="status">CURRENT STATUS</label><input id="status" name="status" defaultValue="Planning" required /></div>
          <div className="field"><label htmlFor="priority">PRIORITY</label><select id="priority" name="priority" defaultValue="Medium"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
          <div className="field full"><label htmlFor="summary">EXECUTIVE SUMMARY</label><textarea id="summary" name="summary" required minLength={8} placeholder="What outcome does this project need to produce?" /></div>
          <div className="field full">
            <label htmlFor="progress">STARTING COMPLETION</label>
            <div className="range-row"><input id="progress" type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /><span className="range-value">{progress}%</span></div>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} type="submit"><Plus /> {saving ? "Adding…" : "Add project"}</button></div>
      </form>
    </div>
  );
}

function EditProjectModal({ project, onClose, onSubmit }: {
  project: Project;
  onClose: () => void;
  onSubmit: (changes: Pick<Project, "progress" | "status" | "nextAction" | "blocker">) => Promise<void>;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    await onSubmit({
      progress,
      status: String(data.get("status")),
      nextAction: String(data.get("nextAction")),
      blocker: String(data.get("blocker")),
    });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div><h2>Update {project.shortName}</h2><p>Keep the percentage defensible by updating the next action and blocker at the same time.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close project update"><X /></button>
        </div>
        <div className="form-grid">
          <div className="field full"><label htmlFor="edit-status">CURRENT STATUS</label><input id="edit-status" name="status" defaultValue={project.status} required /></div>
          <div className="field full"><label htmlFor="edit-next">NEXT ACTION</label><textarea id="edit-next" name="nextAction" defaultValue={project.nextAction} required /></div>
          <div className="field full"><label htmlFor="edit-blocker">ACTIVE BLOCKER</label><textarea id="edit-blocker" name="blocker" defaultValue={project.blocker} /></div>
          <div className="field full"><label htmlFor="edit-progress">OVERALL COMPLETION</label><div className="range-row"><input id="edit-progress" type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /><span className="range-value">{progress}%</span></div></div>
        </div>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} type="submit"><Check /> {saving ? "Saving…" : "Save update"}</button></div>
      </form>
    </div>
  );
}

function BossReport({ projects, overall, asOf, onClose }: { projects: Project[]; overall: number; asOf: string; onClose: () => void }) {
  const keyBlockers = projects.filter((project) => project.health === "blocked" || project.health === "attention");
  return (
    <div className="modal-backdrop">
      <div className="modal large">
        <div className="modal-header">
          <div><h2>Boss-ready portfolio brief</h2><p>Prepared from the latest reviewed HQ and implementation-task context.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close boss report"><X /></button>
        </div>
        <div className="boss-report">
          <div className="boss-top">
            <div><div className="eyebrow">RV6 PROJECT PORTFOLIO · {formatDate(asOf)}</div><h2>Current delivery position</h2></div>
            <div className="boss-overall"><strong>{overall}%</strong><span>OVERALL COMPLETION</span></div>
          </div>
          <table className="boss-table">
            <thead><tr><th>Project</th><th>Progress</th><th>Status</th><th>Immediate next action</th></tr></thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td data-label="Project">{project.name}<br /><span style={{ color: "#a1a1aa", fontWeight: 500 }}>{project.owner}</span></td>
                  <td data-label="Progress"><div className="boss-progress"><strong>{project.progress}%</strong><div className="micro-bar"><span style={{ width: `${project.progress}%`, background: project.accent }} /></div></div></td>
                  <td data-label="Status"><span className={`status-pill ${project.health}`}>{project.status}</span></td>
                  <td data-label="Immediate next action">{project.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="boss-callout"><strong>Leadership attention requested</strong><p>{keyBlockers.map((project) => `${project.shortName}: ${project.blocker}`).join("  •  ")}</p></div>
        </div>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Close</button><button className="button primary" type="button" onClick={() => window.print()}><Printer /> Print / Save PDF</button></div>
      </div>
    </div>
  );
}
