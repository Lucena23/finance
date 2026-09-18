/**
 * jest.config.js — Configuração do Jest para o backend NestJS.
 *
 * Cobre testes unitários dos Services de domínio (§8.10) com cobertura
 * habilitada e relatório gerado em `coverage/`.
 */

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/notification-cron.ts',
    '!src/**/*.dto.ts',
    '!src/**/dto/**',
    '!src/prisma/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  verbose: true,
};
