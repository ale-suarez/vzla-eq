export const PROFESSIONAL_AREAS = [
  "Ingeniería civil",
  "Ingeniería estructural",
  "Ingeniería geotécnica",
  "Arquitectura",
  "Topografía",
  "Otra",
] as const;

export const COLLEGIATE_STATES = ["Colegiado/a", "En trámite", "Sin colegiatura"] as const;
export const MAX_SUPPORTING_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const MAX_SUPPORTING_DOCUMENTS = 5;
export const SUPPORTING_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
]);
export const SUPPORTING_DOCUMENT_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "odt"]);

export type EngineerApplicationForm = {
  email: string;
  fullName: string;
  documentNumber: string;
  specialty: string;
  collegiateStatus: (typeof COLLEGIATE_STATES)[number];
  licenseNumber: string;
  city: string;
  country: string;
  yearsExperience: string;
  organization: string;
  linkedinUrl: string;
  motivation?: string;
  supportingDocuments: File[];
  consent: boolean;
};

export const EMPTY_ENGINEER_APPLICATION: EngineerApplicationForm = {
  email: "",
  fullName: "",
  documentNumber: "",
  specialty: "",
  collegiateStatus: "Colegiado/a",
  licenseNumber: "",
  city: "",
  country: "Venezuela",
  yearsExperience: "",
  organization: "",
  linkedinUrl: "",
  motivation: "",
  supportingDocuments: [],
  consent: false,
};

export type EngineerApplicationReview = EngineerApplicationForm & {
  submittedAt?: string;
};

export function isSupportedSupportingDocument(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTING_DOCUMENT_MIME_TYPES.has(file.type) || SUPPORTING_DOCUMENT_EXTENSIONS.has(extension);
}

export function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const reviewLabels: Record<keyof EngineerApplicationForm, string> = {
  email: "Correo electrónico",
  fullName: "Nombre completo",
  documentNumber: "Documento de identidad",
  specialty: "Área profesional",
  collegiateStatus: "Situación de colegiatura",
  licenseNumber: "Número de colegiado",
  city: "Ciudad",
  country: "País",
  yearsExperience: "Años de experiencia",
  organization: "Organización o estudio",
  linkedinUrl: "Perfil profesional",
  motivation: "Motivación",
  supportingDocuments: "Respaldo documental",
  consent: "Confirmación",
};

export function getEngineerApplicationFields(application: EngineerApplicationForm) {
  return [
    ["Correo electrónico", application.email],
    ["Nombre completo", application.fullName],
    ["Documento de identidad", application.documentNumber],
    ["Área profesional", application.specialty],
    ["Situación de colegiatura", application.collegiateStatus],
    ["Número de colegiado", application.licenseNumber || "No indicado"],
    ["Ciudad", application.city],
    ["País", application.country],
    ["Años de experiencia", application.yearsExperience || "No indicado"],
    ["Organización o estudio", application.organization || "No indicado"],
    ["Perfil profesional", application.linkedinUrl || "No indicado"],
    ["Motivación", application.motivation?.trim() ? application.motivation : "No indicado"],
    [
      "Respaldo documental",
      application.supportingDocuments.length
        ? application.supportingDocuments.map((file) => file.name).join(", ")
        : "No adjuntado",
    ],
    ["Confirmación", application.consent ? "Aceptada" : "Pendiente"],
  ] as const;
}

export function getEngineerApplicationSummary(application: EngineerApplicationForm) {
  return Object.entries(application)
    .filter(([key]) => key !== "consent" && key !== "supportingDocuments")
    .map(([key, value]) => [reviewLabels[key as keyof EngineerApplicationForm], value || "No indicado"] as const);
}
