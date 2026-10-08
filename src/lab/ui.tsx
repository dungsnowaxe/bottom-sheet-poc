import { cn } from 'cn';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

// Raw colors for native props that take values, not classes (sheet backgrounds,
// indicators, placeholder text). Mirrored as Tailwind tokens in src/global.css — keep in sync.
export const palette = { bg: '#F3F5F9', ink: '#14213D', muted: '#59677E', accent: '#3559E0', line: '#DCE2ED', danger: '#B42335', white: '#FFFFFF' };

// SafeAreaView is a third-party component; wrap once to enable className support.
export const SafeArea = withUniwind(SafeAreaView);

// Shared screen/sheet scaffolding used across scenarios; colors come from @theme tokens.
export const layout = {
  page: 'flex-1 bg-canvas',
  pageContent: 'gap-[18px] p-5 pb-9',
  eyebrow: 'font-extrabold text-xs text-accent tracking-[1.8px]',
  row: 'flex-row flex-wrap gap-2',
  sheetHeader: 'gap-2 bg-sheet p-5 pb-3',
  sheetBody: 'gap-3.5 p-5',
  footer: 'gap-2 border-t border-line bg-sheet p-3',
  input: 'min-h-12 rounded-[10px] border border-line bg-field p-3 text-base text-ink',
  label: 'font-semibold text-sm text-ink',
  copy: 'text-sm leading-[21px] text-muted',
  error: 'text-[13px] text-danger',
} as const;

export function Button({ label, onPress, testID, secondary = false, danger = false, disabled = false, preserveDisabledAppearance = false, className }: {
  label: string; onPress: () => void; testID?: string; secondary?: boolean; danger?: boolean; disabled?: boolean; preserveDisabledAppearance?: boolean; className?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} testID={testID}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    className={cn('min-h-[46px] items-center justify-center rounded-xl bg-accent px-4.5 py-3 active:opacity-75',
      !preserveDisabledAppearance && 'disabled:opacity-45', secondary && 'bg-tint', danger && 'bg-danger', className)}>
    <Text className={cn('font-bold text-[15px] text-white', secondary && 'text-ink')}>{label}</Text>
  </Pressable>;
}
export function Heading({ children, testID, className }: { children: ReactNode; testID?: string; className?: string }) {
  return <Text accessibilityRole="header" testID={testID} className={cn('font-bold text-2xl text-ink tracking-[-0.5px]', className)}>{children}</Text>;
}
export function Copy({ children, testID, className }: { children: ReactNode; testID?: string; className?: string }) {
  return <Text testID={testID} className={cn(layout.copy, className)}>{children}</Text>;
}
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('gap-3 rounded-[18px] border border-line bg-sheet p-4.5', className)}>{children}</View>;
}
export function Chips<T extends string>({ values, selected, onSelect, prefix }: {
  values: readonly T[]; selected: T; onSelect: (value: T) => void; prefix: string;
}) {
  return <View className={layout.row}>{values.map((value) => <Pressable key={value} testID={`${prefix}-${value}`}
    accessibilityRole="button" accessibilityState={{ selected: value === selected }} onPress={() => onSelect(value)}
    className={cn('rounded-[20px] bg-tint px-3.5 py-2.5', value === selected && 'bg-accent')}>
    <Text className={cn('font-semibold', value === selected ? 'text-white' : 'text-ink')}>{value}</Text>
  </Pressable>)}</View>;
}
