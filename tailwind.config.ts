import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tailwind + tokens del Bar POS SaaS.
 * Los colores apuntan a las variables CSS de tokens.css, así que las
 * utilidades (bg-*, text-*, border-*) cambian solas entre claro/oscuro.
 *
 * Las claves background/foreground/card/primary/... respetan el contrato de
 * shadcn/ui: sus componentes heredan el tema sin tocar nada.
 *
 * Nota: los colores son hex vía var(), no canales HSL. Las utilidades con
 * opacidad tipo `bg-primary/50` no aplican sobre estos tokens semánticos
 * (rara vez se necesitan); para tintes usa los *-bg (success-bg, etc.).
 */
const config: Config = {
  darkMode: ["class", '[data-mode="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Contrato shadcn/ui → nuestros tokens */
        background: "var(--surface-0)",
        foreground: "var(--text-primary)",
        card: "var(--surface-1)",
        "card-foreground": "var(--text-primary)",
        popover: "var(--surface-1)",
        "popover-foreground": "var(--text-primary)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--on-primary)" },
        secondary: { DEFAULT: "var(--surface-2)", foreground: "var(--text-primary)" },
        muted: { DEFAULT: "var(--surface-2)", foreground: "var(--text-muted)" },
        accent: { DEFAULT: "var(--surface-2)", foreground: "var(--text-primary)" },
        destructive: { DEFAULT: "var(--danger)", foreground: "var(--on-danger)" },
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--ring)",

        /* Nuestros tokens semánticos propios */
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
        },
        line: "var(--line)",
        "border-strong": "var(--border-strong)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        brand: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          on: "var(--on-primary)",
          accent: "var(--accent)",
        },
        success: { DEFAULT: "var(--success)", bg: "var(--success-bg)", on: "var(--on-success)" },
        warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)", on: "var(--on-danger)" },
        info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        "2xs": "var(--text-2xs)",
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      spacing: {
        tap: "var(--tap-min)", // objetivo táctil del POS (h-tap / min-h-tap)
      },
      // minHeight/minWidth no heredan de spacing en Tailwind v3: mapear tap aquí
      // para que `min-h-tap` / `min-w-tap` existan de verdad.
      minHeight: {
        tap: "var(--tap-min)",
      },
      minWidth: {
        tap: "var(--tap-min)",
      },
      transitionTimingFunction: { brand: "var(--ease)" },
      transitionDuration: { fast: "120ms", DEFAULT: "180ms" },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
