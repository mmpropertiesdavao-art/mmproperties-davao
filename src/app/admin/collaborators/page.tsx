"use client";

import { useEffect, useState } from "react";

interface Application {
  id: string; email: string; fullName: string | null; phone: string | null;
  requestedRole: "seller" | "agent"; businessName: string | null;
  prcLicenseNumber: string | null; message: string | null;
  profession:string|null;serviceArea:string|null;consentConfirmed:boolean;
  status: "pending" | "approved" | "rejected"; createdAt: string;
}

export default function CollaboratorApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/collaborators", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setApplications(data); else setError(data.error ?? "Could not load applications.");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function review(applicationId: string, action: "approve" | "reject") {
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} this application?`)) return;
    setWorkingId(applicationId); setError(null);
    const response = await fetch("/api/admin/collaborators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, action }) });
    const data = await response.json();
    if (response.ok) await load(); else setError(data.error ?? "Review failed.");
    setWorkingId(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-navy-900">Collaborator applications</h1>
      <p className="mt-2 text-sm text-navy-500">Approving an application unlocks seller or agent listing tools. Review identity and authority before approval.</p>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-6 text-navy-500">Loading applications...</p> : (
        <div className="mt-6 space-y-4">
          {applications.length === 0 && <p className="rounded-lg border border-dashed border-navy-200 p-8 text-center text-navy-500">No applications yet.</p>}
          {applications.map((application) => (
            <article key={application.id} className="rounded-xl border border-navy-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-navy-900">{application.fullName || application.email}</h2><p className="text-sm text-navy-500">{application.email}{application.phone ? ` · ${application.phone}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${application.status === "pending" ? "bg-amber-100 text-amber-800" : application.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{application.status}</span></div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-5"><div><dt className="text-navy-400">Profession</dt><dd className="font-medium capitalize">{application.profession||application.requestedRole}</dd></div><div><dt className="text-navy-400">Access</dt><dd>{application.requestedRole}</dd></div><div><dt className="text-navy-400">Business</dt><dd>{application.businessName || "—"}</dd></div><div><dt className="text-navy-400">PRC license</dt><dd>{application.prcLicenseNumber || "—"}</dd></div><div><dt className="text-navy-400">Service area</dt><dd>{application.serviceArea||"—"}</dd></div></dl>
              {application.message && <p className="mt-4 rounded-md bg-navy-50 p-3 text-sm text-navy-700">{application.message}</p>}
              {application.status === "pending" && <div className="mt-4 flex gap-3"><button disabled={workingId !== null} onClick={() => review(application.id, "approve")} className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Approve</button><button disabled={workingId !== null} onClick={() => review(application.id, "reject")} className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40">Reject</button></div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
