import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AppRoutes } from '@/App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('routing shell', () => {
  it('renders the header and footer around every page', () => {
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('shows the not-found page for unknown paths', () => {
    renderAt('/does-not-exist')
    expect(screen.getByText(/nothing is registered/i)).toBeInTheDocument()
  })
})
