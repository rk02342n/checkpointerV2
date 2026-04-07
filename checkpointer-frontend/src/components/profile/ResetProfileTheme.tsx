import { LIGHT_MODE_VARS } from "@/lib/profileTheme";

interface ResetProfileThemeProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Reset custom color CSS variables (--foreground, --background, etc.)
   * so children render with default light-mode colors regardless of the
   * profile's contentFontColor / cardColor overrides.
   * @default true
   */
  colors?: boolean;
  /**
   * Reset custom font-family back to the system default.
   * Useful for components that need a specific typeface (e.g. code, charts).
   * @default false
   */
  font?: boolean;
}

/**
 * Wraps children in a div that selectively opts out of profile custom theming.
 * Use inside profile pages for any component that should ignore the user's
 * chosen accent color, font color, or font family.
 *
 * @example
 * // Reset colors only (tooltip use case — white font on white bg)
 * <ResetProfileTheme><ChartTooltipContent /></ResetProfileTheme>
 *
 * @example
 * // Reset font only (keep theme colors, use system font)
 * <ResetProfileTheme colors={false} font><code>...</code></ResetProfileTheme>
 */
export function ResetProfileTheme({
  children,
  className,
  colors = true,
  font = false,
}: ResetProfileThemeProps) {
  const style: React.CSSProperties = {};

  if (colors) {
    Object.assign(style, LIGHT_MODE_VARS);
  }
  if (font) {
    (style as Record<string, string>).fontFamily = "system-ui, sans-serif";
  }

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
