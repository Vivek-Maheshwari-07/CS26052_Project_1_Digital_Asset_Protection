import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { CheckSummary, Work } from '@/lib/models'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'

const ENTRY = 'cc7549bc1c0e2b9a7d4f1e3a5b6c7d8e9f0a1b2c3d4e5f60718293a4c1ff5b06'

function work(i: number, title: string, created: string): Work {
  return {
    id: `w-${i}`,
    owner_name: 'Vivek Maheshwari',
    title,
    created_at: created,
    entry_hash: i === 0 ? ENTRY : `${String(i).repeat(64)}`.slice(0, 64),
    prev_hash: 'GENESIS',
    phash: 'c860f2723a3d1d1f',
    width: 800,
    height: 1000,
    image_url: `/uploads/w-${i}.png`,
    anchor_status: i === 0 ? 'pending' : null,
    low_detail: false,
  }
}

const WORKS = [
  work(0, 'Harbour at Blue Hour', '2026-10-10T10:00:00+00:00'),
  work(1, 'Paper Cranes No. 4', '2026-10-12T10:00:00+00:00'),
]
const CHECKS: CheckSummary[] = [
  {
    id: 'c-1',
    created_at: '2026-10-12T11:00:00+00:00',
    query_image_url: '/uploads/q.png',
    query_phash: 'c860f2723a3d1d1f',
    query_low_detail: false,
    filename: 'suspect.jpg',
    top_verdict: 'likely_match',
    top_confidence: 0.981,
    top_title: 'Harbour at Blue Hour',
    match_count: 1,
    gate_claim: null,
  },
]

function mockApi(routes: Record<string, [number, unknown]>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const path = new URL(String(input)).pathname
    const [status, body] = routes[path] ?? [404, { detail: 'Not found' }]
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  })
}

function renderDashboard(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('DashboardPage', () => {
  it('shows the empty state with an upload call to action when there are no works', async () => {
    mockApi({ '/api/works': [200, []], '/api/checks': [200, []] })
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Nothing protected yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /upload your first image/i })).toHaveAttribute('href', '/works/new')
  })

  it('renders a card per work with its truncated entry hash in monospace', async () => {
    mockApi({ '/api/works': [200, WORKS], '/api/checks': [200, CHECKS] })
    renderDashboard()
    expect(await screen.findByRole('button', { name: /open details for harbour at blue hour/i })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    const hash = screen.getByTitle(ENTRY)
    expect(hash).toHaveTextContent('cc7549…ff5b06')
    expect(hash.parentElement).toHaveClass('font-mono')
    expect(screen.getByText('Bitcoin pending')).toBeInTheDocument()
  })

  it('filters by search and sorts newest first by default', async () => {
    mockApi({ '/api/works': [200, WORKS], '/api/checks': [200, []] })
    renderDashboard()
    await screen.findAllByRole('article')
    const titles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles()).toEqual(['Paper Cranes No. 4', 'Harbour at Blue Hour'])
    await userEvent.type(screen.getByLabelText('Search your assets'), 'harbour')
    expect(titles()).toEqual(['Harbour at Blue Hour'])
  })

  it('opens a detail dialog with the full hashes and a certificate link', async () => {
    mockApi({ '/api/works': [200, WORKS], '/api/checks': [200, []] })
    renderDashboard()
    await userEvent.click(await screen.findByRole('button', { name: /open details for harbour at blue hour/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('c860f2723a3d1d1f')).toBeInTheDocument()
    expect(within(dialog).getByTitle(ENTRY)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /certificate/i })).toHaveAttribute(
      'href',
      'http://localhost:8000/api/works/w-0/certificate',
    )
  })

  it('lists check history from the checks tab', async () => {
    mockApi({ '/api/works': [200, WORKS], '/api/checks': [200, CHECKS] })
    renderDashboard('/dashboard?tab=checks')
    expect(await screen.findByText('Matched “Harbour at Blue Hour”')).toBeInTheDocument()
    expect(screen.getByText('Likely copy')).toBeInTheDocument()
    expect(screen.getByText('98.1%')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /check history/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a retryable error when works fail to load', async () => {
    const fetchMock = mockApi({ '/api/works': [500, {}], '/api/checks': [200, []] })
    renderDashboard()
    expect(await screen.findByText("We couldn't load your assets")).toBeInTheDocument()
    fetchMock.mockRestore()
    mockApi({ '/api/works': [200, WORKS], '/api/checks': [200, []] })
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findAllByRole('article')).toHaveLength(2)
  })
})
