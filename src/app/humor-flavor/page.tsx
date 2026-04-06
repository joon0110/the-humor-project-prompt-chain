import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/auth/user-display";
import SidebarNav from "@/app/components/SidebarNav";
import FlavorList from "@/app/humor-flavor/FlavorList";

export const dynamic = "force-dynamic";

export default async function HumorFlavorPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const displayName = getDisplayName(data.user);

  return (
    <SidebarNav activeKey="humor-flavor" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Humor Flavor Prompt Chains
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Create flavors, then open a flavor to manage steps and tests.
          </p>
        </header>

        <FlavorList />
      </div>
    </SidebarNav>
  );
}
