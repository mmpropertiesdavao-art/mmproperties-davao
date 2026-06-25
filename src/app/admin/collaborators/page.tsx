"use client";

import { useEffect, useMemo, useState } from "react";

interface Application {
  id: string;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  phone: string | null;

  requestedRole: "seller" | "agent";
  applicationType: "seller" | "agent" | "collaborator" | string | null;

  businessName: string | null;
  prcLicenseNumber: string | null;
  profession: string | null;
  serviceArea: string | null;

  propertyAddress: string | null;
  propertyType: string | null;
  isPropertyOwner: boolean | null;

  consentConfirmed: boolean;
  message: string | null;
  status: "pending" | "approved" | "rejected" | string;

  source: string | null;
  ghlSentAt: string | null;
  ghlError: string | null;

  createdAt: string;
  reviewedAt: string | null;
}

type Filter = "all" | "seller" | "agent" | "collaborator" | "pending" | "approved" | "rejected";

export default function CollaboratorApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/collaborators", { cache: "no-store" });
      const data = await response.json();

      if (response.ok) {
        setApplications(data);
      } else {
        setError(data.error ?? "Could not load applications.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(applicationId: string, action: "approve" | "reject") {
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} this application?`)) {
      return;
    }

    setWorkingId(applicationId);
    setError(null);

    try {
      const response = await fetch("/api/admin/collaborators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });

      const data = await response.json();

      if (response.ok) {
        await load();
      } else {
        setError(data.error ?? "Review failed.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setWorkingId(null);
    }
  }

  const filtered = useMemo(() => {
    return applications.filter((application) => {
      if (filter === "all") return true;
      if (filter === "pending" || filter === "approved" || filter === "rejected") {
        return application.status === filter;
      }
      return application.applicationType === filter;
    });
  }, [applications, filter]);

  const counts = useMemo(() => {
    return {
      all: applications.length,
      seller: applications.filter((a) => a.applicationType === "seller").length,
      agent: applications.filter((a) => a.applicationType === "agent").length,
      collaborator: applications.filter((a) => a.applicationType === "collaborator").length,
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };
  }, [applications]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Applications</h1>
          <p className="mt-2 text-sm text-navy-500">
            Review seller, agent, and collaborator applications. Approval should only happen after identity and authority are checked.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:border-gold-400"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterButton label="All" value="all" active={filter === "all"} count={counts.all} onClick={setFilter} />
        <FilterButton label="Sellers" value="seller" active={filter === "seller"} count={counts.seller} onClick={setFilter} />
        <FilterButton label="Agents" value="agent" active={filter === "agent"} count={counts.agent} onClick={setFilter} />
        <FilterButton label="Collaborators" value="collaborator" active={filter === "collaborator"} count={counts.collaborator} onClick={setFilter} />
        <FilterButton label="Pending" value="pending" active={filter === "pending"} count={counts.pending} onClick={setFilter} />
        <FilterButton label="Approved" value="approved" active={filter === "approved"} count={counts.approved} onClick={setFilter} />
        <FilterButton label="Rejected" value="rejected" active={filter === "rejected"} count={counts.rejected} onClick={setFilter} />
      </div>

      {loading ? (
        <p className="mt-6 text-navy-500">Loading applications...</p>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed border-navy-200 p-8 text-center text-navy-500">
              No applications found for this filter.
            </p>
          )}

          {filtered.map((application) => (
            <article key={application.id} className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-navy-900">
                      {application.fullName || application.email || "Unnamed applicant"}
                    </h2>
                    <StatusBadge status={application.status} />
                    <TypeBadge type={application.applicationType || application.requestedRole} />
                  </div>

                  <p className="mt-1 text-sm text-navy-500">
                    {application.email || "No email"}
                    {application.phone ? ` · ${application.phone}` : ""}
                  </p>

                  <p className="mt-1 text-xs text-navy-400">
                    Submitted {formatDate(application.createdAt)}
                    {application.source ? ` · Source: ${application.source}` : ""}
                  </p>
                </div>

                <div className="text-right text-xs">
                  {application.ghlSentAt ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
                      GHL sent
                    </span>
                  ) : application.ghlError ? (
                    <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                      GHL failed
                    </span>
                  ) : (
                    <span className="rounded-full bg-navy-50 px-3 py-1 font-semibold text-navy-500">
                      GHL not configured
                    </span>
                  )}
                </div>
              </div>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <Info label="Requested access" value={application.requestedRole} />
                <Info label="Profession" value={application.profession} />
                <Info label="Business" value={application.businessName} />
                <Info label="PRC license" value={application.prcLicenseNumber} />
                <Info label="Service area" value={application.serviceArea} />
                <Info label="Property address" value={application.propertyAddress} />
                <Info label="Property type" value={application.propertyType} />
                <Info label="Property owner" value={application.isPropertyOwner ? "Yes" : application.applicationType === "seller" ? "No" : "—"} />
                <Info label="Consent" value={application.consentConfirmed ? "Confirmed" : "Missing"} />
                <Info label="Account created" value={application.userId ? "Yes" : "No"} />
              </dl>

              {application.message && (
                <p className="mt-5 rounded-md bg-navy-50 p-3 text-sm leading-6 text-navy-700">
                  {application.message}
                </p>
              )}

              {application.ghlError && (
                <p className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
                  GHL error: {application.ghlError}
                </p>
              )}

              {application.status === "pending" && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={workingId !== null}
                    onClick={() => review(application.id, "approve")}
                    className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {workingId === application.id ? "Working..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    disabled={workingId !== null}
                    onClick={() => review(application.id, "reject")}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
                  >
                    Reject
                  </button>

                  {!application.userId && (
                    <p className="self-center text-xs text-navy-400">
                      Approval requires account creation/invite. This will be added next.
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  value,
  active,
  count,
  onClick,
}: {
  label: string;
  value: Filter;
  active: boolean;
  count: number;
  onClick: (value: Filter) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
        active
          ? "border-gold-500 bg-gold-50 text-navy-900"
          : "border-navy-200 bg-white text-navy-600 hover:border-gold-300"
      }`}
    >
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-1 font-medium text-navy-800">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "pending"
      ? "bg-amber-100 text-amber-800"
      : status === "approved"
        ? "bg-green-100 text-green-800"
        : status === "rejected"
          ? "bg-red-100 text-red-700"
          : "bg-navy-100 text-navy-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold capitalize text-navy-600">
      {type}
    </span>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}