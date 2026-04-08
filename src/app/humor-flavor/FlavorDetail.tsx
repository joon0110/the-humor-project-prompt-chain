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

type HumorFlavorStep = {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_temperature: number | null;
  llm_model_id: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
};

type LlmModel = {
  id: number;
  name: string;
  provider_model_id: string;
  is_temperature_supported: boolean | null;
};

type LlmType = {
  id: number;
  slug: string;
  description: string;
};

type StepType = {
  id: number;
  slug: string;
  description: string;
};

type ImageRecord = {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
  is_public: boolean | null;
};

type CaptionRecord = {
  id: string;
  content: string | null;
  created_datetime_utc?: string | null;
  images?:
    | { url: string | null; image_description: string | null }
    | Array<{ url: string | null; image_description: string | null }>
    | null;
};

type TestRun = {
  imageId: string;
  captions: Array<{ id: string; content: string | null }>;
  error?: string | null;
};

type StepFormState = {
  orderBy: string;
  description: string;
  stepTypeId: string;
  modelId: string;
  inputTypeId: string;
  outputTypeId: string;
  temperature: string;
  systemPrompt: string;
  userPrompt: string;
};

type DuplicateFlavorFormState = {
  slug: string;
  description: string;
};

type FlavorSlugRecord = {
  slug: string | null;
};

type DuplicateStepRecord = {
  order_by: number;
  description: string | null;
  llm_temperature: number | null;
  llm_model_id: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_HUMOR_API_URL ?? "https://api.almostcrackd.ai";

function normalizeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

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

function resolveCaptionImage(
  images:
    | { url: string | null; image_description: string | null }
    | Array<{ url: string | null; image_description: string | null }>
    | null
    | undefined
) {
  if (!images) return null;
  return Array.isArray(images) ? images[0] ?? null : images;
}

function extractJokesFromContent(content: string | null) {
  if (!content) return [] as string[];
  const trimmed = content.trim();
  if (!trimmed) return [] as string[];
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item.text === "string") return item.text.trim();
            return "";
          })
          .filter(Boolean);
      }
      if (parsed && typeof parsed === "object") {
        const jokes: string[] = [];
        const finalJoke = parsed.final_joke ?? parsed.finalJoke ?? parsed.joke;
        if (typeof finalJoke === "string") jokes.push(finalJoke.trim());
        if (finalJoke && typeof finalJoke.text === "string") {
          jokes.push(finalJoke.text.trim());
        }
        const backup = parsed.backup_jokes ?? parsed.backupJokes ?? parsed.jokes;
        if (Array.isArray(backup)) {
          backup.forEach((item) => {
            if (typeof item === "string") jokes.push(item.trim());
            if (item && typeof item.text === "string") {
              jokes.push(item.text.trim());
            }
          });
        }
        const captions = parsed.captions ?? parsed.outputs;
        if (Array.isArray(captions)) {
          captions.forEach((item) => {
            if (typeof item === "string") jokes.push(item.trim());
            if (item && typeof item.text === "string") {
              jokes.push(item.text.trim());
            }
          });
        }
        if (jokes.length > 0) {
          return jokes.filter(Boolean);
        }
        if (typeof parsed.text === "string") {
          return [parsed.text.trim()].filter(Boolean);
        }
      }
    } catch {
      // fall back to raw content
    }
  }
  return [content];
}

function buildUniqueCopyFlavorSlug(sourceSlug: string, existingSlugs: string[]) {
  const copyBase = `${sourceSlug}-copy`;
  const normalized = new Set(
    existingSlugs
      .map((slug) => slug.trim().toLowerCase())
      .filter((slug) => slug.length > 0)
  );

  let candidate = copyBase;
  let suffix = 2;
  while (normalized.has(candidate.toLowerCase())) {
    candidate = `${copyBase}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export default function FlavorDetail({ flavorId }: { flavorId: number }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [flavorError, setFlavorError] = useState<string | null>(null);
  const [duplicateForm, setDuplicateForm] = useState<DuplicateFlavorFormState>(
    {
      slug: "",
      description: "",
    }
  );
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDuplicatingFlavor, setIsDuplicatingFlavor] = useState(false);

  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [stepForm, setStepForm] = useState<StepFormState>({
    orderBy: "",
    description: "",
    stepTypeId: "",
    modelId: "",
    inputTypeId: "",
    outputTypeId: "",
    temperature: "",
    systemPrompt: "",
    userPrompt: "",
  });
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isStepBusy, setIsStepBusy] = useState(false);

  const [models, setModels] = useState<LlmModel[]>([]);
  const [inputTypes, setInputTypes] = useState<LlmType[]>([]);
  const [outputTypes, setOutputTypes] = useState<LlmType[]>([]);
  const [stepTypes, setStepTypes] = useState<StepType[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [captions, setCaptions] = useState<CaptionRecord[]>([]);
  const [captionsError, setCaptionsError] = useState<string | null>(null);
  const [isCaptionsLoading, setIsCaptionsLoading] = useState(false);

  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const sortedSteps = [...steps].sort((a, b) => a.order_by - b.order_by);

  useEffect(() => {
    void loadFlavor();
    void loadLookups();
    void loadSteps();
    void loadCaptions();
  }, [flavorId]);

  useEffect(() => {
    if (editingStepId) return;
    const maxOrder = steps.reduce(
      (max, step) => Math.max(max, step.order_by ?? 0),
      0
    );
    setStepForm((prev) => ({ ...prev, orderBy: String(maxOrder + 1) }));
  }, [steps, editingStepId]);

  async function loadFlavor() {
    setFlavorError(null);
    const { data, error } = await supabase
      .from("humor_flavors")
      .select("id,slug,description,created_datetime_utc")
      .eq("id", flavorId)
      .single();
    if (error) {
      setFlavorError(error.message);
      return;
    }
    startTransition(() => {
      setFlavor((data as HumorFlavor) ?? null);
    });
  }

  async function loadAllFlavorSlugs() {
    const { data, error } = await supabase
      .from("humor_flavors")
      .select("slug")
      .returns<FlavorSlugRecord[]>();
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? [])
      .map((item) => item.slug?.trim() ?? "")
      .filter((slug) => slug.length > 0);
  }

  async function handleOpenDuplicateModal() {
    if (!flavor) {
      setFlavorError("Flavor details are still loading. Try again.");
      return;
    }

    const sourceSlug = flavor.slug.trim();
    const defaultSlug = `${sourceSlug}-copy`;
    setDuplicateError(null);
    setDuplicateForm({
      slug: defaultSlug,
      description: flavor.description ?? "",
    });
    setIsDuplicateModalOpen(true);

    try {
      const allSlugs = await loadAllFlavorSlugs();
      const suggestedSlug = buildUniqueCopyFlavorSlug(sourceSlug, allSlugs);
      setDuplicateForm((prev) =>
        prev.slug.trim().toLowerCase() === defaultSlug.toLowerCase()
          ? { ...prev, slug: suggestedSlug }
          : prev
      );
    } catch {
      // Keep the default copy name if uniqueness lookup fails.
    }
  }

  async function handleDuplicateFlavor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDuplicateError(null);

    const slug = duplicateForm.slug.trim();
    if (!slug) {
      setDuplicateError("Flavor name is required.");
      return;
    }

    setIsDuplicatingFlavor(true);
    let newFlavorId: number | null = null;

    try {
      const allSlugs = await loadAllFlavorSlugs();
      const normalizedSlug = slug.toLowerCase();
      if (allSlugs.some((item) => item.toLowerCase() === normalizedSlug)) {
        setDuplicateError("Flavor name must be unique. Choose another name.");
        return;
      }

      const { data: newFlavor, error: newFlavorError } = await supabase
        .from("humor_flavors")
        .insert({
          slug,
          description: duplicateForm.description.trim() || null,
        })
        .select("id")
        .single();
      if (newFlavorError || !newFlavor?.id) {
        throw new Error(newFlavorError?.message ?? "Failed to create flavor.");
      }

      newFlavorId = newFlavor.id;

      const { data: sourceSteps, error: sourceStepsError } = await supabase
        .from("humor_flavor_steps")
        .select(
          [
            "order_by",
            "description",
            "llm_temperature",
            "llm_model_id",
            "llm_input_type_id",
            "llm_output_type_id",
            "humor_flavor_step_type_id",
            "llm_system_prompt",
            "llm_user_prompt",
          ].join(",")
        )
        .eq("humor_flavor_id", flavorId)
        .order("order_by")
        .returns<DuplicateStepRecord[]>();
      if (sourceStepsError) {
        throw new Error(sourceStepsError.message);
      }

      const copiedSteps =
        sourceSteps?.map((step) => ({
          humor_flavor_id: newFlavor.id,
          order_by: step.order_by,
          description: step.description,
          llm_temperature: step.llm_temperature,
          llm_model_id: step.llm_model_id,
          llm_input_type_id: step.llm_input_type_id,
          llm_output_type_id: step.llm_output_type_id,
          humor_flavor_step_type_id: step.humor_flavor_step_type_id,
          llm_system_prompt: step.llm_system_prompt,
          llm_user_prompt: step.llm_user_prompt,
        })) ?? [];

      if (copiedSteps.length > 0) {
        const { error: copyStepsError } = await supabase
          .from("humor_flavor_steps")
          .insert(copiedSteps);
        if (copyStepsError) {
          throw new Error(copyStepsError.message);
        }
      }

      setIsDuplicateModalOpen(false);
      router.push(`/humor-flavor/${newFlavor.id}`);
    } catch (error) {
      if (newFlavorId !== null) {
        await supabase
          .from("humor_flavor_steps")
          .delete()
          .eq("humor_flavor_id", newFlavorId);
        await supabase.from("humor_flavors").delete().eq("id", newFlavorId);
      }
      const message =
        error instanceof Error ? error.message : "Failed to duplicate flavor.";
      setDuplicateError(message);
    } finally {
      setIsDuplicatingFlavor(false);
    }
  }

  async function loadLookups() {
    setLookupError(null);
    const [
      modelResult,
      inputResult,
      outputResult,
      stepTypeResult,
      imageResult,
    ] = await Promise.all([
      supabase
        .from("llm_models")
        .select("id,name,provider_model_id,is_temperature_supported")
        .order("name"),
      supabase
        .from("llm_input_types")
        .select("id,slug,description")
        .order("id"),
      supabase
        .from("llm_output_types")
        .select("id,slug,description")
        .order("id"),
      supabase
        .from("humor_flavor_step_types")
        .select("id,slug,description")
        .order("id"),
      supabase
        .from("images")
        .select("id,url,image_description,is_common_use,is_public")
        .order("created_datetime_utc", { ascending: false })
        .limit(18),
    ]);

    if (
      modelResult.error ||
      inputResult.error ||
      outputResult.error ||
      stepTypeResult.error ||
      imageResult.error
    ) {
      setLookupError(
        modelResult.error?.message ??
          inputResult.error?.message ??
          outputResult.error?.message ??
          stepTypeResult.error?.message ??
          imageResult.error?.message ??
          "Failed to load lookup tables."
      );
    }

    startTransition(() => {
      setModels((modelResult.data as LlmModel[]) ?? []);
      setInputTypes((inputResult.data as LlmType[]) ?? []);
      setOutputTypes((outputResult.data as LlmType[]) ?? []);
      setStepTypes((stepTypeResult.data as StepType[]) ?? []);
      setImages((imageResult.data as ImageRecord[]) ?? []);
    });
  }

  async function loadSteps() {
    setStepError(null);
    const { data, error } = await supabase
      .from("humor_flavor_steps")
      .select(
        [
          "id",
          "humor_flavor_id",
          "order_by",
          "description",
          "llm_temperature",
          "llm_model_id",
          "llm_input_type_id",
          "llm_output_type_id",
          "humor_flavor_step_type_id",
          "llm_system_prompt",
          "llm_user_prompt",
        ].join(",")
      )
      .eq("humor_flavor_id", flavorId)
      .order("order_by")
      .returns<HumorFlavorStep[]>();
    if (error) {
      setStepError(error.message);
      return;
    }
    startTransition(() => {
      setSteps(data ?? []);
    });
  }

  async function loadCaptions() {
    setCaptionsError(null);
    setIsCaptionsLoading(true);
    const { data, error } = await supabase
      .from("captions")
      .select("id,content,created_datetime_utc,images(url,image_description)")
      .eq("humor_flavor_id", flavorId)
      .order("created_datetime_utc", { ascending: false })
      .limit(24)
      .returns<CaptionRecord[]>();
    setIsCaptionsLoading(false);
    if (error) {
      setCaptionsError(error.message);
      return;
    }
    startTransition(() => {
      setCaptions(data ?? []);
    });
  }

  async function handleSaveStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStepNotice(null);
    setStepError(null);

    const stepTypeId = normalizeNumber(stepForm.stepTypeId);
    const modelId = normalizeNumber(stepForm.modelId);
    const inputTypeId = normalizeNumber(stepForm.inputTypeId);
    const outputTypeId = normalizeNumber(stepForm.outputTypeId);
    if (
      stepTypeId === null ||
      modelId === null ||
      inputTypeId === null ||
      outputTypeId === null
    ) {
      setStepError("Step type, model, input, and output are required.");
      return;
    }

    const orderByValue = normalizeNumber(stepForm.orderBy);
    const fallbackOrder =
      sortedSteps.reduce((max, step) => Math.max(max, step.order_by), 0) + 1;
    const orderBy = orderByValue ?? fallbackOrder;
    const temperature =
      stepForm.temperature.trim() === ""
        ? null
        : normalizeNumber(stepForm.temperature.trim());

    setIsStepBusy(true);

    if (editingStepId) {
      const { error } = await supabase
        .from("humor_flavor_steps")
        .update({
          order_by: orderBy,
          description: stepForm.description.trim() || null,
          llm_temperature: temperature,
          llm_model_id: modelId,
          llm_input_type_id: inputTypeId,
          llm_output_type_id: outputTypeId,
          humor_flavor_step_type_id: stepTypeId,
          llm_system_prompt: stepForm.systemPrompt.trim() || null,
          llm_user_prompt: stepForm.userPrompt.trim() || null,
        })
        .eq("id", editingStepId);
      setIsStepBusy(false);
      if (error) {
        setStepError(error.message);
        return;
      }
      setStepNotice("Step updated.");
    } else {
      const { error } = await supabase.from("humor_flavor_steps").insert({
        humor_flavor_id: flavorId,
        order_by: orderBy,
        description: stepForm.description.trim() || null,
        llm_temperature: temperature,
        llm_model_id: modelId,
        llm_input_type_id: inputTypeId,
        llm_output_type_id: outputTypeId,
        humor_flavor_step_type_id: stepTypeId,
        llm_system_prompt: stepForm.systemPrompt.trim() || null,
        llm_user_prompt: stepForm.userPrompt.trim() || null,
      });
      setIsStepBusy(false);
      if (error) {
        setStepError(error.message);
        return;
      }
      setStepNotice("Step created.");
    }

    setEditingStepId(null);
    setStepForm((prev) => ({
      ...prev,
      orderBy: "",
      description: "",
      systemPrompt: "",
      userPrompt: "",
      temperature: "",
    }));
    await loadSteps();
  }

  async function handleDeleteStep(stepId: number) {
    setStepNotice(null);
    setStepError(null);
    if (!window.confirm("Delete this step?")) {
      return;
    }
    setIsStepBusy(true);
    const { error } = await supabase
      .from("humor_flavor_steps")
      .delete()
      .eq("id", stepId);
    setIsStepBusy(false);
    if (error) {
      setStepError(error.message);
      return;
    }
    setStepNotice("Step deleted.");
    if (editingStepId === stepId) {
      setEditingStepId(null);
      setStepForm((prev) => ({
        ...prev,
        orderBy: "",
        description: "",
        systemPrompt: "",
        userPrompt: "",
        temperature: "",
      }));
    }
    await loadSteps();
  }

  async function handleReorderStep(stepId: number, direction: "up" | "down") {
    setStepNotice(null);
    setStepError(null);
    const index = sortedSteps.findIndex((step) => step.id === stepId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedSteps.length) return;

    const current = sortedSteps[index];
    const target = sortedSteps[targetIndex];

    setIsStepBusy(true);
    const { error: currentError } = await supabase
      .from("humor_flavor_steps")
      .update({ order_by: target.order_by })
      .eq("id", current.id);
    const { error: targetError } = await supabase
      .from("humor_flavor_steps")
      .update({ order_by: current.order_by })
      .eq("id", target.id);
    setIsStepBusy(false);

    if (currentError || targetError) {
      setStepError(currentError?.message ?? targetError?.message ?? "Failed.");
      return;
    }
    setStepNotice("Step order updated.");
    await loadSteps();
  }

  function handleEditStep(step: HumorFlavorStep) {
    setEditingStepId(step.id);
    setStepForm({
      orderBy: String(step.order_by ?? ""),
      description: step.description ?? "",
      stepTypeId: String(step.humor_flavor_step_type_id ?? ""),
      modelId: String(step.llm_model_id ?? ""),
      inputTypeId: String(step.llm_input_type_id ?? ""),
      outputTypeId: String(step.llm_output_type_id ?? ""),
      temperature:
        step.llm_temperature === null || step.llm_temperature === undefined
          ? ""
          : String(step.llm_temperature),
      systemPrompt: step.llm_system_prompt ?? "",
      userPrompt: step.llm_user_prompt ?? "",
    });
    setStepNotice(null);
    setStepError(null);
  }

  async function fetchAccessToken(): Promise<string> {
    const response = await fetch("/api/auth/jwt");
    if (!response.ok) {
      throw new Error("Please log in to request a JWT.");
    }
    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) {
      throw new Error("JWT not available. Try logging in again.");
    }
    return data.accessToken;
  }

  async function handleRunTestSet() {
    if (selectedImageIds.length === 0) {
      setTestError("Select at least one test image.");
      return;
    }
    setTestError(null);
    setIsTesting(true);
    setTestRuns([]);
    setTestProgress({ current: 0, total: selectedImageIds.length });
    try {
      const token = await fetchAccessToken();
      const runs: TestRun[] = [];
      for (let index = 0; index < selectedImageIds.length; index += 1) {
        const imageId = selectedImageIds[index];
        setTestProgress({ current: index + 1, total: selectedImageIds.length });
        try {
          const response = await fetch(
            `${API_BASE_URL}/pipeline/generate-captions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageId,
                humor_flavor_id: flavorId,
                humorFlavorId: flavorId,
              }),
            }
          );
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const data = (await response.json()) as Array<{
            id: string;
            content: string | null;
          }>;
          runs.push({ imageId, captions: data });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unexpected error";
          runs.push({ imageId, captions: [], error: message });
        }
        setTestRuns([...runs]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      setTestError(message);
    } finally {
      setIsTesting(false);
      setTestProgress(null);
      await loadCaptions();
    }
  }

  const stepTypeLabel = (id: number) =>
    stepTypes.find((item) => item.id === id)?.slug ?? String(id);
  const modelLabel = (id: number) =>
    models.find((item) => item.id === id)?.name ?? String(id);
  const inputLabel = (id: number) =>
    inputTypes.find((item) => item.id === id)?.slug ?? String(id);
  const outputLabel = (id: number) =>
    outputTypes.find((item) => item.id === id)?.slug ?? String(id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
              Humor Flavor
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              {flavor?.slug ?? `Flavor ${flavorId}`}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {flavor?.description ?? "Manage steps and test runs."}
            </p>
            <div className="mt-4 grid gap-3 text-xs text-[var(--muted)] md:grid-cols-4">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                  Flavor
                </div>
                <div className="mt-1 text-sm text-[var(--foreground)]">
                  {flavor?.slug ?? "-"}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                  Flavor ID
                </div>
                <div className="mt-1 text-sm text-[var(--foreground)]">
                  {flavor?.id ?? flavorId}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                  Created
                </div>
                <div className="mt-1 text-sm text-[var(--foreground)]">
                  {formatTimestamp(flavor?.created_datetime_utc)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                  Steps
                </div>
                <div className="mt-1 text-sm text-[var(--foreground)]">
                  {steps.length}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDuplicateModal}
              className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => router.push("/humor-flavor")}
              className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
            >
              Back to flavors
            </button>
          </div>
        </div>

        {flavorError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
            {flavorError}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="min-w-0 overflow-x-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                Steps
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                Ordered steps for this flavor
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Reorder steps to control the prompt chain flow.
              </p>
            </div>
          </div>

          {stepError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              {stepError}
            </div>
          )}
          {stepNotice && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-[var(--success)]">
              {stepNotice}
            </div>
          )}

          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-2">
            {sortedSteps.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                No steps yet for this flavor.
              </div>
            )}
            {sortedSteps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                      Step {step.order_by ?? index + 1}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                      {stepTypeLabel(step.humor_flavor_step_type_id)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorderStep(step.id, "up")}
                      disabled={isStepBusy}
                      className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-3 py-1 text-[11px] text-[var(--foreground)] disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderStep(step.id, "down")}
                      disabled={isStepBusy}
                      className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-3 py-1 text-[11px] text-[var(--foreground)] disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditStep(step)}
                      className="rounded-full border border-[var(--card-border)] bg-transparent px-3 py-1 text-[11px] text-[var(--muted)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(step.id)}
                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--muted)]">
                  <div className="flex items-center justify-between">
                    <span>Model</span>
                    <span className="text-[var(--foreground)]">
                      {modelLabel(step.llm_model_id)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Input</span>
                    <span className="text-[var(--foreground)]">
                      {inputLabel(step.llm_input_type_id)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Output</span>
                    <span className="text-[var(--foreground)]">
                      {outputLabel(step.llm_output_type_id)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Temperature</span>
                    <span className="text-[var(--foreground)]">
                      {step.llm_temperature ?? "-"}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                      System prompt
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-[var(--foreground)]">
                      {step.llm_system_prompt ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                      User prompt
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-[var(--foreground)]">
                      {step.llm_user_prompt ?? "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                Step Editor
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                {editingStepId ? "Update step" : "Create a new step"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Choose LLM model, input and output types, and prompts.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSaveStep}>
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Step type
                <select
                  value={stepForm.stepTypeId}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      stepTypeId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Select a step type</option>
                  {stepTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.slug} - {type.description}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                LLM model
                <select
                  value={stepForm.modelId}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      modelId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Select a model</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider_model_id})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Input type
                <select
                  value={stepForm.inputTypeId}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      inputTypeId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Select input type</option>
                  {inputTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.slug} - {type.description}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Output type
                <select
                  value={stepForm.outputTypeId}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      outputTypeId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Select output type</option>
                  {outputTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.slug} - {type.description}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Step order
                <input
                  value={stepForm.orderBy}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      orderBy: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="1"
                />
              </label>
            </div>

            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
              Description
              <input
                value={stepForm.description}
                onChange={(event) =>
                  setStepForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Explain the desired output."
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                System prompt
                <textarea
                  value={stepForm.systemPrompt}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      systemPrompt: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="System instruction for the LLM."
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                User prompt
                <textarea
                  value={stepForm.userPrompt}
                  onChange={(event) =>
                    setStepForm((prev) => ({
                      ...prev,
                      userPrompt: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="User instruction for the LLM."
                />
              </label>
            </div>

            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
              Temperature
              <input
                value={stepForm.temperature}
                onChange={(event) =>
                  setStepForm((prev) => ({
                    ...prev,
                    temperature: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="0.7"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isStepBusy}
                className="rounded-full border border-[var(--card-border-strong)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] disabled:opacity-60"
              >
                {editingStepId ? "Update step" : "Create step"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStepId(null);
                  setStepForm((prev) => ({
                    ...prev,
                    orderBy: "",
                    description: "",
                    temperature: "",
                    systemPrompt: "",
                    userPrompt: "",
                  }));
                }}
                className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
              >
                Clear
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                Test Set
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                Generate captions from images
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Uses the REST API to run the selected humor flavor.
              </p>
              <div className="mt-2 text-xs text-[var(--muted)]">
                API: {API_BASE_URL}
              </div>
            </div>
          </div>

          {lookupError && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[var(--warning)]">
              {lookupError}
            </div>
          )}

          {testError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              {testError}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {images.map((image) => {
              const isSelected = selectedImageIds.includes(image.id);
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => {
                    setSelectedImageIds((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== image.id)
                        : [...prev, image.id]
                    );
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-[var(--accent-strong)] bg-[var(--card-alt)]"
                      : "border-[var(--card-border)] bg-[var(--background)] hover:bg-[var(--card)]"
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.image_description ?? "Test image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                        No image
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunTestSet}
              disabled={isTesting}
              className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
            >
              {isTesting ? "Running..." : "Run test set"}
            </button>
            {testProgress && (
              <div className="text-xs text-[var(--muted)]">
                Running {testProgress.current} of {testProgress.total}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedImageIds([])}
              className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
            >
              Clear selection
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {testRuns.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                Test run results will appear here.
              </div>
            )}
            {testRuns.map((run) => (
              <div
                key={run.imageId}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                  Image {run.imageId}
                </div>
                {run.error ? (
                  <div className="mt-2 text-sm text-[var(--danger)]">
                    {run.error}
                  </div>
                ) : run.captions.length === 0 ? (
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    No captions returned.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                    {run.captions.flatMap((caption) => {
                      const jokes = extractJokesFromContent(caption.content);
                      if (jokes.length === 0) {
                        return (
                          <div
                            key={`${caption.id}-empty`}
                            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3"
                          >
                            Untitled caption
                          </div>
                        );
                      }
                      return jokes.map((joke, index) => (
                        <div
                          key={`${caption.id}-${index}`}
                          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3"
                        >
                          {joke}
                        </div>
                      ));
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                Captions
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                Recent captions for this flavor
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Preview captions stored in Supabase for this flavor.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCaptions}
              className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]"
            >
              Refresh
            </button>
          </div>

          {captionsError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
              {captionsError}
            </div>
          )}

          {isCaptionsLoading && (
            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
              Loading captions...
            </div>
          )}

          {!isCaptionsLoading && captions.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
              No captions stored for this flavor yet.
            </div>
          )}

          <div className="mt-4 space-y-3">
            {captions.map((caption) => (
              <div
                key={caption.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/humor-flavor/${flavorId}/${caption.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    router.push(`/humor-flavor/${flavorId}/${caption.id}`);
                  }
                }}
                className="cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4 transition hover:bg-[var(--card)]"
              >
                <div className="flex items-start gap-3">
                  {(() => {
                    const image = resolveCaptionImage(caption.images);
                    return (
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                        {image?.url ? (
                          <img
                            src={image.url}
                            alt={image.image_description ?? "Caption image"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                            -
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <div className="text-sm text-[var(--foreground)]">
                      {caption.content ?? "Untitled caption"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {formatTimestamp(caption.created_datetime_utc)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isDuplicateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={() => {
            if (!isDuplicatingFlavor) {
              setIsDuplicateModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
                  Duplicate Flavor
                </div>
                <h3 className="mt-2 text-2xl font-semibold">
                  Create a copied flavor
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Copies this flavor and all of its steps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                disabled={isDuplicatingFlavor}
                className="rounded-full border border-[var(--card-border)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] disabled:opacity-60"
              >
                Close
              </button>
            </div>

            {duplicateError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--danger)]">
                {duplicateError}
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleDuplicateFlavor}>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Flavor name
                <input
                  value={duplicateForm.slug}
                  onChange={(event) =>
                    setDuplicateForm((prev) => ({
                      ...prev,
                      slug: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="original-flavor-copy"
                />
              </label>

              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                Description
                <textarea
                  value={duplicateForm.description}
                  onChange={(event) =>
                    setDuplicateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="Description for the copied flavor"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isDuplicatingFlavor}
                  className="rounded-full border border-[var(--card-border-strong)] bg-[var(--card-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] disabled:opacity-60"
                >
                  {isDuplicatingFlavor ? "Duplicating..." : "Duplicate flavor"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  disabled={isDuplicatingFlavor}
                  className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
