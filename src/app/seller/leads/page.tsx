import { requireRole } from "@/lib/auth/requireRole";
import { getLeadPipelineData } from "@/lib/leads/pipeline";
import { LeadPipelineDashboard } from "@/components/leads/LeadPipelineDashboard";

type SearchParams = {
  q?: string;
};

export default async function SellerLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const actor = await requireRole(["seller", "agent"]);
  const params = await searchParams;
  const role = actor.role === "agent" ? "agent" : "seller";
  const q = String(params?.q || "");
  const data = await getLeadPipelineData({ role, userId: actor.userId }, q);

  return (
    <LeadPipelineDashboard
      leads={data.leads}
      title="My Leads"
      subtitle="Manage inquiries assigned to your listings, contact buyers, add notes, and move deals through the pipeline."
      viewerRole={role}
      initialQuery={q}
      supportsNotes={data.supportsNotes}
      supportsFollowUp={data.supportsFollowUp}
      supportsCrmFields={data.supportsCrmFields}
    />
  );
}
