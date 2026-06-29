import { z } from "zod";

export const compoundJsonImportSchema = z.object({
  pubchem_cid: z.number().int().positive(),
  common_name: z.string().optional(),
  iupac_name: z.string().optional(),
  molecular_formula: z.string().optional(),
  molecular_weight: z.number().optional(),
  names: z.array(z.string()).default([]),
  related_diseases: z.array(z.unknown()).default([]),
  dataset_presence: z.array(z.unknown()).default([]),
  external_identifiers: z.record(z.string()).optional(),
  pathways: z.array(z.unknown()).default([]),
  targets: z.array(z.unknown()).default([])
});

export type CompoundJsonImport = z.infer<typeof compoundJsonImportSchema>;

export function validateCompoundJsonImport(payload: unknown) {
  return compoundJsonImportSchema.parse(payload);
}
