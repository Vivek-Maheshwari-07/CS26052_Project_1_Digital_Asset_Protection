import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom lacks these browser APIs that framer-motion and the layout touch.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver
window.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
window.scrollTo = () => {}
Element.prototype.scrollIntoView ??= () => {}
// input-otp probes for password-manager overlays with elementFromPoint.
document.elementFromPoint ??= () => null
