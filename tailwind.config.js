/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Inter Tight"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Theme-aware semantic tokens
        w: {
          bg:           'var(--w-bg)',
          'bg-elev':    'var(--w-bg-elev)',
          'bg-sunken':  'var(--w-bg-sunken)',
          'bg-hover':   'var(--w-bg-hover)',
          fg:           'var(--w-fg)',
          'fg-soft':    'var(--w-fg-soft)',
          'fg-mute':    'var(--w-fg-mute)',
          'fg-faint':   'var(--w-fg-faint)',
          border:       'var(--w-border)',
          'border-soft':'var(--w-border-soft)',
          'border-strong':'var(--w-border-strong)',
          accent:       'var(--w-accent)',
          'accent-soft':'var(--w-accent-soft)',
          'accent-fg':  'var(--w-accent-fg)',
          'accent-strong':'var(--w-accent-strong)',
        },
        sig: {
          green:  'var(--sig-green)',
          amber:  'var(--sig-amber)',
          red:    'var(--sig-red)',
          cyan:   'var(--sig-cyan)',
          violet: 'var(--sig-violet)',
        },
        // Existing shadcn tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'theme-sm': 'var(--rad-sm)',
        'theme-md': 'var(--rad-md)',
        'theme-lg': 'var(--rad-lg)',
        'theme-xl': 'var(--rad-xl)',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
      },
    },
  },
  plugins: [],
}
