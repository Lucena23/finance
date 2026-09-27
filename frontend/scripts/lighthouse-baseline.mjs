/**
 * Aksurim Engine — Baseline de Performance (TAREFA 4)
 *
 * Sobe o preview server do Vite (build de produção), executa o Lighthouse
 * em modo headless (mobile-first) e grava o relatório JSON + resumo em Markdown.
 *
 * Uso: node scripts/lighthouse-baseline.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const reportsDir = path.join(projectRoot, 'lighthouse-reports');
const PORT = 4173;
const URL = `http://localhost:${PORT}/`;

mkdirSync(reportsDir, { recursive: true });

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout aguardando servidor em ${url}`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} saiu com código ${code}`)),
    );
    child.on('error', reject);
  });
}

async function main() {
  console.log('═══ Aksurim Lighthouse Baseline ═══');

  console.log('[1/3] Iniciando preview server...');
  const preview = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: projectRoot, shell: true, stdio: 'ignore' },
  );

  try {
    await waitForServer(URL);
    console.log(`[2/3] Servidor pronto em ${URL}. Executando Lighthouse...`);

    const reportPath = path.join(reportsDir, 'baseline.json');
    await run(
      'npx',
      [
        'lighthouse',
        URL,
        '--output=json',
        `--output-path=${reportPath}`,
        '--only-categories=performance,accessibility,best-practices,seo,pwa',
        '--preset=desktop',
        '--chrome-flags="--headless=new --no-sandbox"',
        '--quiet',
      ],
      { cwd: projectRoot },
    );

    console.log('[3/3] Relatório gerado:', reportPath);
  } finally {
    preview.kill();
  }
}

main().catch((err) => {
  console.error('Falha no baseline:', err.message);
  process.exit(1);
});
