import { z } from "@hono/zod-openapi";

export const appRoleSchema = z.enum(["anonymous", "engineer", "reviewer", "admin"]).openapi("AppRole");

export const verdictLevelSchema = z.enum(["low", "moderate", "severe", "critical"]).openapi("VerdictLevel");
// The analysis pipeline emits the same verdict vocabulary as the DB enum.
export const analysisVerdictSchema = verdictLevelSchema;
export const incidentStateSchema = z.enum(["pending", "in_review", "resolved", "archived"]).openapi("IncidentState");
export const analysisStatusSchema = z.enum(["pending", "complete", "failed"]).openapi("AnalysisStatus");

export const errorResponseSchema = z
  .object({
    error: z.string().openapi({ example: "Unauthorized" }),
  })
  .openapi("ErrorResponse");

export const sessionResponseSchema = z
  .object({
    authenticated: z.boolean().openapi({ example: true }),
    role: appRoleSchema.openapi({ example: "engineer" }),
    email: z.string().email().optional().openapi({ example: "user@example.com" }),
    id: z.string().uuid().optional().openapi({ example: "4a8e1f02-2f58-4c3d-8a72-31f65d2b9b86" }),
    backoffice: z.boolean().optional().openapi({ example: true }),
    reviewer: z.boolean().optional().openapi({ example: false }),
  })
  .openapi("SessionResponse");

export const authMessageResponseSchema = z
  .object({
    message: z.string().openapi({ example: "Te enviamos un enlace de acceso. Revisa tu correo." }),
  })
  .openapi("AuthMessageResponse");

export const authCallbackRedirectQuerySchema = z
  .object({
    code: z.string().optional().openapi({ example: "auth-code-from-supabase" }),
    next: z.string().optional().openapi({ example: "/dashboard" }),
  })
  .openapi("AuthCallbackQuery");

export const authMagicLinkRequestSchema = z
  .object({
    email: z.string().email().openapi({ example: "engineer@example.com" }),
    next: z.string().optional().openapi({ example: "/revision-solicitudes" }),
  })
  .openapi("AuthMagicLinkRequest");

export const engineerApplicationStatusSchema = z
  .enum(["pending", "approved", "rejected"])
  .openapi("EngineerApplicationStatus");

export const engineerApplicationSubmitSchema = z
  .object({
    email: z.string().email().openapi({ example: "voluntario@correo.org" }),
    fullName: z.string().min(2).openapi({ example: "María Fernanda López" }),
    documentNumber: z.string().min(3).openapi({ example: "V-18.642.903" }),
    specialty: z.string().min(2).openapi({ example: "Ingeniería estructural" }),
    collegiateStatus: z.string().min(2).openapi({ example: "Colegiado/a" }),
    licenseNumber: z.string().optional().openapi({ example: "CIV-20481" }),
    city: z.string().min(2).openapi({ example: "Valencia" }),
    country: z.string().min(2).openapi({ example: "Venezuela" }),
    yearsExperience: z.string().optional().openapi({ example: "12" }),
    organization: z.string().optional().openapi({ example: "Consultora del Centro" }),
    linkedinUrl: z.string().url().optional().openapi({ example: "https://www.linkedin.com/in/ejemplo" }),
    motivation: z.string().optional().openapi({ example: "Quiero colaborar con la revisión técnica de solicitudes." }),
    supportingDocuments: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          size: z.number().int().positive(),
          storage_path: z.string(),
        })
      )
      .optional(),
    consent: z.boolean().openapi({ example: true }),
  })
  .openapi("EngineerApplicationSubmit");

export const engineerApplicationRecordSchema = engineerApplicationSubmitSchema.omit({ consent: true })
  .extend({
    id: z.string().uuid().openapi({ example: "e2f7b9f2-c0f5-4f09-9c8a-3d6f1c6eb3cb" }),
    application_status: engineerApplicationStatusSchema.openapi({ example: "pending" }),
    is_certified: z.boolean().openapi({ example: false }),
    reviewed_by: z.string().uuid().nullable().optional(),
    reviewed_at: z.string().datetime().nullable().optional(),
    review_notes: z.string().nullable().optional(),
    created_at: z.string().datetime().openapi({ example: "2026-06-28T01:45:00Z" }),
    updated_at: z.string().datetime().openapi({ example: "2026-06-28T01:45:00Z" }),
  })
  .openapi("EngineerApplicationRecord");

export const engineerApplicationsResponseSchema = z
  .object({
    data: z.array(engineerApplicationRecordSchema),
  })
  .openapi("EngineerApplicationsEnvelope");

// Typed photo evidence (see docs/ai-analysis-flow.md). The triad is required;
// supplementary photos are optional extra evidence.
export const photoTierSchema = z.enum(["triad", "supplementary"]).openapi("PhotoTier");
export const viewTypeSchema = z.enum(["general", "intermedia", "acercamiento"]).openapi("ViewType");
export const guideTypeSchema = z.enum(["exterior", "columna", "puerta-ventana", "otro"]).openapi("GuideType");
export const photoTypeSchema = z.union([viewTypeSchema, guideTypeSchema]).openapi("PhotoType");
export const photoIssueSchema = z
  .enum(["blurry", "dark", "wrong_distance", "irrelevant", "inappropriate"])
  .nullable()
  .openapi("PhotoIssue");

// Per-photo descriptor uploaded alongside each file, index-aligned with fotos[].
export const photoMetaSchema = z
  .object({
    tier: photoTierSchema,
    type: photoTypeSchema,
  })
  .openapi("PhotoMeta");

// Per-photo quality/relevance gating returned by the analysis call.
export const photoGatingSchema = z
  .object({
    index: z.number().int().openapi({ example: 0 }),
    tier: photoTierSchema,
    viewType: photoTypeSchema,
    usable: z.boolean().openapi({ example: true }),
    issue: photoIssueSchema,
  })
  .openapi("PhotoGating");

export const observationSchema = z
  .object({
    viewType: photoTypeSchema,
    seen: z.string().openapi({ example: "Sala con grieta diagonal en muro norte." }),
  })
  .openapi("Observation");

export const analysisResultSchema = z
  .object({
    verdict: analysisVerdictSchema.nullable().openapi({ example: "severe" }),
    confidence: z.number().int().min(0).max(100).openapi({ example: 72 }),
    finding: z.string().openapi({ example: "Grieta estructural en muro portante." }),
    observations: z.array(observationSchema).openapi({ example: [] }),
    paintingVsStructural: z.string().nullable().openapi({ example: "La grieta atraviesa el sustrato." }),
    photos: z.array(photoGatingSchema).openapi({ example: [] }),
    validTriadViews: z.number().int().min(0).max(3).openapi({ example: 2 }),
    showAuthorities: z.boolean().openapi({ example: true }),
  })
  .openapi("AnalysisResult");

export const analysisUploadSchema = z
  .object({
    fotos: z.array(z.instanceof(File)).min(1).max(10).openapi({ example: [] }),
    photo_meta: z.array(photoMetaSchema).min(1).max(10).openapi({ example: [] }),
  })
  .openapi("AnalysisUpload");

export const incidentPhotoSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "c4c6b5d3-8b6a-4b6a-a0c5-4d5b3ccf7f6a" }),
    incident_id: z.string().uuid().openapi({ example: "a2e4fce1-9a14-4df2-bf1b-4d6c4b4b5d41" }),
    storage_path: z.string().openapi({ example: "incidents/abc/photo-1.jpg" }),
    position: z.number().int().openapi({ example: 0 }),
    tier: photoTierSchema.nullable().optional(),
    view_type: photoTypeSchema.nullable().optional(),
    quality: z.string().nullable().optional().openapi({ example: "usable" }),
    verdict: verdictLevelSchema.nullable().optional(),
    confidence: z.number().int().min(0).max(100).nullable().optional(),
    finding: z.string().nullable().optional(),
    escalated: z.boolean().openapi({ example: false }),
    created_at: z.string().datetime().openapi({ example: "2026-06-27T12:00:00Z" }),
  })
  .openapi("IncidentPhoto");

// Feed-level provenance, embedded on incident responses for attribution.
// Aggregated rows carry a source; native citizen rows resolve to the 'citizen'
// source. License/url/attribution drive public CC BY-style credits.
export const sourceSchema = z
  .object({
    code: z.string().openapi({ example: "copernicus-emsr884" }),
    name: z.string().openapi({ example: "Copernicus EMS — EMSR884 La Guaira" }),
    license: z.string().nullable().optional().openapi({ example: "CC-BY-4.0" }),
    url: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: "https://emergency.copernicus.eu/mapping/list-of-components/EMSR884" }),
    attribution: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: "© Copernicus Emergency Management Service (EMSR884), CC BY 4.0" }),
  })
  .openapi("Source");

export const incidentResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "a2e4fce1-9a14-4df2-bf1b-4d6c4b4b5d41" }),
    ai_verdict: verdictLevelSchema.nullable().optional(),
    confidence: z.number().int().min(0).max(100).nullable().optional(),
    finding: z.string().nullable().optional(),
    analysis_status: analysisStatusSchema.openapi({ example: "complete" }),
    raw_ai: z.record(z.string(), z.unknown()).nullable().optional(),
    severity: verdictLevelSchema.nullable().optional(),
    state: incidentStateSchema.openapi({ example: "pending" }),
    assigned_to: z.string().uuid().nullable().optional(),
    feedback: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    address: z.string().nullable().optional(),
    contact: z.string().nullable().optional(),
    building_use: z.string().nullable().optional(),
    build_year: z.number().int().nullable().optional(),
    levels: z.number().int().nullable().optional(),
    basements: z.number().int().nullable().optional(),
    material: z.string().nullable().optional(),
    terrain_type: z.string().nullable().optional(),
    created_at: z.string().datetime().openapi({ example: "2026-06-27T12:00:00Z" }),
    updated_at: z.string().datetime().openapi({ example: "2026-06-27T12:00:00Z" }),
    // Provenance (aggregator). `source` is null for legacy rows; ingest/server set it.
    source: sourceSchema.nullable().optional(),
    source_ref: z.string().nullable().optional().openapi({ example: "42" }),
    synced_at: z.string().datetime().nullable().optional(),
    photos: z.array(incidentPhotoSchema).optional(),
  })
  .openapi("Incident");

export const incidentListItemSchema = incidentResponseSchema
  .pick({
    id: true,
    state: true,
    severity: true,
    analysis_status: true,
    ai_verdict: true,
    confidence: true,
    finding: true,
    assigned_to: true,
    created_at: true,
    updated_at: true,
    contact: true,
    building_use: true,
    source: true,
  })
  .openapi("IncidentListItem");

export const incidentCreateRequestSchema = z
  .object({
    contact: z.string().optional(),
    building_use: z.string().optional(),
    build_year: z.number().int().optional(),
    levels: z.number().int().optional(),
    basements: z.number().int().optional(),
    material: z.string().optional(),
    terrain_type: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
    feedback: z.string().optional(),
    state: incidentStateSchema.optional(),
    severity: verdictLevelSchema.optional(),
    ai_verdict: verdictLevelSchema.optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    finding: z.string().optional(),
    analysis_status: analysisStatusSchema.optional(),
    assigned_to: z.string().uuid().optional(),
    raw_ai: z.record(z.string(), z.unknown()).optional(),
    analysis: z
      .object({
        verdict: analysisVerdictSchema,
        confidence: z.number().int().min(0).max(100),
        finding: z.string(),
      })
      .optional(),
  })
  .openapi("IncidentCreateRequest");

export const incidentUpdateRequestSchema = incidentCreateRequestSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })
  .openapi("IncidentUpdateRequest");

export const authMeResponseSchema = z
  .object({
    data: sessionResponseSchema,
  })
  .openapi("AuthMeEnvelope");

export const incidentListResponseSchema = z
  .object({
    data: z.array(incidentListItemSchema),
  })
  .openapi("IncidentListEnvelope");

export const incidentResponseEnvelopeSchema = z
  .object({
    data: incidentResponseSchema,
  })
  .openapi("IncidentEnvelope");

export const analysisResponseEnvelopeSchema = z
  .object({
    data: analysisResultSchema,
  })
  .openapi("AnalysisEnvelope");
