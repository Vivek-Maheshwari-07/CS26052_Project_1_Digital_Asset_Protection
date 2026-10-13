import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AppRoutes } from '@/App'

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('landing page', () => {
  it('leads with the value proposition and both primary actions', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/prove you made it first/i)
    const main = screen.getByRole('main')
    expect(within(main).getAllByRole('link', { name: /protect an asset/i })[0]).toHaveAttribute('href', '/signup')
    expect(within(main).getByRole('link', { name: /check a copy/i })).toHaveAttribute('href', '/check')
  })

  it('anchors the how-it-works and evidence sections for in-page navigation', () => {
    const { container } = renderLanding()
    expect(container.querySelector('#how-it-works')).not.toBeNull()
    expect(container.querySelector('#evidence')).not.toBeNull()
  })

  it('detects tampering in the live hash chain and recovers on restore', async () => {
    renderLanding()
    const status = await screen.findByText(/all 3 entries intact/i)
    expect(status).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /tamper with entry #2/i }))
    await waitFor(() => expect(screen.getByText(/integrity failure from entry #2/i)).toBeInTheDocument())
    expect(screen.getByText('hash mismatch')).toBeInTheDocument()
    expect(screen.getByText('broken link')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /restore record/i }))
    await waitFor(() => expect(screen.getByText(/all 3 entries intact/i)).toBeInTheDocument())
  })
})
