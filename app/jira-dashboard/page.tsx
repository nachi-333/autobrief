"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/cn";

interface Issue {
  issueKey: string;
  title: string;
  state: string;
  priority?: string;
  type?: string;
  assignee?: string;
  labels?: string[];
  updatedAtISO?: string;
  createdAtISO?: string;
}

interface StatusResponse {
  connected: boolean;
  siteName?: string;
  cloudId?: string;
  scopes?: string[];
  expiresAt?: string;
  lastSyncAt?: string;
}

const STATE_ORDER = ["OPEN", "IN_PROGRESS", "DONE", "OTHER"];

// Map internal state → Jira-ish column label & color
const COLUMN_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "TO DO", color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  DONE: { label: "DONE", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  OTHER: { label: "OTHER", color: "text-stone-600", bg: "bg-stone-50 dark:bg-stone-800/40" },
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "bg-red-600",
  High: "bg-red-500",
  Medium: "bg-orange-500",
  Low: "bg-blue-500",
  Lowest: "bg-gray-400",
};

export default function JiraDashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filtered, setFiltered] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [relativeClock, setRelativeClock] = useState<number>(0); // tick to recompute relative times

  // ---- Fetchers ----
  async function fetchStatus() {
    const res = await fetch("/api/connectors/jira/status");
    const data = await res.json();
    setStatus(data);
  }

  async function fetchIssues() {
    setLoadingIssues(true);
    const res = await fetch("/api/connectors/jira/issues?limit=200");
    const data = await res.json();
    if (data.ok) {
      setIssues(data.issues);
      setLoadingIssues(false);
    } else {
      setLoadingIssues(false);
    }
  }

  async function syncNow() {
    if (!status?.connected) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/connectors/jira/sync", { method: "POST" });
      const data = await res.json();
      console.log("Sync result", data);
      await fetchIssues();
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  }

  const connect = () => {
    window.location.href = "/api/connectors/jira/oauth/start";
  };

  // relative clock update every 60s
  useEffect(() => {
    const id = setInterval(() => setRelativeClock(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchIssues();
  }, []);

  // ---- Filtering Logic ----
  useEffect(() => {
    let base = [...issues];
    if (search) {
      const s = search.toLowerCase();
      base = base.filter(
        i =>
          i.issueKey.toLowerCase().includes(s) ||
          i.title.toLowerCase().includes(s) ||
          (i.labels || []).some(l => l.toLowerCase().includes(s))
      );
    }
    if (priorityFilter !== "ALL") {
      base = base.filter(i => (i.priority || "") === priorityFilter);
    }
    if (assigneeFilter !== "ALL") {
      base = base.filter(i => (i.assignee || "") === assigneeFilter);
    }
    setFiltered(base);
  }, [issues, search, priorityFilter, assigneeFilter]);

  // Derive lists
  const assignees = useMemo(
    () => Array.from(new Set(issues.map(i => i.assignee).filter(Boolean))).sort(),
    [issues]
  );
  const priorities = useMemo(
    () =>
      Array.from(new Set(issues.map(i => i.priority).filter(Boolean))).sort((a, b) =>
        (a || "").localeCompare(b || "")
      ),
    [issues]
  );

  // Group by state
  const grouped = useMemo(() => {
    const g: Record<string, Issue[]> = { OPEN: [], IN_PROGRESS: [], DONE: [], OTHER: [] };
    filtered.forEach(i => {
      if (!g[i.state]) g.OTHER.push(i);
      else g[i.state].push(i);
    });
    return g;
  }, [filtered]);

  function relTime(iso?: string) {
    if (!iso) return "";
    const delta = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const lastSync = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : "—";

  // ---- UI components ----
  const StatusPill = ({ connected }: { connected: boolean }) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        connected
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
        )}
      />
      {connected ? "Connected" : "Not Connected"}
    </span>
  );

  const IssueCard = ({ issue }: { issue: Issue }) => {
    const priorityColor = PRIORITY_COLORS[issue.priority || ""] || "bg-gray-400";
    return (
      <button
        onClick={() => setSelectedIssue(issue)}
        className="w-full text-left group rounded-md border border-transparent bg-white dark:bg-neutral-900/70 hover:border-indigo-400/60 hover:shadow transition p-3"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            {issue.issueKey}
          </span>
          {issue.priority && (
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                priorityColor
              )}
              title={issue.priority}
            />
          )}
        </div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-3">
          {issue.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels?.slice(0, 3).map(l => (
            <span
              key={l}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5 text-[10px] font-medium"
            >
              {l}
            </span>
          ))}
          {issue.labels && issue.labels.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
        <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 flex justify-between">
          <span>{issue.assignee || "Unassigned"}</span>
          <span>{relTime(issue.updatedAtISO)}</span>
        </div>
      </button>
    );
  };

  const SkeletonCard = () => (
    <div className="animate-pulse rounded-md bg-white/60 dark:bg-neutral-800 h-28 border border-gray-200 dark:border-neutral-700" />
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Top Bar */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur">
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => (window.location.href = "/connectors")}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            ← Back
          </button>

          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Jira Connector Dashboard
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <StatusPill connected={!!status?.connected} />
            {status?.connected && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
                Last Sync: {lastSync}
              </div>
            )}
            {!status?.connected && (
              <button
                onClick={connect}
                className="rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 font-medium hover:bg-indigo-500"
              >
                Connect Jira
              </button>
            )}
            {status?.connected && (
              <button
                onClick={syncNow}
                disabled={syncing}
                className={cn(
                  "rounded-md bg-emerald-600 text-white text-sm px-3 py-1.5 font-medium hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-2"
                )}
              >
                {syncing && (
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {syncing ? "Syncing..." : "Sync"}
              </button>
            )}
            <button
              onClick={() => {
                fetchStatus();
                fetchIssues();
              }}
              className="rounded-md border border-neutral-300 dark:border-neutral-600 text-sm px-3 py-1.5 font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur">
        <div className="px-4 py-2 flex flex-wrap gap-4 items-center">
          <input
            placeholder="Search issues (key, title, label)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-sm"
          >
            <option value="ALL">All Priorities</option>
            {priorities.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-sm"
          >
            <option value="ALL">All Assignees</option>
            {assignees.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {(priorityFilter !== "ALL" || assigneeFilter !== "ALL" || search) && (
            <button
              onClick={() => {
                setSearch("");
                setPriorityFilter("ALL");
                setAssigneeFilter("ALL");
              }}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <main className="flex-1 overflow-auto px-4 py-6">
        {!status?.connected && (
          <div className="mt-10 text-center text-neutral-500 dark:text-neutral-400">
            Connect Jira to load issues.
          </div>
        )}
        {status?.connected && (
          <div className="grid gap-5 md:grid-cols-4">
            {STATE_ORDER.map(stateKey => {
              const meta = COLUMN_META[stateKey] || COLUMN_META.OTHER;
              const columnIssues = grouped[stateKey] || [];
              return (
                <div
                  key={stateKey}
                  className="flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 backdrop-blur"
                >
                  <div
                    className={cn(
                      "px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between",
                      meta.bg
                    )}
                  >
                    <span className={cn("text-xs font-semibold tracking-wide", meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                      {columnIssues.length}
                    </span>
                  </div>

                  <div className="p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[70vh]">
                    {loadingIssues &&
                      Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    {!loadingIssues && columnIssues.length === 0 && (
                      <div className="text-xs text-neutral-400 text-center py-4">
                        Empty
                      </div>
                    )}
                    {!loadingIssues &&
                      columnIssues.map(issue => (
                        <IssueCard key={issue.issueKey} issue={issue} />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Side Drawer for Selected Issue */}
      {selectedIssue && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedIssue(null)}
          />
          <div className="w-full sm:w-[480px] max-w-full h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  {selectedIssue.issueKey}
                </h2>
                <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {selectedIssue.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {selectedIssue.priority && (
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium text-white",
                      PRIORITY_COLORS[selectedIssue.priority] || "bg-gray-500"
                    )}
                  >
                    {selectedIssue.priority}
                  </span>
                )}
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">
                  {selectedIssue.type || "Issue"}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {COLUMN_META[selectedIssue.state]?.label || selectedIssue.state}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Assignee
                  </p>
                  <p className="font-medium">
                    {selectedIssue.assignee || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Updated
                  </p>
                  <p className="font-medium">
                    {selectedIssue.updatedAtISO
                      ? new Date(selectedIssue.updatedAtISO).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Created
                  </p>
                  <p className="font-medium">
                    {selectedIssue.createdAtISO
                      ? new Date(selectedIssue.createdAtISO).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedIssue.labels && selectedIssue.labels.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                    Labels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedIssue.labels.map(l => (
                      <span
                        key={l}
                        className="px-2 py-1 text-[11px] rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500">
                  (Add description rendering / comments fetch here later.)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
