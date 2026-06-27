import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Urbanist", "sans-serif"],
      },
      fontSize: {
        // Material Design Typography Scale
        "display-large": ["57px", { lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: "400" }],
        "display-medium": ["45px", { lineHeight: "52px", letterSpacing: "0", fontWeight: "400" }],
        "display-small": ["36px", { lineHeight: "44px", letterSpacing: "0", fontWeight: "400" }],
        "headline-large": ["32px", { lineHeight: "40px", letterSpacing: "0", fontWeight: "700" }],
        "headline-medium": ["28px", { lineHeight: "36px", letterSpacing: "0", fontWeight: "700" }],
        "headline-small": ["24px", { lineHeight: "32px", letterSpacing: "0", fontWeight: "600" }],
        "title-large": ["22px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "600" }],
        "title-medium": ["16px", { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-small": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "body-large": ["16px", { lineHeight: "24px", letterSpacing: "0.5px", fontWeight: "400" }],
        "body-medium": ["14px", { lineHeight: "20px", letterSpacing: "0.25px", fontWeight: "400" }],
        "body-small": ["12px", { lineHeight: "16px", letterSpacing: "0.4px", fontWeight: "400" }],
        "label-large": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-medium": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
        "label-small": ["11px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
      },
      colors: {
        border: "hsl(var(--border))",
        divider: "hsl(var(--divider))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          official: "hsl(var(--primary-official))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary-light))",
          dark: "hsl(var(--secondary-dark))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "hsl(var(--accent-light))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Design system palette direct access
        sicilia: {
          light: "hsl(var(--sicilia-light))",
          normal: "hsl(var(--sicilia-normal))",
          official: "hsl(var(--sicilia-official))",
          dark: "hsl(var(--sicilia-dark))",
          darker: "hsl(var(--sicilia-darker))",
        },
        capri: {
          light: "hsl(var(--capri-light-hover))",
          normal: "hsl(var(--capri-normal))",
          dark: "hsl(var(--capri-dark))",
        },
        cyan: {
          light: "hsl(var(--cyan-light))",
          normal: "hsl(var(--cyan-normal))",
          dark: "hsl(var(--cyan-dark))",
        },
        sun: {
          light: "hsl(var(--sun-light))",
          normal: "hsl(var(--sun-normal))",
          dark: "hsl(var(--sun-dark))",
        },
        florida: {
          DEFAULT: "hsl(var(--florida-normal))",
          light: "hsl(var(--florida-light-hover))",
          normal: "hsl(var(--florida-normal))",
          dark: "hsl(var(--florida-dark))",
        },
        violet: {
          normal: "hsl(var(--violet-normal))",
          dark: "hsl(var(--violet-dark))",
          darker: "hsl(var(--violet-darker))",
        },
        celest: {
          light: "hsl(var(--celest-light))",
          normal: "hsl(var(--celest-normal))",
          dark: "hsl(var(--celest-dark))",
        },
        cloud: {
          light: "hsl(var(--cloud-light))",
          normal: "hsl(var(--cloud-normal))",
          dark: "hsl(var(--cloud-dark))",
          darker: "hsl(var(--cloud-darker))",
        },
        premium: {
          navy: "hsl(var(--premium-navy))",
          midnight: "hsl(var(--premium-midnight))",
          indigo: "hsl(var(--premium-indigo))",
          blue: "hsl(var(--premium-blue))",
          teal: "hsl(var(--premium-teal))",
          lime: "hsl(var(--premium-lime))",
          orange: "hsl(var(--premium-orange))",
          amber: "hsl(var(--premium-amber))",
          yellow: "hsl(var(--premium-yellow))",
          "surface-blue": "hsl(var(--premium-surface-blue))",
          "surface-teal": "hsl(var(--premium-surface-teal))",
          "surface-amber": "hsl(var(--premium-surface-amber))",
          "surface-rose": "hsl(var(--premium-surface-rose))",
        },
        star: "hsl(var(--star-gold))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "bottom-nav": "var(--shadow-bottom-nav)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "toast-enter": {
          "0%": { opacity: "0", transform: "translateY(-20px) scale(0.95)" },
          "60%": { opacity: "1", transform: "translateY(4px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-exit": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-16px)" },
        },
        "draw-check": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "toast-enter": "toast-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "toast-exit": "toast-exit 0.35s ease-in forwards",
        "draw-check": "draw-check 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;