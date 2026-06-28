"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { AnalysisResult, FormAnswers, GuideType, PhotoMeta, ViewType } from "@/lib/assessment";
import {
  ASSESSMENT_STORAGE_KEY,
  EMPTY_FORM_ANSWERS,
  MAX_FILE_SIZE_MB,
  MAX_SUPPLEMENTARY,
  TRIAD_SLOTS,
} from "@/lib/assessment";

/** One captured photo: the file, its meta (tier/type), and a preview URL. */
export type PhotoEntry = {
  file: File;
  meta: PhotoMeta;
  preview: string;
};

type AssessmentState = {
  /** Triad photos keyed by view type; a slot is empty until filled. */
  triad: Partial<Record<ViewType, PhotoEntry>>;
  /** Optional supplementary photos, in capture order. */
  supplementary: PhotoEntry[];
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
  selectedPhotoIndex: number;
  form: FormAnswers;
};

type AssessmentContextValue = AssessmentState & {
  /** True once the client has mounted and rehydrated from sessionStorage. */
  hydrated: boolean;
  /** Ordered list of every photo (triad first, then supplementary). */
  allPhotos: PhotoEntry[];
  /** True when all three triad slots are filled (required to submit). */
  triadComplete: boolean;
  setTriadPhoto: (view: ViewType, file: File | null) => void;
  addSupplementary: (type: GuideType, file: File | null) => void;
  removeSupplementary: (index: number) => void;
  clearEvaluation: () => void;
  selectPhotoIndex: (index: number) => void;
  setError: (value: string | null) => void;
  runAnalysis: () => Promise<AnalysisResult | null>;
  setFormField: (field: "phone" | "address" | "feedback", value: string) => void;
  setFormLocation: (location: { latitude: number; longitude: number; address: string }) => void;
  setFormQuestion: (questionId: string, value: string) => void;
};

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

// Hydration-safe "has the client mounted?" signal. The server snapshot is
// false and the client snapshot is true, so storage-derived UI can be gated
// without a setState-in-effect.
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

type StoredState = Pick<AssessmentState, "result" | "error" | "selectedPhotoIndex" | "form">;

const EMPTY_STORED_STATE: StoredState = {
  result: null,
  error: null,
  selectedPhotoIndex: 0,
  form: EMPTY_FORM_ANSWERS,
};

function readStoredState(): StoredState {
  if (typeof window === "undefined") {
    return EMPTY_STORED_STATE;
  }

  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_STORAGE_KEY);
    if (!raw) {
      return EMPTY_STORED_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      result: parsed.result ?? null,
      error: typeof parsed.error === "string" ? parsed.error : null,
      selectedPhotoIndex: typeof parsed.selectedPhotoIndex === "number" ? parsed.selectedPhotoIndex : 0,
      form: parsed.form ?? EMPTY_FORM_ANSWERS,
    };
  } catch {
    return EMPTY_STORED_STATE;
  }
}

function isAcceptableImage(file: File): boolean {
  return file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
}

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [triad, setTriad] = useState<Partial<Record<ViewType, PhotoEntry>>>({});
  const [supplementary, setSupplementary] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(false);
  // Lazy initializers read sessionStorage exactly once on the client (and
  // return empty on the server). Consumers that render storage-derived UI gate
  // on `hydrated` so the first client paint matches the server HTML.
  const [result, setResult] = useState<AnalysisResult | null>(() => readStoredState().result);
  const [error, setError] = useState<string | null>(() => readStoredState().error);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(() => readStoredState().selectedPhotoIndex);
  const [form, setForm] = useState<FormAnswers>(() => readStoredState().form);
  const hydrated = useHydrated();
  const inFlightRef = useRef<Promise<AnalysisResult | null> | null>(null);

  const setFormField = useCallback((field: "phone" | "address" | "feedback", value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const setFormLocation = useCallback((location: { latitude: number; longitude: number; address: string }) => {
    setForm((current) => ({ ...current, ...location }));
  }, []);

  const setFormQuestion = useCallback((questionId: string, value: string) => {
    setForm((current) => ({ ...current, questions: { ...current.questions, [questionId]: value } }));
  }, []);

  // Revoke every object URL on unmount. Mutating callbacks revoke replaced/
  // removed previews individually as they go.
  const allPhotos = useMemo<PhotoEntry[]>(() => {
    const triadEntries = TRIAD_SLOTS.flatMap((slot) => {
      const entry = triad[slot.type];
      return entry ? [entry] : [];
    });
    return [...triadEntries, ...supplementary];
  }, [triad, supplementary]);

  const allPhotosRef = useRef(allPhotos);
  useEffect(() => {
    allPhotosRef.current = allPhotos;
  }, [allPhotos]);
  useEffect(() => {
    return () => {
      allPhotosRef.current.forEach((entry) => URL.revokeObjectURL(entry.preview));
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Cache the citizen's form answers alongside the result so they survive a
    // refresh. Phone, the pinned location (lat/lng + geocoded address), and the
    // questionnaire all live here; only the questionnaire answers are sent to
    // the LLM (see runAnalysis). Location is persisted to the incident on save.
    window.sessionStorage.setItem(
      ASSESSMENT_STORAGE_KEY,
      JSON.stringify({
        result,
        error,
        selectedPhotoIndex,
        form,
      })
    );
  }, [error, form, result, selectedPhotoIndex]);

  const clearPhotos = useCallback(() => {
    setTriad((current) => {
      Object.values(current).forEach((entry) => entry && URL.revokeObjectURL(entry.preview));
      return {};
    });
    setSupplementary((current) => {
      current.forEach((entry) => URL.revokeObjectURL(entry.preview));
      return [];
    });
    setSelectedPhotoIndex(0);
  }, []);

  // Sets (or clears, when file is null) the photo for a triad slot. Replacing a
  // slot revokes the old preview.
  const setTriadPhoto = useCallback((view: ViewType, file: File | null) => {
    if (file && !isAcceptableImage(file)) {
      setError(`La imagen debe ser válida y pesar menos de ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setError(null);
    setResult(null);
    setSelectedPhotoIndex(0);
    setTriad((current) => {
      const previous = current[view];
      if (previous) URL.revokeObjectURL(previous.preview);
      const next = { ...current };
      if (file) {
        next[view] = { file, meta: { tier: "triad", type: view }, preview: URL.createObjectURL(file) };
      } else {
        delete next[view];
      }
      return next;
    });
  }, []);

  const addSupplementary = useCallback((type: GuideType, file: File | null) => {
    if (!file) return;
    if (!isAcceptableImage(file)) {
      setError(`La imagen debe ser válida y pesar menos de ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setError(null);
    setResult(null);
    setSupplementary((current) => {
      if (current.length >= MAX_SUPPLEMENTARY) return current;
      return [
        ...current,
        { file, meta: { tier: "supplementary", type }, preview: URL.createObjectURL(file) },
      ];
    });
  }, []);

  const removeSupplementary = useCallback((index: number) => {
    setSupplementary((current) =>
      current.filter((entry, currentIndex) => {
        if (currentIndex === index) URL.revokeObjectURL(entry.preview);
        return currentIndex !== index;
      }),
    );
    setSelectedPhotoIndex((current) => (current > 0 ? current - 1 : 0));
  }, []);

  const clearEvaluation = useCallback(() => {
    clearPhotos();
    setResult(null);
    setError(null);
    setLoading(false);
    setForm(EMPTY_FORM_ANSWERS);
    inFlightRef.current = null;
  }, [clearPhotos]);

  const triadComplete = useMemo(
    () => TRIAD_SLOTS.every((slot) => Boolean(triad[slot.type])),
    [triad],
  );

  const runAnalysis = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (!triadComplete) {
      setError("Sube las tres vistas requeridas antes de analizar.");
      return null;
    }

    const photos = allPhotos;

    const request = (async () => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        photos.forEach((entry) => formData.append("fotos", entry.file));
        formData.append("photo_meta", JSON.stringify(photos.map((entry) => entry.meta)));
        // Only the questionnaire answers go to the LLM (no phone/address).
        formData.append("form", JSON.stringify({ questions: form.questions }));

        const response = await fetch("/api/analizar", { method: "POST", body: formData });
        const payload = await response.json();

        if (!response.ok) {
          setError(typeof payload?.error === "string" ? payload.error : "Error al analizar. Intente de nuevo.");
          setResult(null);
          return null;
        }

        const data = payload as AnalysisResult;
        setSelectedPhotoIndex(0);
        setResult(data);
        return data;
      } catch {
        setError("Error al analizar. Intente de nuevo.");
        setResult(null);
        return null;
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [allPhotos, form, triadComplete]);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      triad,
      supplementary,
      allPhotos,
      triadComplete,
      loading,
      result,
      error,
      selectedPhotoIndex,
      form,
      hydrated,
      setTriadPhoto,
      addSupplementary,
      removeSupplementary,
      clearEvaluation,
      selectPhotoIndex: setSelectedPhotoIndex,
      setError,
      runAnalysis,
      setFormField,
      setFormLocation,
      setFormQuestion,
    }),
    [
      addSupplementary,
      allPhotos,
      clearEvaluation,
      error,
      form,
      hydrated,
      loading,
      removeSupplementary,
      result,
      runAnalysis,
      selectedPhotoIndex,
      setFormField,
      setFormLocation,
      setFormQuestion,
      setTriadPhoto,
      supplementary,
      triad,
      triadComplete,
    ]
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const context = useContext(AssessmentContext);

  if (!context) {
    throw new Error("useAssessment must be used within AssessmentProvider");
  }

  return context;
}
