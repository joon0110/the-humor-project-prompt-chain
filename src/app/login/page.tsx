import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showDomainError = resolvedSearchParams?.error === "domain";
  const showProfileError = resolvedSearchParams?.error === "profile";
  const showAdminError = resolvedSearchParams?.error === "admin";
  const hasEnv = hasSupabaseEnv();

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 pb-12 pt-6 text-[var(--foreground)]">
      <main className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-5xl font-semibold tracking-tight">
            Humor Project Prompt Chains
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Secure access for The Humor Project prompt chain tooling.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
          {showDomainError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              Please use a @columbia.edu or @barnard.edu Google account.
            </div>
          )}
          {showProfileError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              Your Google account is missing a name or email.
            </div>
          )}
          {showAdminError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              Your account is not authorized for prompt chain access.
            </div>
          )}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-alt)] p-4">
            {hasEnv ? (
              <GoogleSignInButton variant="inline" />
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[var(--warning)]">
                Missing Supabase env vars. Add
                <span className="font-semibold">
                  {" "}
                  NEXT_PUBLIC_SUPABASE_URL{" "}
                </span>
                and
                <span className="font-semibold">
                  {" "}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY{" "}
                </span>
                in <span className="font-semibold">.env.local</span>.
              </div>
            )}
          </div>
          <p>
            Sign in with your @columbia.edu or @barnard.edu Google account.
          </p>
        </section>
      </main>
    </div>
  );
}
