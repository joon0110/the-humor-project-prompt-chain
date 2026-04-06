import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/auth/user-display";
import SidebarNav from "@/app/components/SidebarNav";
import FlavorDetail from "@/app/humor-flavor/FlavorDetail";

export const dynamic = "force-dynamic";

type HumorFlavorDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HumorFlavorDetailPage({
  params,
}: HumorFlavorDetailPageProps) {
  const resolvedParams = await params;
  const flavorId = Number(resolvedParams.id);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const displayName = getDisplayName(data.user);

  return (
    <SidebarNav activeKey="humor-flavor" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Flavor Steps
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Manage steps, run tests, and review captions for this flavor.
          </p>
        </header>

        {!Number.isFinite(flavorId) ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-[var(--danger)]">
            Invalid humor flavor id.
          </section>
        ) : (
          <FlavorDetail flavorId={flavorId} />
        )}
      </div>
    </SidebarNav>
  );
}
