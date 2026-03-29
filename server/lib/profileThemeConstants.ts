export const FONT_CATEGORIES = {
  "Sans-Serif": ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Nunito", "Oswald", "PT Sans", "Rubik"],
  "Serif": ["Playfair Display", "Merriweather", "Lora", "Crimson Text"],
  "Mono": ["Fira Code", "JetBrains Mono"],
  "Retro & Funky": ["Press Start 2P", "Silkscreen", "VT323", "Pixelify Sans", "Bungee", "Bungee Shade", "Righteous", "Fredoka", "Permanent Marker", "Bangers", "Orbitron", "Audiowide", "Creepster", "Metal Mania"],
} as const;

export const ALLOWED_FONTS = Object.values(FONT_CATEGORIES).flat();

export const FONT_SIZES = ["sm", "base", "lg", "xl"] as const;

export const FONT_SIZE_MAP: Record<string, string> = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

export type ProfileTheme = {
  backgroundColor?: string;
  headerColor?: string;
  headerFontColor?: string;
  contentFontColor?: string;
  cardColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
};
