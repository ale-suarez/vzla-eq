"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { AnalysisResult, FormAnswers } from "@/lib/assessment";
import { ASSESSMENT_STORAGE_KEY, EMPTY_FORM_ANSWERS, MAX_FILE_SIZE_MB, MAX_PHOTOS } from "@/lib/assessment";

type AssessmentState = {
  photos: File[];
  previews: string[];
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
  selectedPhotoIndex: number;
  form: FormAnswers;
};

type AssessmentContextValue = AssessmentState & {
  /** True once the client has mounted and rehydrated from sessionStorage. */
  hydrated: boolean;
  addPhotos: (files: FileList | File[] | null) => void;
  removePhoto: (index: number) => void;
  clearEvaluation: () => void;
  selectPhotoIndex: (index: number) => void;
  setError: (value: string | null) => void;
  runAnalysis: () => Promise<AnalysisResult | null>;
  setFormField: (field: "phone" | "address", value: string) => void;
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

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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

  const setFormField = useCallback((field: "phone" | "address", value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const setFormQuestion = useCallback((questionId: string, value: string) => {
    setForm((current) => ({ ...current, questions: { ...current.questions, [questionId]: value } }));
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Cache the citizen's form answers alongside the result so they survive a
    // refresh. Phone/address are held here for the future DB step; only the
    // questionnaire answers are sent to the LLM (see runAnalysis).
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
    setPhotos([]);
    setPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview));
      return [];
    });
    setSelectedPhotoIndex(0);
  }, []);

  const addPhotos = useCallback((files: FileList | File[] | null) => {
    if (!files) {
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    if (validFiles.length === 0) {
      return;
    }

    setError(null);
    setResult(null);
    setSelectedPhotoIndex(0);
    setPhotos((current) => [...current, ...validFiles].slice(0, MAX_PHOTOS));
    setPreviews((current) => [...current, ...newPreviews].slice(0, MAX_PHOTOS));
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((current) => {
      const next = current.filter((preview, currentIndex) => {
        if (currentIndex === index) {
          URL.revokeObjectURL(preview);
        }
        return currentIndex !== index;
      });
      return next;
    });
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

  const runAnalysis = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (photos.length === 0) {
      setError("Por favor suba al menos una foto.");
      return null;
    }

    const request = (async () => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        photos.forEach((photo) => formData.append("fotos", photo));
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
  }, [form, photos]);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      photos,
      previews,
      loading,
      result,
      error,
      selectedPhotoIndex,
      form,
      hydrated,
      addPhotos,
      removePhoto,
      clearEvaluation,
      selectPhotoIndex: setSelectedPhotoIndex,
      setError,
      runAnalysis,
      setFormField,
      setFormQuestion,
    }),
    [
      addPhotos,
      clearEvaluation,
      error,
      form,
      hydrated,
      loading,
      photos,
      previews,
      removePhoto,
      result,
      runAnalysis,
      selectedPhotoIndex,
      setFormField,
      setFormQuestion,
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
