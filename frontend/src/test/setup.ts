import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// Mock window.matchMedia for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock URL.createObjectURL / revokeObjectURL for JSDOM
if (typeof window.URL.createObjectURL === 'undefined') {
  window.URL.createObjectURL = () => 'blob:http://localhost/mock-preview';
  window.URL.revokeObjectURL = () => {};
}

// Mock ResizeObserver for Recharts ResponsiveContainer in JSDOM
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import React from 'react';

// Mock ResponsiveContainer for recharts to ensure charts and legends render in JSDOM
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => {
      return React.createElement(
        'div',
        { style: { width: 800, height: 400 } },
        React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, { width: 800, height: 400 })
          : children
      );
    },
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

