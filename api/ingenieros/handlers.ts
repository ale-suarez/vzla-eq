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
const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60 * 10;

type SupportingDocumentRecord = {
  name: string;
  type: string;
  size: number;
  storage_path: string;
};

type EngineerDocument = {
  path: string;
  filename: string;
  signed_url: string | null;
};

type EngineerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  license_number: string | null;
  specialty: string | null;
  camera_affiliation: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  years_experience: number | null;
  motivation: string | null;
  documents_summary: string | null;
  documents_storage_paths: string[] | null;
  profile_url: string | null;
  application_status: "pending" | "approved" | "rejected";
  is_certified: boolean;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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

function readTextField(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(formData.get(key));
    if (value) {
      return value;
    }
  }

  return "";
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

// Parses a coordinate field. Returns null for missing/invalid values so the
// caller can decide whether a pin is required.
function normalizeCoordinate(value: FormDataEntryValue | null, min: number, max: number) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
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

function normalizeSpecialty(value: string) {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    "ingeniería civil": "Ingeniería Civil",
    "ingenieria civil": "Ingeniería Civil",
    "ingeniería estructural": "Ingeniería Estructural",
    "ingenieria estructural": "Ingeniería Estructural",
    arquitectura: "Arquitectura",
    otra: "Otra",
  };

  return map[normalized] ?? value.trim();
}

function deriveCollegiateStatus(documentNumber: string, explicitStatus: string) {
  const normalizedExplicit = explicitStatus.trim();
  if (COLLEGIATE_STATES.includes(normalizedExplicit as (typeof COLLEGIATE_STATES)[number])) {
    return normalizedExplicit as (typeof COLLEGIATE_STATES)[number];
  }

  const normalizedDocument = documentNumber.trim().toUpperCase();
  if (normalizedDocument.startsWith("CVI-")) {
    return "Colegiado/a" as const;
  }

  if (normalizedDocument.startsWith("V-")) {
    return "Sin colegiatura" as const;
  }

  return "";
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
  const fullName = readTextField(formData, "full_name", "fullName");
  const documentNumber = readTextField(formData, "license_number", "documentNumber");
  const specialty = normalizeSpecialty(readTextField(formData, "specialty"));
  const explicitCollegiateStatus = readTextField(formData, "collegiateStatus");
  const collegiateStatus = deriveCollegiateStatus(documentNumber, explicitCollegiateStatus);
  const licenseNumber = normalizeOptionalText(formData.get("license_number")) ?? normalizeOptionalText(formData.get("licenseNumber"));
  const latitude = normalizeCoordinate(formData.get("latitude"), -90, 90);
  const longitude = normalizeCoordinate(formData.get("longitude"), -180, 180);
  const address = normalizeOptionalText(formData.get("address"));
  const yearsExperience = normalizeYears(formData.get("years_experience")) ?? normalizeYears(formData.get("yearsExperience"));
  const organization = normalizeOptionalText(formData.get("camera_affiliation")) ?? normalizeOptionalText(formData.get("organization"));
  const linkedinUrl = normalizeUrl(formData.get("profile_url")) ?? normalizeUrl(formData.get("linkedinUrl"));
  const motivation = normalizeOptionalText(formData.get("motivation"));
  const consentText = normalizeText(formData.get("consent"));
  const consent = consentText ? consentText === "true" : true;
  const files = formData
    .getAll("documents")
    .concat(formData.getAll("supportingDocuments"))
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

  if (
    !PROFESSIONAL_AREAS.some((area) => area.toLowerCase() === specialty.trim().toLowerCase())
  ) {
    errors.specialty = "Selecciona un área profesional.";
  }

  if (licenseNumber && !hasPrefix(licenseNumber, ["CVI-"])) {
    errors.licenseNumber = "El número de colegiado debe comenzar con CVI-.";
  }

  if (!COLLEGIATE_STATES.includes(collegiateStatus as (typeof COLLEGIATE_STATES)[number])) {
    errors.collegiateStatus = "Selecciona una situación de colegiatura.";
  }

  // A pin (coordinates) is required, mirroring the citizen incident form. The
  // geocoded address label is best-effort: kept when present, never gating.
  if (latitude === null || longitude === null) {
    errors.location = "Marca tu ubicación en el mapa.";
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
            licenseNumber: documentNumber,
            specialty,
            latitude,
            longitude,
            address,
            yearsExperience,
            cameraAffiliation: organization,
            profileUrl: linkedinUrl,
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

async function buildSignedDocumentMap(paths: string[]) {
  const supabase = createSupabaseAdminClient();
  const uniquePaths = Array.from(new Set(paths)).filter(Boolean);

  if (uniquePaths.length === 0) {
    return new Map<string, EngineerDocument>();
  }

  const { data, error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrls(uniquePaths, DOCUMENT_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, EngineerDocument>();
  for (const entry of data ?? []) {
    if (!entry.path) {
      continue;
    }

    map.set(entry.path, {
      path: entry.path,
      filename: entry.path.split("/").pop() ?? entry.path,
      signed_url: entry.signedUrl ?? null,
    });
  }

  return map;
}

async function mapEngineerRow(row: EngineerRow) {
  const documentPaths = row.documents_storage_paths ?? [];
  const documentMap = await buildSignedDocumentMap(documentPaths);

  return {
    ...row,
    documents: documentPaths.map((path) => documentMap.get(path) ?? { path, filename: path.split("/").pop() ?? path, signed_url: null }),
  };
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
      "id,email,full_name,license_number,specialty,camera_affiliation,latitude,longitude,address,years_experience,motivation,documents_summary,documents_storage_paths,profile_url,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return jsonError(c, 500, error.message);
  }

  const mapped = await Promise.all((data ?? []).map((row) => mapEngineerRow(row as EngineerRow)));
  return c.json({ data: mapped });
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
  const supportingDocumentPaths = supportingDocuments.map((document) => document.storage_path);

  const supabase = createSupabaseAdminClient();
  const payload = {
    email: validation.value.email,
    full_name: validation.value.fullName,
    license_number: validation.value.licenseNumber,
    specialty: validation.value.specialty,
    camera_affiliation: validation.value.cameraAffiliation,
    latitude: validation.value.latitude,
    longitude: validation.value.longitude,
    address: validation.value.address,
    years_experience: validation.value.yearsExperience,
    motivation: validation.value.motivation,
    documents_summary: supportingDocuments.map((document) => document.name).join(" · "),
    documents_storage_paths: supportingDocumentPaths,
    profile_url: validation.value.profileUrl,
    application_status: "pending" as const,
    is_certified: false,
    review_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  };
  const selectColumns =
    "id,email,full_name,license_number,specialty,camera_affiliation,latitude,longitude,address,years_experience,motivation,documents_summary,documents_storage_paths,profile_url,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at";

  const { data: existing, error: existingError } = await supabase
    .from("engineers")
    .select(selectColumns)
    .eq("email", payload.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return jsonError(c, 400, existingError.message);
  }

  if (existing) {
    const { data, error } = await supabase
      .from("engineers")
      .update(payload)
      .eq("id", existing.id)
      .select(selectColumns)
      .single();

    if (error) {
      return jsonError(c, 400, error.message);
    }

    return c.json({ data: await mapEngineerRow(data as EngineerRow) }, 200);
  }

  const { data, error } = await supabase.from("engineers").insert(payload).select(selectColumns).single();

  if (error) {
    return jsonError(c, 400, error.message);
  }

  return c.json({ data: await mapEngineerRow(data as EngineerRow) }, 201);
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
      "id,email,full_name,license_number,specialty,camera_affiliation,latitude,longitude,address,years_experience,motivation,documents_summary,documents_storage_paths,profile_url,application_status,is_certified,review_notes,reviewed_by,reviewed_at,created_at,updated_at"
    )
    .maybeSingle();

  if (error) {
    return jsonError(c, 400, error.message);
  }

  if (!data) {
    return jsonError(c, 404, "No encontramos esa solicitud.");
  }

  return c.json({ data: data ? await mapEngineerRow(data as EngineerRow) : data });
}
