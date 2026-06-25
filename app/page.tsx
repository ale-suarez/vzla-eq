"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Camera,
  Phone,
  Globe,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type VerdictLevel = "SEGURO" | "PRECAUCION" | "PELIGRO";

interface PhotoResult {
  index: number;
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  escalated: boolean;
}

interface AnalysisResult {
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  perPhoto: PhotoResult[];
  showAuthorities: boolean;
}

const VERDICT_CONFIG = {
  SEGURO: {
    bg: "bg-emerald-50 border-emerald-100",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    label: "Sin daños detectados",
    labelColor: "text-emerald-800",
    findingColor: "text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-700",
    Icon: ShieldCheck,
  },
  PRECAUCION: {
    bg: "bg-amber-50 border-amber-100",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    label: "Precaución",
    labelColor: "text-amber-900",
    findingColor: "text-amber-800",
    badgeClass: "bg-amber-100 text-amber-700",
    Icon: AlertTriangle,
  },
  PELIGRO: {
    bg: "bg-rose-50 border-rose-100",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    label: "Daños estructurales",
    labelColor: "text-rose-900",
    findingColor: "text-rose-800",
    badgeClass: "bg-rose-100 text-rose-700",
    Icon: XCircle,
  },
} as const;

const EMERGENCY_NUMBERS = [
  { label: "171", sub: "Cantv" },
  { label: "*1", sub: "Movilnet" },
  { label: "112", sub: "Digitel" },
  { label: "911", sub: "Movistar" },
];

const CIVIL_CONTACTS = [
  { name: "Protección Civil", numbers: ["0800-5588427", "0800-2668446"], tels: ["08005588427", "08002668446"] },
  { name: "Defensa Civil", numbers: ["0800-28326", "0212-483.98.05"], tels: ["080028326", "02124839805"] },
  { name: "Aeroambulancias", numbers: ["0212-993.25.41"], tels: ["02129932541"] },
  { name: "Rescarven", numbers: ["0212-993.69.11"], tels: ["02129936911"] },
  { name: "Amb. Metropolitana", numbers: ["0212-545.45.45"], tels: ["02125454545"] },
];

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_MB = 10;

export default function Home() {
  const [edificio, setEdificio] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    const newPreviews: string[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return;
      valid.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });
    setFotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_PHOTOS));
  }, []);

  const removePhoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edificio.trim()) { setError("Por favor ingrese el nombre o dirección del edificio."); return; }
    if (fotos.length === 0) { setError("Por favor suba al menos una foto."); return; }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("edificio", edificio);
      fotos.forEach((f) => formData.append("fotos", f));
      const res = await fetch("/api/analizar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al analizar. Intente de nuevo."); return; }
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Error de conexión. Verifique su internet e intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null); setError(null); setFotos([]); setPreviews([]); setEdificio("");
  };

  const cfg = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-slate-900 leading-none tracking-tight">Evaluación Estructural</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Venezuela · Respuesta al sismo</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-3">
        <AnimatePresence mode="wait">

          {/* ── RESULT ── */}
          {result && cfg && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-3"
            >
              {/* Verdict card */}
              <Card className={cn("border shadow-sm", cfg.bg)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn("rounded-xl p-2.5 shrink-0", cfg.iconBg)}>
                      <cfg.Icon className={cn("w-6 h-6", cfg.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                        Resultado del análisis
                      </p>
                      <h2 className={cn("text-xl font-bold leading-tight", cfg.labelColor)}>
                        {cfg.label}
                      </h2>
                      <p className={cn("text-sm mt-2 leading-relaxed", cfg.findingColor)}>
                        {result.finding}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.badgeClass)}>
                          Confianza {result.confidence}%
                        </span>
                        {result.perPhoto.some((p) => p.escalated) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            Revisión avanzada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-photo breakdown */}
              {result.perPhoto.length > 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                  <Card className="border border-slate-100 shadow-sm overflow-hidden">
                    <CardHeader className="px-4 py-3 bg-slate-50/60">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Detalle por foto
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-0 divide-y divide-slate-100">
                      {result.perPhoto.map((p, i) => {
                        const pc = VERDICT_CONFIG[p.verdict];
                        return (
                          <motion.div
                            key={p.index}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="px-4 py-3 flex items-start gap-3"
                          >
                            <div className={cn("mt-0.5 rounded-md p-1 shrink-0", pc.iconBg)}>
                              <pc.Icon className={cn("w-3.5 h-3.5", pc.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-sm font-medium text-slate-700">
                                  Foto {p.index + 1}
                                </span>
                                <span className={cn("text-xs font-semibold shrink-0", pc.labelColor)}>
                                  {pc.label} · {p.confidence}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 leading-snug">{p.finding}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Emergency contacts */}
              {result.showAuthorities && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  <Card className="border border-slate-100 shadow-sm overflow-hidden">
                    <CardHeader className="px-4 py-3 bg-slate-50/60">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Contactos de emergencia
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-0">
                      {/* Quick dial */}
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide font-medium">
                          Líneas de emergencia
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {EMERGENCY_NUMBERS.map(({ label, sub }) => (
                            <a
                              key={label}
                              href={`tel:${label}`}
                              className="flex flex-col items-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl py-3 transition-colors border border-slate-100"
                            >
                              <span className="text-base font-bold text-slate-800 leading-none">{label}</span>
                              <span className="text-[10px] text-slate-400 mt-1">{sub}</span>
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Org contacts */}
                      <div className="divide-y divide-slate-50">
                        {CIVIL_CONTACTS.map(({ name, numbers, tels }) => (
                          <div key={name} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-600 shrink-0">{name}</span>
                            <div className="flex gap-2 flex-wrap justify-end">
                              {numbers.map((n, i) => (
                                <a key={n} href={`tel:${tels[i]}`} className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
                                  {n}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator />
                      <div className="px-4 py-3 flex gap-3 items-start">
                        <Globe className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1">
                          <a href="https://venezuelareporta.org" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            venezuelareporta.org <ChevronRight className="w-3 h-3" />
                          </a>
                          <a href="https://venezuelatebusca.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            venezuelatebusca.com <ChevronRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <Button variant="outline" onClick={resetForm} className="w-full h-11 text-sm">
                Analizar otro edificio
              </Button>
            </motion.div>
          )}

          {/* ── FORM ── */}
          {!result && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-3"
            >
              {/* Combined form card */}
              <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">

                  {/* Building input */}
                  <div className="px-4 pt-4 pb-3 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Edificio o dirección
                    </label>
                    <input
                      type="text"
                      value={edificio}
                      onChange={(e) => setEdificio(e.target.value)}
                      placeholder="Ej: Edificio Los Andes, Av. Principal, Caracas"
                      className="w-full border-0 border-b border-slate-200 pb-2 text-[15px] text-slate-900 placeholder-slate-300 focus:outline-none focus:border-slate-400 bg-transparent transition font-medium"
                      disabled={loading}
                    />
                  </div>

                  <Separator />

                  {/* Photo upload */}
                  <div className="px-4 pt-3 pb-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        Fotos
                      </label>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        {fotos.length}/{MAX_PHOTOS}
                      </span>
                    </div>

                  <AnimatePresence>
                    {previews.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="grid grid-cols-3 gap-2"
                      >
                        {previews.map((src, i) => (
                          <motion.div
                            key={src}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative aspect-square"
                          >
                            <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-white transition-colors"
                              disabled={loading}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {fotos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border border-dashed border-slate-300 rounded-lg text-slate-400 text-sm hover:border-slate-400 hover:text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Camera className="w-4 h-4" />
                      Agregar fotos
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                  <p className="text-[11px] text-slate-400">
                    Máx. {MAX_FILE_SIZE_MB} MB por foto · JPG, PNG, WEBP
                  </p>
                </div>
                </CardContent>
              </Card>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={loading || fotos.length === 0 || !edificio.trim()}
                className="w-full h-12 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Analizar estructura
                  </span>
                )}
              </Button>

              <p className="text-[11px] text-slate-400 text-center pb-2 leading-relaxed">
                Este análisis es orientativo y se basa únicamente en la información proporcionada por el usuario. Puede ayudar a identificar posibles daños, fallas constructivas o condiciones que afecten la habitabilidad de una edificación, pero no constituye una inspección estructural formal ni sustituye la evaluación presencial de un ingeniero estructural o civil calificado. Cualquier decisión sobre ocupación, reparación o intervención del inmueble deberá ser confirmada por profesionales competentes y, cuando corresponda, por las autoridades correspondientes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
