import { heroui } from "@heroui/theme";

export default heroui({
  defaultTheme: "light",
  themes: {
    light: {
      extend: "light",
      colors: {
        background: "#fff9f7",
        foreground: "#1a0a05",
        primary: {
          "50":  "#fff9f8",
          "100": "#fff0ec",
          "200": "#fdddd6",
          "300": "#fbbba8",
          "400": "#f8906e",
          "500": "#f26542",
          "600": "#ee4d2d",
          "700": "#e8450e",
          "800": "#c2380f",
          "900": "#9a2a0a",
          DEFAULT: "#ee4d2d",
          foreground: "#ffffff",
        },
        danger:  { DEFAULT: "#dc2626", foreground: "#ffffff" },
        success: { DEFAULT: "#16a34a", foreground: "#ffffff" },
        warning: { DEFAULT: "#d97706", foreground: "#ffffff" },
        focus: "#ee4d2d",
      },
    },
  },
});
