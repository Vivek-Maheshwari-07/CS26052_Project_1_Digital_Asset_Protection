/**
 * ProvNet API Client.
 * Typed fetch client with standard ApiError parsing and Retry-After handling.
 */

import type {
  BenchmarkRunInfo,
  BenchmarkSummary,
  ConflictResponse,
  DeepVerifyResponse,
  HealthResponse,
  ImageDetail,
  RegisterResponse,
  RegistrationRecord,
  VerifyResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter: number | null;
  conflictData?: ConflictResponse;

  constructor(
    message: string,
    status: number,
    code: string = "error",
    retryAfter: number | null = null,
    conflictData?: ConflictResponse,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.conflictData = conflictData;
  }
}

export function formatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429 && err.retryAfter) {
      return `Rate limit exceeded. Please retry after ${err.retryAfter} seconds.`;
    }
    switch (err.code) {
      case "invalid_image":
        return err.message || "Invalid image file. Please choose a valid image.";
      case "too_large":
        return err.message || "Image exceeds the 10 MB limit.";
      case "unsupported_format":
        return err.message || "Unsupported image format. Only JPEG, PNG, and WebP are allowed.";
      case "validation_error":
        return err.message || "Request validation error.";
      case "rate_limited":
        return `Rate limit exceeded.${err.retryAfter ? ` Retry in ${err.retryAfter}s.` : ""}`;
      case "busy":
        return "Server is busy with inference models. Please retry shortly.";
      case "not_found":
        return err.message || "Requested resource was not found.";
      default:
        return err.message || "An unexpected API error occurred.";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  const retryAfterHeader = res.headers.get("Retry-After");
  const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;

  let errorBody: { error?: string; message?: string; [key: string]: unknown } | null = null;
  try {
    errorBody = await res.json();
  } catch {
    // Non-JSON response body
  }

  const code = errorBody?.error || (res.status === 404 ? "not_found" : "error");
  const message = errorBody?.message || res.statusText || `HTTP ${res.status}`;

  if (res.status === 409) {
    throw new ApiError(
      message,
      409,
      code,
      retryAfter,
      errorBody as unknown as ConflictResponse,
    );
  }

  throw new ApiError(message, res.status, code, retryAfter);
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  return handleResponse<HealthResponse>(res);
}

export async function registerImage(
  file: File,
  ownerName?: string,
): Promise<RegisterResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (ownerName && ownerName.trim()) {
    formData.append("owner_name", ownerName.trim().slice(0, 100));
  }

  const res = await fetch("/api/register", {
    method: "POST",
    headers: {
      "X-Filename": encodeURIComponent(file.name || ""),
    },
    body: formData,
  });

  return handleResponse<RegisterResponse>(res);
}

export async function verifyImage(file: File): Promise<VerifyResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/verify", {
    method: "POST",
    headers: {
      "X-Filename": encodeURIComponent(file.name || ""),
    },
    body: formData,
  });

  return handleResponse<VerifyResponse>(res);
}

export async function verifyImageDeep(
  file: File,
  verificationId: string,
): Promise<DeepVerifyResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("verification_id", verificationId);

  const res = await fetch("/api/verify/deep", {
    method: "POST",
    headers: {
      "X-Filename": encodeURIComponent(file.name || ""),
    },
    body: formData,
  });

  return handleResponse<DeepVerifyResponse>(res);
}

export async function getImageDetail(imageId: string): Promise<ImageDetail> {
  const res = await fetch(`/api/images/${encodeURIComponent(imageId)}`);
  return handleResponse<ImageDetail>(res);
}

export function getImageFileUrl(imageId: string, size: "full" | "thumb" = "full"): string {
  return `/api/images/${encodeURIComponent(imageId)}/file?size=${size}`;
}

export async function getRegistrationRecord(
  imageId: string,
  download: boolean = false,
): Promise<RegistrationRecord> {
  const url = `/api/images/${encodeURIComponent(imageId)}/record${download ? "?download=true" : ""}`;
  const res = await fetch(url);
  return handleResponse<RegistrationRecord>(res);
}

export async function getBenchmarkRuns(): Promise<BenchmarkRunInfo[]> {
  const res = await fetch("/api/benchmark/runs");
  return handleResponse<BenchmarkRunInfo[]>(res);
}

export async function getBenchmarkSummary(runId?: string): Promise<BenchmarkSummary> {
  const url = runId
    ? `/api/benchmark/summary?run_id=${encodeURIComponent(runId)}`
    : "/api/benchmark/summary";
  const res = await fetch(url);
  return handleResponse<BenchmarkSummary>(res);
}

export function getBenchmarkResultsCsvUrl(runId?: string): string {
  return runId
    ? `/api/benchmark/results.csv?run_id=${encodeURIComponent(runId)}`
    : "/api/benchmark/results.csv";
}

export async function getBenchmarkResultsCsv(runId?: string): Promise<string> {
  const url = getBenchmarkResultsCsvUrl(runId);
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(`Failed to fetch benchmark CSV: ${res.statusText}`, res.status);
  }
  return res.text();
}

export const getImageRecord = getRegistrationRecord;
export const fetchBenchmarkResultsCsv = getBenchmarkResultsCsv;
