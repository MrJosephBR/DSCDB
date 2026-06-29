import { z } from "zod";

export const createCompoundSchema = z.object({
  pubchemCid: z.number().int().positive(),
  commonName: z.string().trim().min(1).optional(),
  iupacName: z.string().trim().min(1).optional(),
  molecularFormula: z.string().trim().min(1).optional(),
  molecularWeight: z.coerce.number().positive().optional(),
  annotationSummary: z.string().trim().optional(),
  names: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        nameType: z.enum(["common", "synonym", "iupac", "trade", "other"]).default("synonym")
      })
    )
    .default([])
});

export const updateCompoundSchema = createCompoundSchema.partial().extend({
  pubchemCid: z.number().int().positive().optional()
});

export type CreateCompoundInput = z.infer<typeof createCompoundSchema>;
export type UpdateCompoundInput = z.infer<typeof updateCompoundSchema>;
