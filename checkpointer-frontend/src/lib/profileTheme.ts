import { FONT_SIZE_MAP, type ProfileTheme } from "../../../server/lib/profileThemeConstants";

export type { ProfileTheme } from "../../../server/lib/profileThemeConstants";

const COLOR_KEYS: (keyof ProfileTheme)[] = [
  "backgroundColor", "headerColor", "headerFontColor",
  "contentFontColor", "cardColor", "accentColor",
];

/** Returns true when any customization is set (non-null theme with at least one key). */
export function hasCustomTheme(theme: ProfileTheme | null | undefined): boolean {
  if (!theme) return false;
  return Object.values(theme).some((v) => v !== undefined && v !== null && v !== "");
}

/** Returns true when any color field is set — font-only themes don't force light mode. */
export function hasCustomColors(theme: ProfileTheme | null | undefined): boolean {
  if (!theme) return false;
  return COLOR_KEYS.some((k) => {
    const v = theme[k];
    return v !== undefined && v !== null && v !== "";
  });
}

// Light-mode values for the core CSS variables that dark mode overrides.
// Applied to the profile content container to force light mode when a custom theme is active.
// Also used by ResetProfileTheme to let components opt out of custom color overrides.
export const LIGHT_MODE_VARS: Record<string, string> = {
  "--background": "oklch(.987 .022 95.277)",
  "--foreground": "oklch(0.216 0.006 56)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.216 0.006 56)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.216 0.006 56)",
  "--muted": "oklch(0.97 0.001 56)",
  "--muted-foreground": "oklch(0.553 0.013 56)",
  "--accent": "oklch(0.97 0.001 56)",
  "--accent-foreground": "oklch(0.216 0.006 56)",
  "--border": "oklch(0.216 0.006 56)",
  "--input": "oklch(1 0 0)",
};

/**
 * Inline style for the profile content container (everything below Navbar).
 * Applies background, font-family, font-size, and content font color.
 * When a color is customized, forces light-mode variables so dark mode
 * doesn't conflict with the user-chosen colors. Font-only changes
 * leave dark mode intact.
 */
export function getProfileContentStyle(theme: ProfileTheme | null | undefined): React.CSSProperties {
  if (!theme || !hasCustomTheme(theme)) return {};

  const colors = hasCustomColors(theme);

  // Only force light mode variables when colors are customized
  const style: Record<string, string> = colors ? { ...LIGHT_MODE_VARS } : {};

  if (theme.backgroundColor) {
    style.backgroundColor = theme.backgroundColor;
  }
  if (theme.fontFamily) {
    style.fontFamily = `"${theme.fontFamily}", system-ui, sans-serif`;
  }
  if (theme.fontSize && FONT_SIZE_MAP[theme.fontSize]) {
    style.fontSize = FONT_SIZE_MAP[theme.fontSize];
  }
  if (theme.contentFontColor) {
    style["--foreground"] = theme.contentFontColor;
    style["--muted-foreground"] = theme.contentFontColor;
  }
  if (theme.cardColor) {
    style["--profile-card-bg"] = theme.cardColor;
  }
  if (theme.accentColor) {
    style["--profile-accent"] = theme.accentColor;
  }
  if (theme.headerFontColor) {
    style["--profile-accent-font"] = theme.headerFontColor;
  }

  return style as React.CSSProperties;
}

/**
 * Inline style for the profile header banner.
 * Sets background color and overrides --foreground / --muted-foreground
 * scoped to the header when headerFontColor is set.
 */
export function getProfileHeaderStyle(theme: ProfileTheme | null | undefined, fallbackBg: string): React.CSSProperties {
  const style: Record<string, string> = {
    backgroundColor: theme?.headerColor || fallbackBg,
  };

  if (theme?.headerFontColor) {
    style["--foreground"] = theme.headerFontColor;
    style["--muted-foreground"] = theme.headerFontColor;
  }

  return style as React.CSSProperties;
}

export function getGoogleFontUrl(fontFamily: string | undefined): string | null {
  if (!fontFamily) return null;
  const encoded = fontFamily.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;700&display=swap`;
}
