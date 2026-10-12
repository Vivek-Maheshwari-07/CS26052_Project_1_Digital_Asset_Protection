# Provenance / origin evaluation

Labelled set: 40 files scored (10 generated xmp_synthetic files; 0 listed but missing).

| expected \ predicted | c2pa_valid | c2pa_ai | credential_invalid | invalid | xmp_ai | none | correct |
|---|---|---|---|---|---|---|---|
| c2pa_valid | 0 | 5 | 5 | 0 | 0 | 0 | 5/10 |
| invalid | 0 | 0 | 0 | 10 | 0 | 0 | 10/10 |
| none | 0 | 0 | 0 | 0 | 0 | 10 | 10/10 |
| xmp_ai | 0 | 0 | 0 | 0 | 10 | 0 | 10/10 |

C2PA verdicts seen (expected, verdict, failure codes, image decodable):

- ('none', None, '', True): 10
- ('xmp_ai', None, '', True): 10
- ('c2pa_valid', 'valid', 'signingCredential.untrusted', True): 5
- ('invalid', 'tampered', 'assertion.dataHash.mismatch;signingCredential.untrusted', False): 5
- ('c2pa_valid', 'credential_invalid', 'signingCredential.invalid;signingCredential.untrusted', True): 5
- ('invalid', 'tampered', 'assertion.dataHash.mismatch;signingCredential.invalid;signingCredential.untrusted', False): 5

`signingCredential.untrusted` is always present (no trust list configured) and is not counted as a failure; `credential_invalid` means the manifest is intact but its signing certificate is invalid or expired.

## Gemini AI edits (should declare AI): 75 files

- C2PA manifest found: 75  (states: {'Valid': 75})
- AI generation declared (C2PA or XMP): 75
- any provenance reported: 75
- generators: {}

## WhatsApp copies: 49 files

- C2PA manifest found: 0  (states: {})
- AI generation declared (C2PA or XMP): 0
- any provenance reported: 0
- generators: {}

## Originals: 104 files

- C2PA manifest found: 0  (states: {})
- AI generation declared (C2PA or XMP): 0
- any provenance reported: 0
- generators: {}
