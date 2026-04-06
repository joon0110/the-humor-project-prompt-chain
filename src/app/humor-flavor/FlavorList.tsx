"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HumorFlavor = {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc?: string | null;
};

export default function FlavorList() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [formState, setFormState] = useState({ slug: "", description: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void refreshFlavors();
  }, []);

  async function refreshFlavors() {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("humor_flavors")
      .select("id,slug,description,created_datetime_utc")
      .order("slug");
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    startTransition(() => {
      setFlavors((data as HumorFlavor[]) ?? []);
    });
  }

  async function handleCreateFlavor() {
    setNotice(null);
    setError(null);
    const slug = formState.slug.trim();
    if (!slug) {
      setError("Slug is required for a humor flavor.");
      return;
    }
    setIsBusy(true);
    const { data, error: createError } = await supabase
      .from("humor_flavors")
      .insert({
        slug,
        description: formState.description.trim() || null,
      })
      .select("id")
      .single();
    setIsBusy(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setNotice("Flavor created.");
    setFormState({ slug, description: formState.description.trim() });
    await refreshFlavors();
    if (data?.id) {
      setSelectedFlavorId(data.id);
    }
  }

  async function handleSubmitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formMode === "edit") {
      await handleUpdateFlavor();
    } else {
      await handleCreateFlavor();
    }
  }

  async function handleUpdateFlavor() {
    if (!selectedFlavorId) {
      setError("Select a flavor to update.");
      return;
    }
    setNotice(null);
    setError(null);
    const slug = formState.slug.trim();
    if (!slug) {
      setError("Slug is required for a humor flavor.");
      return;
    }
    setIsBusy(true);
    const { error: updateError } = await supabase
      .from("humor_flavors")
      .update({
        slug,
        description: formState.description.trim() || null,
      })
      .eq("id", selectedFlavorId);
    setIsBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotice("Flavor updated.");
    await refreshFlavors();
  }

  async function handleDeleteFlavor(flavorId: number) {
    setNotice(null);
    setError(null);
    if (
      !window.confirm(
        "Delete this humor flavor? This will not delete its steps."
      )
    ) {
      return;
    }
    setIsBusy(true);
    const { error: deleteError } = await supabase
      .from("humor_flavors")
      .delete()
      .eq("id", flavorId);
    setIsBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setNotice("Flavor deleted.");
    if (selectedFlavorId === flavorId) {
      setSelectedFlavorId(null);
      setFormState({ slug: "", description: "" });
    }
    await refreshFlavors();
  }

  function handleSelectFlavor(flavor: HumorFlavor) {
    setSelectedFlavorId(flavor.id);
    setFormState({
      slug: flavor.slug ?? "",
      description: flavor.description ?? "",
    });
    setNotice(null);
    setError(null);
  }

  const filteredFlavors = flavors.filter((flavor) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      String(flavor.id).includes(query) ||
      flavor.slug.toLowerCase().includes(query) ||
      (flavor.description ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
            Humor Flavors
          </div>
          <h2 className="mt-2 text-2xl font-semibold">
            Create and manage flavor definitions
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click a flavor to open its steps and testing workspace.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-[var(--card-border)] bg-[var(--background)] py-2 pl-11 pr-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Search flavors"
              />
            </div>
            <div className="hidden md:block" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFormMode("create");
              setFormState({ slug: "", description: "" });
              setSelectedFlavorId(null);
              setNotice(null);
              setError(null);
              setIsFormOpen(true);
            }}
            className="rounded-full border border-[var(--card-border-strong)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
          >
            Create flavor
          </button>
          <button
            type="button"
            onClick={refreshFlavors}
            className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-[var(--success)]">
          {notice}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)]">
        <div className="grid grid-cols-[0.6fr_1.3fr_1.6fr_0.8fr] gap-4 border-b border-[var(--card-border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
          <span>ID</span>
          <span>Slug</span>
          <span>Description</span>
          <span>Actions</span>
        </div>
        <div className="max-h-[420px] divide-y divide-[var(--card-border)] overflow-y-auto">
          {filteredFlavors.length === 0 && (
            <div className="px-4 py-5 text-sm text-[var(--muted)]">
              {flavors.length === 0
                ? "No humor flavors yet."
                : "No flavors match your search."}
            </div>
          )}
          {filteredFlavors.map((flavor) => {
            const isActive = flavor.id === selectedFlavorId;
            return (
              <div
                key={flavor.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/humor-flavor/${flavor.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    router.push(`/humor-flavor/${flavor.id}`);
                  }
                }}
                className={`grid cursor-pointer grid-cols-[0.6fr_1.3fr_1.6fr_0.8fr] items-center gap-4 px-4 py-4 text-sm transition ${
                  isActive
                    ? "bg-[var(--card-alt)]"
                    : "hover:bg-[var(--card)]"
                }`}
              >
                <span className="text-[var(--muted)]">{flavor.id}</span>
                <span className="text-left text-sm font-semibold text-[var(--foreground)]">
                  {flavor.slug}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {flavor.description ?? "-"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectFlavor(flavor);
                      setFormMode("edit");
                      setIsFormOpen(true);
                    }}
                    className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-1 text-[11px] text-[var(--foreground)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteFlavor(flavor.id);
                    }}
                    className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-[var(--danger)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                  {formMode === "create" ? "Create Flavor" : "Edit Flavor"}
                </div>
                <h3 className="mt-2 text-2xl font-semibold">
                  {formMode === "create"
                    ? "Add a new humor flavor"
                    : "Update this humor flavor"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
              >
                Close
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-[var(--success)]">
                {notice}
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleSubmitForm}>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Flavor
                <input
                  value={formState.slug}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      slug: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="humor-flavor"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Description
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="Description for the flavor"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                {formMode === "create" ? (
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="rounded-full border border-[var(--card-border-strong)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] disabled:opacity-60"
                  >
                    Create flavor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpdateFlavor}
                    disabled={isBusy || !selectedFlavorId}
                    className="rounded-full border border-[var(--card-border-strong)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] disabled:opacity-60"
                  >
                    Update flavor
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFormState({ slug: "", description: "" });
                    setSelectedFlavorId(null);
                    setNotice(null);
                    setError(null);
                    setFormMode("create");
                  }}
                  className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
