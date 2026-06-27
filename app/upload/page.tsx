"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, Images, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/components/assessment-provider";
import { PHOTO_TIPS, MAX_FILE_SIZE_MB, MAX_PHOTOS } from "@/lib/assessment";
import { cn } from "@/lib/utils";
import { RouteTransition } from "@/components/assessment-visuals";

export default function EvaluatePage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { photos, previews, error, loading, addPhotos, removePhoto, setError } = useAssessment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length === 0) {
      setError("Por favor suba al menos una foto.");
      return;
    }

    router.push("/analyzing", { scroll: false, transitionTypes: ["nav-forward"] });
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  return (
    <RouteTransition className="pt-14">
      <motion.form
        key="upload"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="min-h-[calc(100dvh-56px)] pb-32"
      >
        <div className="space-y-6 px-5 py-6">
          <section className="space-y-1">
            <h2 className="font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface">Nueva Evaluación</h2>
            <p className="text-sm leading-5 text-on-surface-variant">Toma una foto clara del área estructural que deseas analizar.</p>
          </section>

          <section
            className={cn(
              "upload-dashed flex w-full flex-col items-center justify-center bg-surface-container-lowest px-6 py-10 transition-colors",
              previews.length > 0 && "bg-primary-fixed/50"
            )}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Camera className="h-8 w-8" />
            </div>
            <div className="mb-6 space-y-2 text-center">
              <p className="font-heading text-lg font-semibold text-on-surface">Comenzar Escaneo</p>
              <p className="text-sm leading-5 text-on-surface-variant">Toca para usar la cámara o sube desde tu galería</p>
              <p className="text-xs font-medium text-on-surface-variant">
                {photos.length}/{MAX_PHOTOS} · Máx. {MAX_FILE_SIZE_MB} MB por foto
              </p>
            </div>

            <AnimatePresence>
              {previews.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {previews.map((src, i) => (
                    <motion.div
                      key={src}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      className="relative aspect-square overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-lowest"
                    >
                      <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-white/85 text-on-surface shadow-sm backdrop-blur-sm"
                        disabled={loading}
                        aria-label={`Eliminar foto ${i + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {photos.length < MAX_PHOTOS && (
              <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                <Button
                  type="button"
                  onClick={openCamera}
                  className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] hover:bg-primary-container"
                  disabled={loading}
                >
                  <Camera className="h-4 w-4" />
                  Tomar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openGallery}
                  className="h-14 w-full rounded-[18px] border-outline-variant bg-surface-container text-base font-semibold text-on-surface hover:bg-surface-container-high"
                  disabled={loading}
                >
                  <Images className="h-4 w-4" />
                  Elegir de la Galería
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-secondary" />
              <h3 className="font-heading text-lg font-semibold text-on-surface">Consejos para la Foto</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {PHOTO_TIPS.map(({ title, text, icon: Icon }) => (
                <div key={title} className="soft-card flex items-start gap-4 rounded-[18px] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-heading text-base font-semibold text-on-surface">{title}</p>
                    <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 rounded-[18px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <section className="pb-2">
            <div className="flex gap-4 rounded-[18px] border-2 border-outline-variant/30 bg-surface-container-low p-6">
              <Info className="mt-0.5 h-6 w-6 shrink-0 text-on-surface-variant" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">AVISO LEGAL IMPORTANTE</h4>
                <p className="text-sm leading-5 text-on-surface-variant">
                  Este análisis es orientativo y se basa únicamente en la información proporcionada por el usuario. Puede ayudar a identificar posibles daños, fallas constructivas o condiciones que afecten la habitabilidad de una edificación, pero no constituye una inspección estructural formal ni sustituye la evaluación presencial de un ingeniero estructural o civil calificado. Cualquier decisión sobre ocupación, reparación o intervención del inmueble deberá ser confirmada por profesionales competentes y, cuando corresponda, por las autoridades correspondientes.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="pointer-events-none fixed bottom-0 left-0 z-40 w-full bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-6 pt-10">
          <div className="pointer-events-auto mx-auto w-full max-w-sm">
            <Button
              type="submit"
              disabled={loading || photos.length === 0}
              className={cn(
                "h-14 w-full rounded-[18px] text-base font-bold transition-all",
                photos.length > 0
                  ? "bg-primary text-white shadow-[0px_4px_20px_rgba(37,99,235,0.24)] hover:bg-primary-container"
                  : "bg-outline text-on-primary-fixed-variant opacity-50"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Analizar estructura
            </Button>
          </div>
        </div>
      </motion.form>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          addPhotos(e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          addPhotos(e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
    </RouteTransition>
  );
}
