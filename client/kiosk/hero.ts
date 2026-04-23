import { heroui } from "@heroui/theme";

export default heroui({
  defaultTheme: "dark",
  themes: {
    dark: {
      extend: "dark",
      colors: {
        background: "#001218",
        foreground: "#e2f8fb",
        primary: {
          "50":  "#ecfeff",
          "100": "#cffafe",
          "200": "#a5f3fc",
          "300": "#67e8f9",
          "400": "#22d3ee",
          "500": "#06b6d4",
          "600": "#0891b2",
          "700": "#0369a1",
          "800": "#004d5e",
          "900": "#002d36",
          DEFAULT: "#06b6d4",
          foreground: "#001218",
        },
        danger:  { DEFAULT: "#ef4444", foreground: "#ffffff" },
        success: { DEFAULT: "#22c55e", foreground: "#001218" },
        warning: { DEFAULT: "#f59e0b", foreground: "#001218" },
        focus: "#22d3ee",
      },
    },
  },
});
