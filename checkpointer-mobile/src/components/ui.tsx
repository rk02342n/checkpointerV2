import { type ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps, type ViewProps } from 'react-native';

import { ShadowColor } from '@/constants/theme';

// The one owner of the neobrutalist look, ported from the web's .surface
// system (checkpointer-frontend/src/index.css + button.tsx conventions):
// - Surface (cards/panels): bg-card, rounded, hard offset shadow, NO border.
// - Buttons: square corners, shadow-only, no border; pressing sinks them
//   into their shadow (translate + shadow collapse) — the native analog of
//   the web's hover/active treatment.
// - Inputs keep border-2 (styled at call sites); chips are square + shadow.
// RN 0.76+ supports CSS boxShadow strings natively, so shadows are exact.

export const hardShadow = (px: number) => ({
  boxShadow: `${px}px ${px}px 0px 0px ${ShadowColor}`,
});

export function Surface({
  className,
  style,
  children,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-[10px] bg-card ${className ?? ''}`}
      style={[hardShadow(4), style]}
      {...rest}>
      {children}
    </View>
  );
}

type BtnVariant = 'primary' | 'neutral' | 'danger';

const btnBg: Record<BtnVariant, string> = {
  primary: 'bg-pop-300',
  neutral: 'bg-card',
  danger: 'bg-destructive',
};

const btnText: Record<BtnVariant, string> = {
  primary: 'text-foreground',
  neutral: 'text-foreground',
  danger: 'text-white',
};

export function Btn({
  label,
  variant = 'neutral',
  small,
  className,
  disabled,
  ...rest
}: PressableProps & {
  label: string;
  variant?: BtnVariant;
  small?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      className={`items-center justify-center rounded-none ${btnBg[variant]} ${
        small ? 'px-3 py-1.5' : 'px-4 py-2.5'
      } ${disabled ? 'opacity-40' : ''} ${className ?? ''}`}
      style={({ pressed }) => [
        pressed ? hardShadow(0) : hardShadow(3),
        pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] },
      ]}
      disabled={disabled}
      {...rest}>
      <Text className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${btnText[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipButton({
  label,
  selected,
  className,
  ...rest
}: PressableProps & { label: string; selected?: boolean; className?: string }) {
  return (
    <Pressable
      className={`rounded-none px-2.5 py-1 ${selected ? 'bg-pop-300' : 'bg-card'} ${
        className ?? ''
      }`}
      style={hardShadow(2)}
      {...rest}>
      <Text className="text-xs font-bold text-foreground">{label}</Text>
    </Pressable>
  );
}

// Static tag (genres etc.) — square, quiet, no press affordance.
export function Tag({ label }: { label: string }) {
  return (
    <View className="mb-2 mr-2 rounded-none bg-card px-2 py-0.5" style={hardShadow(2)}>
      <Text className="text-xs font-bold text-foreground">{label}</Text>
    </View>
  );
}

// Section heading: the uppercase, letter-spaced voice of the web headers.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="text-base font-bold uppercase tracking-widest text-foreground">
      {children}
    </Text>
  );
}

// One voice for the three data states, so screens never improvise them.
export function LoadingNote({ label = 'Loading…' }: { label?: string }) {
  return <Text className="text-sm text-muted-foreground">{label}</Text>;
}

export function ErrorNote({ label }: { label: string }) {
  return <Text className="text-sm font-bold text-destructive">{label}</Text>;
}

export function EmptyNote({ label }: { label: string }) {
  return <Text className="text-sm text-muted-foreground">{label}</Text>;
}
