import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import { AuthProvider } from '@/auth/auth-context'
import { LoginPage } from '@/pages/auth/login-page'
import { SignupPage } from '@/pages/auth/signup-page'

const USER = { id: '65f0c0ffee0000000000abcd', username: 'ada.draws', email: 'ada@example.com', full_name: 'Ada Lovelace', created_at: null }

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('posts the OAuth2 form, stores the token and goes to the dashboard', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => json(200, { access_token: 'tok', token_type: 'bearer', user: USER }))
    renderAt('/login', <LoginPage />)

    await userEvent.type(screen.getByLabelText('Email or username'), 'ada.draws')
    await userEvent.type(screen.getByLabelText('Password'), 'Analytical1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByTestId('where')).toHaveTextContent('/dashboard')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(String(init.body)).toBe('username=ada.draws&password=Analytical1')
    expect(localStorage.getItem('token')).toBe('tok')
  })

  it('shows the backend error and clears the password', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      json(401, { detail: 'Incorrect email/username or password.' }),
    )
    renderAt('/login', <LoginPage />)

    await userEvent.type(screen.getByLabelText('Email or username'), 'ada.draws')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email/username or password.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })
})

describe('SignupPage', () => {
  it('blocks a taken username reported by the availability check', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('username=')) return json(200, { username: { available: false } })
      return json(200, { email: { available: true } })
    })
    renderAt('/signup', <SignupPage />)

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText('Username'), 'ada.draws')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Analytical1')

    expect(await screen.findByText('That username is taken', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('moves to code entry after signup/start and sends the code to signup/verify', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/availability')) return json(200, { username: { available: true }, email: { available: true } })
      if (url.endsWith('/signup/start')) return json(200, { email: 'ada@example.com', resend_in: 60, sent: true })
      if (url.endsWith('/signup/verify')) return json(400, { detail: 'Incorrect code. 4 attempts left.' })
      return json(404, {})
    })
    renderAt('/signup', <SignupPage />)

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText('Username'), 'ada.draws')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Analytical1')
    const cont = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(cont).toBeEnabled(), { timeout: 2000 })
    await userEvent.click(cont)

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument()
    // The code form mounts once the details form has finished its exit transition.
    const codeInput = await screen.findByLabelText('6-digit verification code', {}, { timeout: 3000 })
    await userEvent.type(codeInput, '123456')
    expect(await screen.findByText('Incorrect code. 4 attempts left.')).toBeInTheDocument()

    const verifyCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/signup/verify'))!
    expect(JSON.parse(String((verifyCall[1] as RequestInit).body))).toEqual({ email: 'ada@example.com', code: '123456' })
  })
})
