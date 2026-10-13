/** Response shapes of the FastAPI backend, kept next to the endpoints that return them. */

/** GET /api/works → RegisterResponse[] (backend/app/api/register.py). */
export type Work = {
  id: string
  owner_name: string
  title: string
  created_at: string
  entry_hash: string
  prev_hash: string
  phash: string
  width: number | null
  height: number | null
  image_url: string | null
  /** Set by OpenTimestamps anchoring: `pending` once submitted, `failed` if the calendars refused it. */
  anchor_status: 'pending' | 'failed' | string | null
  low_detail: boolean | null
}

export type Verdict = 'likely_match' | 'possible_match' | 'no_match'

/** GET /api/checks → summary rows from `_check_response(full=False)` (backend/app/api/check.py). */
export type CheckSummary = {
  id: string
  created_at: string
  query_image_url: string | null
  query_phash: string
  query_low_detail: boolean | null
  filename: string | null
  top_verdict: Verdict
  top_confidence: number
  top_title: string | null
  match_count: number
  gate_claim: { classification: string; [key: string]: unknown } | null
}

/** GET /api/registry/status (backend/app/api/public.py). */
export type RegistryStatus = {
  valid: boolean
  broken_id: string | null
  length: number
  head_hash: string | null
  checked_at: string
}

/** GET /api/discover (backend/app/api/discover.py): placeholder works used to test the registry at scale. */
export type SampleItem = {
  id: string
  title: string
  creator: string
  image_url: string
  width: number
  height: number
}

export type SamplePage = {
  items: SampleItem[]
  total: number
  offset: number
  next_offset: number | null
  sample: true
}
