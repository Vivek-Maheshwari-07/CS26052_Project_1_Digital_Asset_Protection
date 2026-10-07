import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EvidencePage } from '../pages/EvidencePage';
import { QueryImageProvider } from '../context/QueryImageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useQueryImage } from '../context/useQueryImage';
import verifyHashExit from '../../../backend/tests/fixtures/spec_examples/verify_hash_exit.json';
import type { VerifyResponse } from '../api/types';
import React, { useEffect } from 'react';

// Helper component to initialize QueryImageContext with custom mock data
const TestContextInitializer: React.FC<{
  file?: File | null;
  verifyRes?: VerifyResponse | null;
  children: React.ReactNode;
}> = ({ file, verifyRes, children }) => {
  const { setQueryData } = useQueryImage();

  useEffect(() => {
    if (file !== undefined && verifyRes !== undefined) {
      setQueryData(file, verifyRes);
    }
  }, [file, verifyRes, setQueryData]);

  return <>{children}</>;
};

describe('EvidencePage Component', () => {
  it('shows "Evidence session expired" state when context is empty', async () => {
    render(
      <ThemeProvider>
        <QueryImageProvider>
          <MemoryRouter initialEntries={['/evidence/unknown-id']}>
            <Routes>
              <Route path="/evidence/:verificationId" element={<EvidencePage />} />
            </Routes>
          </MemoryRouter>
        </QueryImageProvider>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { name: /evidence session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-run verification/i })).toBeInTheDocument();
  });

  it('renders Classical panel immediately and triggers on-demand /verify/deep for null cosines', async () => {
    const mockFile = new File(['mock content'], 'test_query.png', { type: 'image/png' });
    const mockResponse = verifyHashExit as unknown as VerifyResponse;

    render(
      <ThemeProvider>
        <QueryImageProvider>
          <TestContextInitializer file={mockFile} verifyRes={mockResponse}>
            <MemoryRouter
              initialEntries={[`/evidence/${mockResponse.verification_id}?candidate=${mockResponse.candidates[0].image_id}`]}
            >
              <Routes>
                <Route path="/evidence/:verificationId" element={<EvidencePage />} />
              </Routes>
            </MemoryRouter>
          </TestContextInitializer>
        </QueryImageProvider>
      </ThemeProvider>
    );

    // Header and Classical panel should render immediately
    expect(screen.getByRole('heading', { name: /the evidence/i })).toBeInTheDocument();
    expect(screen.getByText('Hamming Distances (/64)')).toBeInTheDocument();

    // Deep panel should resolve and display the computed on-demand cosine values
    await waitFor(() => {
      expect(screen.getByText('0.9654')).toBeInTheDocument();
    });
    expect(screen.getByText('0.9412')).toBeInTheDocument();
    expect(screen.getByText(/computed on demand/i)).toBeInTheDocument();
  });

  it('leaves Classical panel intact when deep verification encounters an error', async () => {
    const mockFile = new File(['deep_error'], 'deep_error.png', { type: 'image/png' });
    const mockResponse = verifyHashExit as unknown as VerifyResponse;

    render(
      <ThemeProvider>
        <QueryImageProvider>
          <TestContextInitializer file={mockFile} verifyRes={mockResponse}>
            <MemoryRouter
              initialEntries={[`/evidence/${mockResponse.verification_id}?candidate=${mockResponse.candidates[0].image_id}`]}
            >
              <Routes>
                <Route path="/evidence/:verificationId" element={<EvidencePage />} />
              </Routes>
            </MemoryRouter>
          </TestContextInitializer>
        </QueryImageProvider>
      </ThemeProvider>
    );

    // Classical panel remains fully intact
    expect(screen.getByText('Hamming Distances (/64)')).toBeInTheDocument();

    // Deep panel displays the error message without crashing the page
    await waitFor(() => {
      expect(screen.getByText(/inference pipeline busy/i)).toBeInTheDocument();
    });
  });
});
