import { requireRole } from "@/lib/auth/requireRole";
import { getLeadPipelineData } from "@/lib/leads/pipeline";
import { LeadPipelineDashboard } from "@/components/leads/LeadPipelineDashboard";

type SearchParams = {
  q?: string;
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const actor = await requireRole(["admin"]);
  const params = await searchParams;
  const q = String(params?.q || "");
  const data = await getLeadPipelineData({ role: "admin", userId: actor.userId }, q);

  return (
    <LeadPipelineDashboard
      leads={data.leads}
      title="Inquiries & Leads"
      subtitle="Compact CRM-ready view for all buyer inquiries, seller activity, and future GHL/HubSpot sync."
      viewerRole="admin"
      initialQuery={q}
      supportsNotes={data.supportsNotes}
      supportsFollowUp={data.supportsFollowUp}
      supportsCrmFields={data.supportsCrmFields}
    />
  );
}
