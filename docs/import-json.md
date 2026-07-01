# Curated JSON Import

Use `/imports` or `POST /api/import/compounds-json` with a multipart `file` field. Add `?dryRun=1` to validate and summarize without writing.

## Expected Shape

```json
{
  "compounds": [
    {
      "identifiers": {
        "pubchem_cid": "460",
        "common_name": "Guaiacol",
        "iupac_name": "2-methoxyphenol",
        "formula": "C7H8O2",
        "inchikey": "LHGVFZTZFXWLCP-UHFFFAOYSA-N",
        "smiles": "COC1=CC=CC=C1O"
      }
    }
  ]
}
```

## Normalized Blocks

The importer maps:

- identity, names, synonyms
- external identifiers
- classifications and compound types
- artifact assessment
- annotation confidence
- peaktable presence
- related diseases
- literature/human/respiratory evidence
- references
- pathways
- targets/interactions
- PDB structures
- raw source payload

## Visible Text Policy

Do not store large objects as visible note or evidence text. Complex blocks are converted into readable lines such as source, title, mechanism, disease context, key finding, confidence, URL, DOI, or PMID. The full original object is stored in `source_payloads`.

## Validation

Each compound requires a valid positive PubChem CID. Invalid records are reported as warnings in the import summary and do not block valid records in the same file.
