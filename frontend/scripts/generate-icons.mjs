// Script utilitário para gerar os ícones PNG da PWA (192x192 e 512x512).
// Executado uma única vez durante o setup. Não faz parte do bundle de produção.
// Gera PNGs válidos sem dependências externas (encoder PNG manual + zlib nativo).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

// Paleta da marca Aksurim
const BG = [15, 23, 42]; // #0F172A
const ACCENT = [56, 189, 248]; // #38BDF8
const FG = [248, 250, 252]; // #F8FAFC

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(buf, w, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

// Desenha um "A" estilizado (marca Aksurim) com fundo arredondado.
function drawIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const cx = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      if (radius > 0) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < radius && ry < radius) {
          const dx = radius - rx;
          const dy = radius - ry;
          if (dx * dx + dy * dy > radius * radius) inside = false;
        }
      }
      if (inside) setPixel(buf, size, x, y, BG);
    }
  }

  // Letra "A" desenhada com duas pernas diagonais + barra horizontal.
  const stroke = Math.max(2, Math.round(size * 0.075));
  const topY = Math.round(size * 0.24);
  const botY = Math.round(size * 0.78);
  const leftX = Math.round(size * 0.28);
  const rightX = Math.round(size * 0.72);
  const apexX = Math.round(cx);

  const drawLine = (x0, y0, x1, y1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      for (let oy = -stroke; oy <= stroke; oy++) {
        for (let ox = -stroke; ox <= stroke; ox++) {
          if (ox * ox + oy * oy <= stroke * stroke) {
            setPixel(buf, size, px + ox, py + oy, FG);
          }
        }
      }
    }
  };

  drawLine(leftX, botY, apexX, topY);
  drawLine(rightX, botY, apexX, topY);

  // Barra horizontal do "A" em cor de destaque
  const barY = Math.round(size * 0.6);
  const barHalf = Math.round(size * 0.14);
  for (let x = apexX - barHalf; x <= apexX + barHalf; x++) {
    for (let oy = -stroke; oy <= stroke; oy++) {
      setPixel(buf, size, x, barY + oy, ACCENT);
    }
  }

  return encodePng(size, size, buf);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
];

for (const t of targets) {
  const png = drawIcon(t.size, t.maskable);
  writeFileSync(resolve(OUT_DIR, t.name), png);
  console.log(`Gerado: ${t.name} (${png.length} bytes)`);
}
