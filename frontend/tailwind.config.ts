import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ═══════════════════════════════════════════
        // IDENTIDADE VISUAL OFICIAL AKSURIM (RN-13)
        // ═══════════════════════════════════════════
        aksurim: {
          // Primária / Ciano
          primary: '#06777F',
          // Aviso / Vermelho-Laranja
          warning: '#FB4629',
          // Destaque / Amarelo-Verde
          highlight: '#DAF043',
          // Fundo Escuro / Texto
          dark: '#282828',
        },
        // Indicadores de urgência da fila (RN-06 / §8.5)
        urgency: {
          overdue: '#FB4629', // 🔴 Em atraso (Aksurim Warning)
          current: '#06777F', // 🔵 Mês atual (Aksurim Primary)
          upcoming: '#DAF043', // 🟢 Futuro (Aksurim Highlight)
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // ═══════════════════════════════════════════
        // ANIMAÇÕES DOS BANNERS DE ADS (TAREFA 19)
        // CSS/HTML5 puro — sem vídeo. Leves e performáticos.
        // ═══════════════════════════════════════════
        // Deslize horizontal contínuo (marquee) para o leaderboard 320x50.
        'ad-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Pulso suave de opacidade/escala para o CTA do leaderboard.
        'ad-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.04)' },
        },
        // Gradiente animado (background-position) para o retângulo 300x250.
        'ad-gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // Flutuação vertical sutil para o ícone do retângulo.
        'ad-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        // Brilho (shine) que atravessa o retângulo periodicamente.
        'ad-shine': {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '60%, 100%': { transform: 'translateX(320%) skewX(-20deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ad-marquee': 'ad-marquee 14s linear infinite',
        'ad-pulse': 'ad-pulse 1.8s ease-in-out infinite',
        'ad-gradient': 'ad-gradient 8s ease infinite',
        'ad-float': 'ad-float 3s ease-in-out infinite',
        'ad-shine': 'ad-shine 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
