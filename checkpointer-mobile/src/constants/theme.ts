/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Checkpointer brand tokens — hex ports of the web app's index.css oklch
// values (see docs/mobile-v1-plan.md; background is oklch(0.95 0.0543 74.32)).
export const Colors = {
  light: {
    text: '#1C1917', // stone-900
    background: '#FFEAC7', // the web --background cream
    backgroundElement: '#FFFFFF', // card
    backgroundSelected: '#FDBA74', // pop-300 (orange-300)
    textSecondary: '#78716C', // stone-500
  },
  dark: {
    text: '#F5F5F4', // stone-100
    background: '#1C1917', // stone-900
    backgroundElement: '#292524', // stone-800
    backgroundSelected: '#993516', // dark --primary
    textSecondary: '#A8A29E', // stone-400
  },
} as const;

// The hard offset shadow color of the Surface look (web --shadow-color).
export const ShadowColor = '#292524'; // stone-800

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
