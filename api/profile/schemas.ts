import { z } from "@hono/zod-openapi";

// Engineer profile DTOs. The profile maps onto existing `engineers` columns
// plus `phone` (migration 20260630200000). Email/role/is_certified are
// read-only (derived from auth / certification), so they are returned but not
// accepted on PATCH.

export const profileSchema = z
  .object({
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    documentNumber: z.string().nullable(), // cédula
    licenseNumber: z.string().nullable(), // N° CIV
    specialty: z.string().nullable(),
    phone: z.string().nullable(),
    city: z.string().nullable(), // zona asignada
    isCertified: z.boolean(),
    role: z.enum(["engineer", "admin"]),
  })
  .openapi("Profile");

export type Profile = z.infer<typeof profileSchema>;

// Editable subset (PATCH). All optional; only provided keys are updated.
export const profileUpdateSchema = z
  .object({
    fullName: z.string().max(160).optional(),
    documentNumber: z.string().max(40).optional(),
    licenseNumber: z.string().max(40).optional(),
    specialty: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(120).optional(),
  })
  .openapi("ProfileUpdate");

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
