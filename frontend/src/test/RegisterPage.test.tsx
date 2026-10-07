import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { RegisterPage } from "../pages/RegisterPage";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </ThemeProvider>,
  );
}

describe("RegisterPage Component", () => {
  it("renders registration form and uploads image successfully (201)", async () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole("heading", { name: /register your work/i })).toBeInTheDocument();

    const file = new File(["fake_img_bytes"], "my_photo.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Select file
    fireEvent.change(input, { target: { files: [file] } });

    // Fill owner name
    const ownerInput = screen.getByLabelText(/Owner Name/i);
    fireEvent.change(ownerInput, { target: { value: "Aarav Mehta" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Register work/i });
    fireEvent.click(submitBtn);

    // Wait for success card
    await waitFor(() => {
      expect(screen.getByText("Registration Complete.")).toBeInTheDocument();
    });

    // Check perceptual bit-grids rendered
    expect(screen.getByTestId("bitgrid-phash")).toBeInTheDocument();
    expect(screen.getByTestId("bitgrid-dhash")).toBeInTheDocument();
    expect(screen.getByTestId("bitgrid-ahash")).toBeInTheDocument();
    expect(screen.getByTestId("bitgrid-whash")).toBeInTheDocument();

    // Check disclaimer note
    expect(
      screen.getByText(/not proof of ownership or copyright/i),
    ).toBeInTheDocument();

    // Check actions
    expect(screen.getByRole("button", { name: /View record/i })).toBeInTheDocument();
  });

  it("handles 409 conflict and renders two separate panels without combined scores", async () => {
    renderWithProviders(<RegisterPage />);

    // Upload file that triggers 409 in MSW handler (conflict.png)
    const file = new File(["conflict_bytes"], "conflict.png", { type: "image/png" });
    const input = document.getElementById("image-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const ownerInput = screen.getByLabelText(/Owner Name/i);
    fireEvent.change(ownerInput, { target: { value: "Aarav Mehta" } });

    const submitBtn = screen.getByRole("button", { name: /Register work/i });
    fireEvent.click(submitBtn);

    // Wait for Conflict Modal
    await waitFor(() => {
      expect(screen.getByText("Registration Conflict (409)")).toBeInTheDocument();
    });

    // Verify Panel 1: Classical Hashes
    expect(screen.getByText("Hamming Distances (/64)")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument(); // phash distance

    // Verify Panel 2: Deep Embeddings
    expect(screen.getByText("Cosine Similarity ([-1, 1])")).toBeInTheDocument();
    expect(screen.getByText("0.9612")).toBeInTheDocument(); // dino cosine

    // Ensure NO combined/percentage scores exist anywhere in the modal
    const modalContent = screen.getByText("Registration Conflict (409)").closest("div")?.parentElement?.textContent || "";
    expect(modalContent).not.toMatch(/\d+%\s*match/i);
    expect(modalContent).not.toMatch(/overall\s*score/i);
    expect(modalContent).not.toMatch(/combined\s*score/i);
  });
});
