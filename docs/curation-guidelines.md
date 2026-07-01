# Curation Guidelines

## Guardrails

- Dataset observations are not diagnostic claims.
- Related disease records from literature or databases are not equivalent to dataset detection.
- SHAP/model importance is candidate evidence only.
- Artifact flags should be visible and conservative.

## Compound Identity

Prefer PubChem CID as the required identifier. Add InChIKey, SMILES, HMDB, KEGG, CAS, ChEBI, DrugBank, UniProt, and PDB IDs as separate external identifier rows.

## Evidence

Evidence records should capture:

- evidence type
- mechanism or biological context
- disease context
- key finding
- source
- confidence/evidence level
- reference or link

## Notes

Notes should be short, readable text. Keep raw source JSON in `source_payloads`.
