import { heroui } from "@heroui/theme";

export default heroui({
  defaultTheme: "light",
  themes: {
    light: {
      extend: "light",
      colors: {
        background: "#f4f7fb",
        foreground: "#0f172a",
        primary: {
          "50":  "#f0f8ff",
          "100": "#eff6ff",
          "200": "#dbeafe",
          "300": "#bfdbfe",
          "400": "#93c5fd",
          "500": "#60a5fa",
          "600": "#3b82f6",
          "700": "#2563eb",
          "800": "#1d4ed8",
          "900": "#1a2d6b",
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        danger: {
          "100": "#fee2e2",
          "200": "#fecaca",
          "500": "#ef4444",
          "600": "#dc2626",
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        success: {
          "100": "#d1fae5",
          "200": "#bbf7d0",
          "500": "#22c55e",
          "600": "#16a34a",
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        warning: {
          "100": "#fef9c3",
          "200": "#fde68a",
          "500": "#eab308",
          "600": "#ca8a04",
          DEFAULT: "#ca8a04",
          foreground: "#1a1a1a",
        },
        focus: "#3b82f6",
      },
    },
  },
});
