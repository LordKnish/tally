import '@testing-library/jest-dom';

// Mock ResizeObserver for cmdk/command component
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

// Mock scrollIntoView for cmdk/command component
Element.prototype.scrollIntoView = function () {};
