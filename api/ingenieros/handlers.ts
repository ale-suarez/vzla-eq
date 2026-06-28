import { randomUUID } from "node:crypto";
import type { Context } from "hono";

import { createSupabaseAdminClient } from "@/api/lib/supabase";
import { getSessionContext, hasReviewAccess } from "@/api/lib/auth";
import {
  COLLEGIATE_STATES,
  MAX_SUPPORTING_DOCUMENT_SIZE,
  MAX_SUPPORTING_DOCUMENTS,
  PROFESSIONAL_AREAS,
  SUPPORTING_DOCUMENT_EXTENSIONS,
  SUPPORTING_DOCUMENT_MIME_TYPES,
} from "@/lib/engineer-applications";

const SUPPORT_BUCKET = "volunteer_application_docs";

type SupportingDocumentRecord = {
  name: string;
  type: string;
  size: number;
  storage_path: string;
};

function jsonError(
  c: Context,
  status: 400 | 401 | 404 | 500,
  error: string,
  details?: Record<string, string>
) {
  return c.json(details ? { error, details } : { error }, status);
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return normalizeText(value).toLowerCase();
}

function normalizeUrl(value: FormDataEntryValue | null) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeYears(value: FormDataEntryValue | null) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 80) {
    return null;
  }

  return parsed;
}

function sanitizeFilename(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 120);
}

function hasPrefix(value: string, prefixes: string[]) {
  const normalized = value.trim().toUpperCase();
  return prefixes.some((prefix) => normalized.startsWith(prefix.toUpperCase()));
}

function isAllowedDocument(file: File) {
  if (file.size > MAX_SUPPORTING_DOCUMENT_SIZE) {
    return false;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTING_DOCUMENT_MIME_TYPES.has(file.type) || SUPPORTING_DOCUMENT_EXTENSIONS.has(extension);
}

function validateSubmission(formData: FormData) {
  const errors: Record<string, string> = {};

  const email = normalizeEmail(formData.get("email"));
  const fullName = normalizeText(formData.get("fullName"));
  const documentNumber = normalizeText(formData.get("documentNumber"));
  const specialty = normalizeText(formData.get("specialty"));
  const collegiateStatus = normalizeText(formData.get("collegiateStatus"));
  const licenseNumber = normalizeOptionalText(formData.get("licenseNumber"));
  const city = normalizeText(formData.get("city"));
  const country = normalizeText(formData.get("country"));
  const yearsExperience = normalizeYears(formData.get("yearsExperience"));
  const organization = normalizeOptionalText(formData.get("organization"));
  const linkedinUrl = normalizeUrl(formData.get("linkedinUrl"));
  const motivation = normalizeOptionalText(formData.get("motivation"));
  const consent = normalizeText(formData.get("consent")) === "true";
  const files = formData
    .getAll("supportingDocuments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Ingresa un correo válido.";
  }

  if (fullName.length < 3) {
    errors.fullName = "Escribe tu nombre completo.";
  }

  if (!hasPrefix(documentNumber, ["V-", "CVI-"])) {
    errors.documentNumber = "El documento debe comenzar con V- o CVI-.";
  } else if (documentNumber.length < 4) {
    errors.documentNumber = "Ingresa un documento de identidad válido.";
  }

  if (!PROFESSIONAL_AREAS.includes(specialty as (typeof PROFESSIONAL_AREAS)[number])) {
    errors.specialty = "Selecciona un área profesional.";
  }

  if (licenseNumber && !hasPrefix(licenseNumber, ["CVI-"])) {
    errors.licenseNumber = "El número de colegiado debe comenzar con CVI-.";
  }

  if (!COLLEGIATE_STATES.includes(collegiateStatus as (typeof COLLEGIATE_STATES)[number])) {
    errors.collegiateStatus = "Selecciona una situación de colegiatura.";
  }

  if (city.length < 2) {
    errors.city = "Indica tu ciudad.";
  }

  if (country.length < 2) {
    errors.country = "Indica tu país.";
  }

  if (yearsExperience === null && normalizeText(formData.get("yearsExperience")) !== "") {
    errors.yearsExperience = "La experiencia debe ser un número entre 0 y 80.";
  }

  if (linkedinUrl === null && normalizeText(formData.get("linkedinUrl")) !== "") {
    errors.linkedinUrl = "Ingresa un enlace válido que empiece por http:// o https://.";
  }

  if (!consent) {
    errors.consent = "Debes confirmar que la información es veraz.";
  }

  if (files.length === 0) {
    errors.supportingDocuments = "Adjunta al menos un documento de respaldo.";
  } else if (files.length > MAX_SUPPORTING_DOCUMENTS) {
    errors.supportingDocuments = `Puedes adjuntar hasta ${MAX_SUPPORTING_DOCUMENTS} archivos.`;
  } else {
    const oversized = files.find((file) => file.size > MAX_SUPPORTING_DOCUMENT_SIZE);
    if (oversized) {
      errors.supportingDocuments = `El archivo ${oversized.name} supera el límite de 10 MB.`;
    } else {
      const invalid = files.find((file) => !isAllowedDocument(file));
      if (invalid) {
        errors.supportingDocuments = "Solo aceptamos PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX y ODT.";
      }
    }
  }

  return {
    errors,
    value:
      Object.keys(errors).length === 0
        ? {
            email,
            fullName,
            documentNumber,
            specialty,
            collegiateStatus,
            licenseNumber,
            city,
            country,
            yearsExperience,
            organization,
            linkedinUrl,
            motivation,
            consent,
            files,
          }
        : null,
  };
}

async function uploadSupportingDocuments(email: string, files: File[]) {
  const supabase = createSupabaseAdminClient();
  const records: SupportingDocumentRecord[] = [];
  const safeEmail = email.replace(/[^a-z0-9@._-]+/gi, "_");

  for (const file of files) {
    const suffix = sanitizeFilename(file.name) || "archivo";
    const storagePath = `solicitudes/${safeEmail}/${randomUUID()}-${suffix}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage.from(SUPPORT_BUCKET).upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw new Error(`No se pudo guardar ${file.name}: ${error.message}`);
    }

    records.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      storage_path: storagePath,
    });
  }

  return records;
}

export async function ingenierosSolicitudesGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasReviewAccess(role)) {
    return jsonError(c, 401, "Unauthorized");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("engineers")
    .select(
      "id,email,full_name,document_number,specialty,collegiate_status,license_number,city,country,years_experience,organization,linkedin_url,motivation,supporting_documents,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return jsonError(c, 500, error.message);
  }

  return c.json({ data: data ?? [] });
}

export async function ingenierosSolicitudesPost(c: Context) {
  let formData: FormData;

  try {
    formData = await c.req.formData();
  } catch {
    return jsonError(c, 400, "El formulario debe enviarse como multipart/form-data.");
  }

  const validation = validateSubmission(formData);
  if (!validation.value) {
    return jsonError(c, 400, "Revisa los campos marcados.", validation.errors);
  }

  const supportingDocuments = await uploadSupportingDocuments(validation.value.email, validation.value.files);

  const supabase = createSupabaseAdminClient();
  const payload = {
    email: validation.value.email,
    full_name: validation.value.fullName,
    document_number: validation.value.documentNumber,
    specialty: validation.value.specialty,
    collegiate_status: validation.value.collegiateStatus,
    license_number: validation.value.licenseNumber,
    city: validation.value.city,
    country: validation.value.country,
    years_experience: validation.value.yearsExperience,
    organization: validation.value.organization,
    linkedin_url: validation.value.linkedinUrl,
    motivation: validation.value.motivation,
    supporting_documents: supportingDocuments,
    application_status: "pending" as const,
    is_certified: false,
    review_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  };

  const { data, error } = await supabase
    .from("engineers")
    .upsert(payload, { onConflict: "email" })
    .select(
      "id,email,full_name,document_number,specialty,collegiate_status,license_number,city,country,years_experience,organization,linkedin_url,motivation,supporting_documents,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at"
    )
    .single();

  if (error) {
    return jsonError(c, 400, error.message);
  }

  return c.json({ data }, 201);
}

export async function engineerSolicitudByIdPatch(c: Context) {
  const { user, role } = await getSessionContext();
  if (!user || !hasReviewAccess(role)) {
    return jsonError(c, 401, "Unauthorized");
  }

  const id = c.req.param("id");
  if (!id) {
    return jsonError(c, 400, "Falta el identificador de la solicitud.");
  }

  let body: { application_status?: string; review_notes?: string | null };
  try {
    body = (await c.req.json()) as { application_status?: string; review_notes?: string | null };
  } catch {
    return jsonError(c, 400, "El cuerpo debe ser JSON.");
  }

  const status = String(body.application_status ?? "").trim() as "approved" | "rejected";
  if (!["approved", "rejected"].includes(status)) {
    return jsonError(c, 400, "El estado debe ser approved o rejected.");
  }

  const reviewNotes = typeof body.review_notes === "string" ? body.review_notes.trim() : "";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("engineers")
    .update({
      application_status: status,
      is_certified: status === "approved",
      review_notes: reviewNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id,email,full_name,document_number,specialty,collegiate_status,license_number,city,country,years_experience,organization,linkedin_url,motivation,supporting_documents,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at"
    )
    .maybeSingle();

  if (error) {
    return jsonError(c, 400, error.message);
  }

  if (!data) {
    return jsonError(c, 404, "No encontramos esa solicitud.");
  }

  return c.json({ data });
}
