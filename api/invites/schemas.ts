import { z } from "@hono/zod-openapi";

// Engineer invite-source DTOs. Admin-managed named links (/join/<token>) whose
// source is recorded on the engineer application. Approval is unchanged.

export const inviteCreateSchema = z
  .object({
    name: z.string().min(2).max(80),
  })
  .openapi("InviteCreate");

export const inviteUpdateSchema = z
  .object({
    isActive: z.boolean(),
  })
  .openapi("InviteUpdate");

export const inviteSourceSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    token: z.string(),
    url: z.string(),
    isActive: z.boolean(),
    count: z.number().int(),
    createdAt: z.string(),
  })
  .openapi("InviteSource");

export type InviteCreate = z.infer<typeof inviteCreateSchema>;
export type InviteUpdate = z.infer<typeof inviteUpdateSchema>;
export type InviteSource = z.infer<typeof inviteSourceSchema>;
