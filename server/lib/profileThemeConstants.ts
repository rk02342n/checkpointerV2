export const ALLOWED_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Raleway", "Nunito", "Playfair Display", "Merriweather",
  "Source Code Pro", "Fira Code", "Oswald", "PT Sans", "Rubik",
] as const;

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
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
};
