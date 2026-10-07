import { describe, expect, it } from "vitest";
import {
  ApiError,
  formatErrorMessage,
  getHealth,
  getRegistrationRecord,
  registerImage,
  verifyImage,
} from "../api/client";

describe("API Client & Error Handling", () => {
  it("parses ApiError correctly with status, code, and retryAfter", () => {
    const error = new ApiError("Too many requests", 429, "rate_limited", 30);
    expect(error.status).toBe(429);
    expect(error.code).toBe("rate_limited");
    expect(error.retryAfter).toBe(30);
    expect(formatErrorMessage(error)).toBe("Rate limit exceeded. Please retry after 30 seconds.");
  });

  it("formats user-friendly messages for standard error codes", () => {
    expect(formatErrorMessage(new ApiError("bad", 400, "invalid_image"))).toBe(
      "bad",
    );
    expect(formatErrorMessage(new ApiError("large", 413, "too_large"))).toBe(
      "large",
    );
    expect(formatErrorMessage(new ApiError("busy", 503, "busy"))).toBe(
      "Server is busy with inference models. Please retry shortly.",
    );
    expect(formatErrorMessage(new ApiError("missing", 404, "not_found"))).toBe(
      "missing",
    );
  });

  it("successfully fetches health endpoint via MSW mock", async () => {
    const health = await getHealth();
    expect(health.status).toBe("ok");
    expect(health.database).toBe("ok");
    expect(health.models_loaded.clip).toBe(true);
    expect(health.models_loaded.dino).toBe(true);
  });

  it("handles 201 response from registerImage", async () => {
    const file = new File(["dummy_bytes"], "sample.png", { type: "image/png" });
    const res = await registerImage(file, "Aarav Mehta");
    expect(res.image_id).toBe("7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01");
    expect(res.fingerprints.phash).toBe("c3a1f0e4b2d59687");
  });

  it("handles 409 conflict error from registerImage", async () => {
    const file = new File(["conflict_bytes"], "conflict.png", {
      type: "image/png",
    });
    let thrownError: unknown = null;
    try {
      await registerImage(file);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ApiError);
    const apiErr = thrownError as ApiError;
    expect(apiErr.status).toBe(409);
    expect(apiErr.code).toBe("near_duplicate");
    expect(apiErr.conflictData?.reason).toBe("dino_cosine");
    expect(apiErr.conflictData?.thresholds.hamming_conflict_max).toBe(8);
  });

  it("handles verifyImage response", async () => {
    const file = new File(["test_bytes"], "sample.png", { type: "image/png" });
    const res = await verifyImage(file);
    expect(res.decided_by).toBe("hash");
    expect(res.verdict).toBe("match");
    expect(res.candidates.length).toBe(1);
  });

  it("fetches registration record", async () => {
    const record = await getRegistrationRecord("7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01");
    expect(record.record_type).toBe("provnet.registration_record");
    expect(record.owner_name).toBe("Aarav Mehta");
  });
});
