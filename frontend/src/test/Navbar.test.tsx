import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ThemeProvider } from '../context/ThemeContext';

describe('Navbar Component', () => {
  it('renders brand title and desktop navigation routes', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('ProvNet')).toBeInTheDocument();
    expect(screen.getAllByText('Register')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Verify')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Results')[0]).toBeInTheDocument();
  });

  it('renders mobile menu sheet drawer when menu button is clicked below 640px', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </ThemeProvider>
    );

    const toggleButton = screen.getByLabelText('Open navigation menu');
    expect(toggleButton).toBeInTheDocument();

    // Click mobile hamburger button
    fireEvent.click(toggleButton);

    // Mobile nav drawer should now render the navigation items
    const registerLinks = screen.getAllByRole('link', { name: /register/i });
    expect(registerLinks.length).toBeGreaterThanOrEqual(2);
  });
});
