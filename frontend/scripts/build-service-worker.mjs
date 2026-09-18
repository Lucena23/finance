// Script de build do Service Worker (TAREFA 48).
//
// Compila `src/service-worker.ts` (TypeScript strict) para JavaScript puro e
// publica o resultado em `public/service-worker.js`, garantindo que o arquivo
// seja servido na RAIZ do diretório público (escopo global do Service Worker).
//
// Executado automaticamente pelo `npm run build` (prebuild) e disponível via
// `npm run build:sw`. Não faz parte do bundle do Vite.
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(__dirname, '../src/service-worker.ts');
const OUT_FILE = resolve(__dirname, '../public/service-worker.js');

async function main() {
  await build({
    entryPoints: [ENTRY],
    outfile: OUT_FILE,
    bundle: true,
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'info',
  });

  console.log(`Service Worker compilado: ${OUT_FILE}`);
}

main().catch((error) => {
  console.error('Falha ao compilar o Service Worker:', error);
  process.exit(1);
});
