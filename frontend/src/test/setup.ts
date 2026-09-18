/**
 * setup.ts — Bootstrap global dos testes do frontend (Vitest).
 *
 * Registra os matchers do jest-dom e garante um ambiente DOM limpo entre
 * os testes. Executado automaticamente via `setupFiles` do vitest.config.ts.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
