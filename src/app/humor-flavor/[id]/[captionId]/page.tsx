import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/auth/user-display";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

type CaptionDetailPageProps = {
  params: Promise<{ id: string; captionId: string }>;
};

type CaptionRow = {
  id: string;
  content: string | null;
  created_datetime_utc?: string | null;
  humor_flavor_id: number | null;
  caption_request_id: number | null;
  images?: { url: string | null; image_description: string | null } | null;
};

type ResponseRow = {
  id: string;
  llm_model_response: string | null;
  llm_temperature: number | null;
  processing_time_seconds: number | null;
  llm_model_id: number;
  humor_flavor_step_id: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  created_datetime_utc?: string | null;
  llm_models?: { name: string; provider_model_id: string } | null;
  humor_flavor_steps?: { order_by: number | null; description: string | null } | null;
};

function formatTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CaptionDetailPage({
  params,
}: CaptionDetailPageProps) {
  const resolvedParams = await params;
  const flavorId = Number(resolvedParams.id);
  const captionId = resolvedParams.captionId;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const displayName = getDisplayName(data.user);

  let caption: CaptionRow | null = null;
  let captionError: string | null = null;
  let responses: ResponseRow[] = [];
  let responseError: string | null = null;

  if (!Number.isFinite(flavorId)) {
    captionError = "Invalid humor flavor id.";
  } else {
    const { data: captionRow, error } = await supabase
      .from("captions")
      .select(
        [
          "id",
          "content",
          "created_datetime_utc",
          "humor_flavor_id",
          "caption_request_id",
          "images(url,image_description)",
        ].join(",")
      )
      .eq("id", captionId)
      .eq("humor_flavor_id", flavorId)
      .single<CaptionRow>();

    if (error) {
      captionError = error.message;
    } else {
      caption = captionRow;
      if (caption.caption_request_id) {
        const { data: responseRows, error: responsesErr } = await supabase
          .from("llm_model_responses")
          .select(
            [
              "id",
              "llm_model_response",
              "llm_temperature",
              "processing_time_seconds",
              "llm_model_id",
              "humor_flavor_step_id",
              "llm_system_prompt",
              "llm_user_prompt",
              "created_datetime_utc",
              "llm_models(name,provider_model_id)",
              "humor_flavor_steps(order_by,description)",
            ].join(",")
          )
          .eq("caption_request_id", caption.caption_request_id)
          .order("created_datetime_utc", { ascending: true })
          .returns<ResponseRow[]>();

        if (responsesErr) {
          responseError = responsesErr.message;
        } else {
          responses = responseRows ?? [];
        }
      }
    }
  }

  return (
    <SidebarNav activeKey="humor-flavor" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Caption Details
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Review the caption and per-step LLM responses.
          </p>
        </header>

        {captionError ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-[var(--danger)]">
            {captionError}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                    Caption
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Caption #{caption?.id ?? captionId}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Created {formatTimestamp(caption?.created_datetime_utc)}
                  </p>
                </div>
                <a
                  href={`/humor-flavor/${flavorId}`}
                  className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
                >
                  Back to flavor
                </a>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--background)]">
                  {caption?.images?.url ? (
                    <img
                      src={caption.images.url}
                      alt={caption.images.image_description ?? "Caption image"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-[var(--muted)]">
                      No image available
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)]">
                  {caption?.content ?? "Untitled caption"}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                LLM Responses
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                Responses by step
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Includes model, temperature, processing time, and prompts.
              </p>

              {responseError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
                  {responseError}
                </div>
              )}

              {responses.length === 0 && !responseError && (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                  No LLM responses found for this caption.
                </div>
              )}

              <div className="mt-6 space-y-4">
                {responses.map((response, index) => (
                  <div
                    key={response.id ?? `${response.humor_flavor_step_id}-${index}`}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          Step{" "}
                          {response.humor_flavor_steps?.order_by ??
                            response.humor_flavor_step_id ??
                            index + 1}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                          {response.llm_models?.name ?? "LLM Model"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {response.llm_models?.provider_model_id ??
                            response.llm_model_id}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatTimestamp(response.created_datetime_utc)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-[var(--muted)] md:grid-cols-3">
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          Temperature
                        </div>
                        <div className="mt-1 text-sm text-[var(--foreground)]">
                          {response.llm_temperature ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          Processing time
                        </div>
                        <div className="mt-1 text-sm text-[var(--foreground)]">
                          {response.processing_time_seconds ?? "-"}s
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          Step description
                        </div>
                        <div className="mt-1 text-sm text-[var(--foreground)]">
                          {response.humor_flavor_steps?.description ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          System prompt
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                          {response.llm_system_prompt ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                          User prompt
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                          {response.llm_user_prompt ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                        Model response
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                        {response.llm_model_response ?? "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </SidebarNav>
  );
}
