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

    expect(screen.getByRole("heading", { name: /Verify an/i })).toBeInTheDocument();

    // Select standard image (triggers verify_hash_exit.json in MSW)
    const file = new File(["sample_bytes"], "sample.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", { name: /Verify image/i });
    fireEvent.click(submitBtn);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText("Match found.")).toBeInTheDocument();
    });

    // Check Decided By badge and stage ticket stub
    expect(screen.getAllByText(/STAGE 1 · HASH/i).length).toBeGreaterThanOrEqual(1);

    // Check Embedding stage is marked as skipped
    expect(screen.getByText("SKIPPED")).toBeInTheDocument();

    // Check Candidates list heading and inspect evidence link
    expect(screen.getByText("Matched candidates")).toBeInTheDocument();
    expect(screen.getByText("Aarav Mehta")).toBeInTheDocument();
    expect(screen.getByText("Inspect Evidence")).toBeInTheDocument();
  });

  it("verifies escalated image, showing all 3 stages with Stage 0 miss and No Match verdict", async () => {
    renderWithProviders(<VerifyPage />);

    // Select escalated image (triggers verify_escalated.json in MSW)
    const file = new File(["escalated_bytes"], "escalated.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", { name: /Verify image/i });
    fireEvent.click(submitBtn);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText("No match found.")).toBeInTheDocument();
    });

    // Heading for candidates says Nearest candidates (no match)
    expect(screen.getByText("Nearest candidates (no match)")).toBeInTheDocument();

    // Verify all 3 stages rendered with Stage 0, Stage 1, Stage 2
    expect(screen.getByText("STAGE 0 · SHA-256")).toBeInTheDocument();
    expect(screen.getByText("STAGE 1 · HASH")).toBeInTheDocument();
    expect(screen.getByText("STAGE 2 · EMBEDDING")).toBeInTheDocument();

    // Stage 0 miss is neutral without red fail
    expect(screen.getByText("→ Miss · next stage")).toBeInTheDocument();
  });
});
