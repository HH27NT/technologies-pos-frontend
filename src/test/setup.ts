import "@testing-library/jest-dom/vitest";

/**
 * Setup global de los tests (jsdom). Agrega los matchers de jest-dom
 * (`toBeInTheDocument`, `toHaveValue`…) y rellena las APIs del navegador que
 * jsdom no implementa y que Radix UI (dialog, select) usa al montar.
 */

// Radix mide el elemento con estas APIs; jsdom no las trae y el diálogo explota.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
