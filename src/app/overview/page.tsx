import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/auth/user-display";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const displayName = getDisplayName(data.user);

  return (
    <SidebarNav activeKey="overview" displayName={displayName}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 px-14 py-16 text-center">
          <h1 className="text-5xl font-semibold tracking-tight">
            Prompt Chain Gateway
          </h1>
          <p className="mt-4 text-xl text-zinc-300">
            Start with a chain, then build out steps and test runs.
          </p>
        </div>
      </div>
    </SidebarNav>
  );
}
