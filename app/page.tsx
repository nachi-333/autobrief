"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function fetchStatus() {
    const res = await fetch("/api/connectors/jira/status");
    setStatus(await res.json());
  }

  async function fetchIssues() {
    const res = await fetch("/api/connectors/jira/issues?limit=30");
    const data = await res.json();
    if (data.ok) setIssues(data.issues);
  }

  async function syncNow() {
    setSyncing(true);
    const res = await fetch("/api/connectors/jira/sync", { method: "POST" });
    const data = await res.json();
    console.log("Sync result", data);
    setSyncing(false);
    fetchIssues();
    fetchStatus();
  }

  useEffect(() => {
    fetchStatus();
    fetchIssues();
  }, []);

  const connect = () => {
    window.location.href = "/api/connectors/jira/oauth/start";
  };

  const grouped = issues.reduce<Record<string, any[]>>((acc, it) => {
    acc[it.state] = acc[it.state] || [];
    acc[it.state].push(it);
    return acc;
  }, {});

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Jira Connector Dashboard</h1>

      <div className="flex gap-4">
        {!status?.connected && (
          <button
            onClick={connect}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Connect Jira
          </button>
        )}
        {status?.connected && (
          <button
            disabled={syncing}
            onClick={syncNow}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Jira"}
          </button>
        )}
        <button
          onClick={fetchIssues}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Refresh Issues
        </button>
      </div>

      <div className="border rounded p-4 bg-white shadow">
        <h2 className="font-semibold mb-2">Connection Status</h2>
        {status?.connected ? (
          <div className="text-sm space-y-1">
            <p>Connected ✅</p>
            <p>Site: {status.siteName}</p>
            <p>Cloud ID: {status.cloudId}</p>
            <p>Scopes: {(status.scopes || []).join(", ")}</p>
            <p>Token Expiry: {new Date(status.expiresAt).toLocaleString()}</p>
          </div>
        ) : (
          <p>Not connected.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Issues</h2>
        {Object.entries(grouped).length === 0 && <p>No issues cached.</p>}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(grouped).map(([state, items]) => (
            <div key={state} className="border rounded p-3 bg-white shadow">
              <h3 className="font-bold mb-2">{state} ({items.length})</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {items.map(it => (
                  <div key={it.issueKey} className="border rounded p-2">
                    <p className="font-medium">{it.issueKey}</p>
                    <p className="text-sm">{it.title}</p>
                    <p className="text-xs text-gray-500">{it.priority} · {it.type}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
