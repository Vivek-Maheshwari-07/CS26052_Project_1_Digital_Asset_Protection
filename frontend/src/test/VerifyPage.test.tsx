import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { QueryImageProvider } from "../context/QueryImageContext";
import { ThemeProvider } from "../context/ThemeContext";
import { VerifyPage } from "../pages/VerifyPage";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <QueryImageProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryImageProvider>
    </ThemeProvider>,
  );
}

describe("VerifyPage Component", () => {
  it("verifies image with hash-exit, showing embedding skipped and cosines not computed", async () => {
    renderWithProviders(<VerifyPage />);

    expect(screen.getByText("Verify Query Asset")).toBeInTheDocument();

    // Select standard image (triggers verify_hash_exit.json in MSW)
    const file = new File(["sample_bytes"], "sample.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", { name: /Run Verification/i });
    fireEvent.click(submitBtn);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/Verdict: Match Found/i)).toBeInTheDocument();
    });

    // Check Decided By badge
    expect(screen.getByText("Decided by: Hash")).toBeInTheDocument();

    // Check Embedding stage is marked as skipped
    expect(screen.getByText("Skipped (Hash Exit)")).toBeInTheDocument();

    // Check Cosine panel displays "— not computed"
    const notComputedElements = screen.getAllByText("— not computed");
    expect(notComputedElements.length).toBeGreaterThanOrEqual(2);

    // Check Candidates list
    expect(screen.getByText("Aarav Mehta")).toBeInTheDocument();
    expect(screen.getByText("Open evidence")).toBeInTheDocument();
  });

  it("verifies escalated image, showing all 3 stages and No Match badge", async () => {
    renderWithProviders(<VerifyPage />);

    // Select escalated image (triggers verify_escalated.json in MSW)
    const file = new File(["escalated_bytes"], "escalated.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", { name: /Run Verification/i });
    fireEvent.click(submitBtn);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/Verdict: No Match Found/i)).toBeInTheDocument();
    });

    // Check Decided by No match badge
    expect(screen.getByText("Decided by: No match")).toBeInTheDocument();

    // Verify all 3 stages executed
    expect(screen.getByText("1. SHA-256 Exact")).toBeInTheDocument();
    expect(screen.getByText("2. Hash Check (SQL)")).toBeInTheDocument();
    expect(screen.getByText("3. Embedding (DINO/CLIP)")).toBeInTheDocument();
    expect(screen.getByText("Escalated (d_H=12)")).toBeInTheDocument();
  });
});
