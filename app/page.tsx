"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Info, Sparkles, Upload } from "lucide-react";

import { HOW_IT_WORKS } from "@/lib/assessment";
import { cn } from "@/lib/utils";
import { RouteTransition } from "@/components/assessment-visuals";

const HOME_COPY = {
  title: "¿Es segura su casa?",
  description:
    "Evalúe al instante la integridad estructural de su propiedad mediante visión artificial de grado profesional y protocolos de seguridad expertos.",
};

export default function HomePage() {
  return (
    <RouteTransition className="pt-14">
      <main className="mx-auto w-full max-w-7xl pb-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden px-5 pb-8 pt-10 md:flex md:justify-center"
        >
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-fixed opacity-60 blur-[100px]" />
          <div className="relative z-10 space-y-4 md:max-w-2xl md:text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant md:mx-auto">
              <Sparkles className="h-3.5 w-3.5" />
              ANÁLISIS CON IA
            </div>
            <h2 className="mx-auto max-w-md font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[30px] md:leading-[38px]">
              {HOME_COPY.title}
            </h2>
            <p className="mx-auto max-w-lg text-base leading-6 text-on-surface-variant">{HOME_COPY.description}</p>
            <div className="mx-auto flex max-w-sm flex-col gap-4 pt-4">
              <Link
                href="/evaluar"
                transitionTypes={["nav-forward"]}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary-container text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] transition-colors hover:bg-primary"
              >
                <Camera className="h-4 w-4" />
                Tomar Foto
              </Link>
              <Link
                href="/evaluar"
                transitionTypes={["nav-forward"]}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-outline-variant bg-surface-container-lowest text-base font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                <Upload className="h-4 w-4" />
                Subir Imagen
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="space-y-6 px-5 py-8">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-on-surface">Cómo funciona</h3>
            <p className="text-sm leading-5 text-on-surface-variant">Tres pasos simples para su tranquilidad.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ title, text, icon: Icon, iconClass }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="soft-card flex flex-col items-start gap-4 rounded-[18px] p-6"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", iconClass)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-heading text-lg font-semibold text-on-surface">{title}</h4>
                  <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-5 py-8">
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
      </main>
    </RouteTransition>
  );
}
