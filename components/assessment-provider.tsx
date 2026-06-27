"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { AnalysisResult } from "@/lib/assessment";
import { ASSESSMENT_STORAGE_KEY, MAX_FILE_SIZE_MB, MAX_PHOTOS } from "@/lib/assessment";

type AssessmentState = {
  photos: File[];
  previews: string[];
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
  selectedPhotoIndex: number;
};

type AssessmentContextValue = AssessmentState & {
  addPhotos: (files: FileList | File[] | null) => void;
  removePhoto: (index: number) => void;
  clearEvaluation: () => void;
  selectPhotoIndex: (index: number) => void;
  setError: (value: string | null) => void;
  runAnalysis: () => Promise<AnalysisResult | null>;
};

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

function readStoredState(): Pick<AssessmentState, "result" | "error" | "selectedPhotoIndex"> {
  if (typeof window === "undefined") {
    return {
      result: null,
      error: null,
      selectedPhotoIndex: 0,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_STORAGE_KEY);
    if (!raw) {
      return {
        result: null,
        error: null,
        selectedPhotoIndex: 0,
      };
    }

    const parsed = JSON.parse(raw) as Partial<Pick<AssessmentState, "result" | "error" | "selectedPhotoIndex">>;
    return {
      result: parsed.result ?? null,
      error: typeof parsed.error === "string" ? parsed.error : null,
      selectedPhotoIndex: typeof parsed.selectedPhotoIndex === "number" ? parsed.selectedPhotoIndex : 0,
    };
  } catch {
    return {
      result: null,
      error: null,
      selectedPhotoIndex: 0,
    };
  }
}

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const storedState = useMemo(() => readStoredState(), []);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(storedState.result);
  const [error, setError] = useState<string | null>(storedState.error);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(storedState.selectedPhotoIndex);
  const inFlightRef = useRef<Promise<AnalysisResult | null> | null>(null);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      ASSESSMENT_STORAGE_KEY,
      JSON.stringify({
        result,
        error,
        selectedPhotoIndex,
      })
    );
  }, [error, result, selectedPhotoIndex]);

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

        const response = await fetch("/api/analizar", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as AnalysisResult & { error?: string };

        if (!response.ok) {
          const message = typeof data.error === "string" ? data.error : "Error al analizar. Intente de nuevo.";
          setError(message);
          setResult(null);
          return null;
        }

        setSelectedPhotoIndex(0);
        setResult(data);
        return data;
      } catch {
        setError("Error de conexión. Verifique su internet e intente de nuevo.");
        setResult(null);
        return null;
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [photos]);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      photos,
      previews,
      loading,
      result,
      error,
      selectedPhotoIndex,
      addPhotos,
      removePhoto,
      clearEvaluation,
      selectPhotoIndex: setSelectedPhotoIndex,
      setError,
      runAnalysis,
    }),
    [addPhotos, clearEvaluation, error, loading, photos, previews, removePhoto, result, runAnalysis, selectedPhotoIndex]
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
