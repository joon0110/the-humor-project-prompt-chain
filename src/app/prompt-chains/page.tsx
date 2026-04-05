import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/auth/user-display";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function PromptChainsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const displayName = getDisplayName(data.user);

  return (
    <SidebarNav activeKey="prompt-chains" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Prompt Chains
          </h1>
          <p className="text-sm text-zinc-400">
            Manage, version, and review prompt chains for experiments.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300">
          Add your prompt chain management UI here.
        </section>
      </div>
    </SidebarNav>
  );
}
