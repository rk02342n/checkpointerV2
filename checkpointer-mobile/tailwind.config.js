const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Ports of the web design tokens (checkpointer-frontend/src/index.css).
      // brand = the warm base family (amber), pop = the loud highlight family
      // (orange) — components reference these, never tailwind names directly.
      colors: {
        background: "#FFEAC7",
        foreground: colors.stone[900],
        card: "#FFFFFF",
        muted: colors.stone[100],
        "muted-foreground": colors.stone[500],
        border: colors.stone[900],
        destructive: colors.red[600],
        secondary: colors.sky[300],
        brand: colors.amber,
        pop: colors.orange,
      },
    },
  },
  plugins: [],
};
