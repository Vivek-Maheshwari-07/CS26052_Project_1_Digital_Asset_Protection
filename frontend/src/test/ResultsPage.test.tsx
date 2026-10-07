import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultsDashboardPage } from '../pages/ResultsDashboardPage';
import { ThemeProvider } from '../context/ThemeContext';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

describe('ResultsDashboardPage Component', () => {
  it('renders benchmark KPI tiles and robustness heatmap from summary fixture', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ResultsDashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    // Header should render
    expect(screen.getByText(/The/i)).toBeInTheDocument();
    expect(screen.getByText(/results/i)).toBeInTheDocument();

    // KPI row items should render
    await waitFor(() => {
      expect(screen.getByText('ORIGINALS')).toBeInTheDocument();
    });
    expect(screen.getByText('HARD NEGATIVES')).toBeInTheDocument();
    expect(screen.getByText('CASCADE ACCURACY')).toBeInTheDocument();
    expect(screen.getByText('ESCALATION RATE')).toBeInTheDocument();

    // Heatmap title should render
    expect(screen.getByText('Recall Heatmap Matrix')).toBeInTheDocument();
  });

  it('renders empty state with terminal instructions when no benchmark runs exist', async () => {
    // Override runs handler to return an empty array
    server.use(
      http.get('/api/benchmark/runs', () => {
        return HttpResponse.json([]);
      })
    );

    render(
      <ThemeProvider>
        <MemoryRouter>
          <ResultsDashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Benchmark Runs Found')).toBeInTheDocument();
    });

    expect(screen.getByText('python -m bench.make_manifest')).toBeInTheDocument();
    expect(screen.getByText('python -m bench.attack')).toBeInTheDocument();
    expect(screen.getByText('python -m bench.evaluate --write-db')).toBeInTheDocument();
  });
});
