export const LIBRARIES = ['expo', 'gorhom', 'true'] as const;
export type Library = (typeof LIBRARIES)[number];
export const SCENARIOS = ['confirmation', 'form', 'wizard', 'stack', 'list', 'dimmed', 'blur'] as const;
export type Scenario = (typeof SCENARIOS)[number];
export type Outcome = 'success' | 'failure';
export type RowMode = 'light' | 'heavy';
export const LIBRARY_INFO: Record<Library, { name: string; version: string; description: string }> = {
  expo: { name: 'Expo UI', version: '57.0.22', description: 'Universal API · SwiftUI / Compose' },
  gorhom: { name: 'Gorhom', version: '5.2.14', description: 'Reanimated + Gesture Handler' },
  true: { name: 'TrueSheet', version: '3.11.18', description: 'Stable v3 · native presentation' },
};
export const SCENARIO_INFO: Record<Scenario, { title: string; detail: string }> = {
  confirmation: { title: 'Confirmation', detail: 'Async removal · failure / retry · pending lock' },
  form: { title: 'Long form', detail: '20 inputs · keyboard clearance · fixed Save' },
  wizard: { title: 'Single-sheet wizard', detail: 'Network → wallet → connecting' },
  stack: { title: 'Retained sheet stack', detail: 'Three sheets · Back preserves previous state' },
  dimmed: { title: 'Dimmed backdrop', detail: 'Darkened background · outside tap / swipe dismissal' },
  blur: { title: 'Blur backdrop', detail: 'Blurred background · shared Expo BlurView overlay' },
  list: { title: 'Legend List stress', detail: '1,000 → 50,000 rows · light / heavy · refresh' },
};
export const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', wallets: ['MetaMask', 'Rainbow', 'Trust Wallet'] },
  { id: 'solana', name: 'Solana', wallets: ['Phantom', 'Solflare', 'Backpack'] },
  { id: 'polygon', name: 'Polygon', wallets: ['MetaMask', 'Rainbow', 'Trust Wallet'] },
  { id: 'bitcoin', name: 'Bitcoin', wallets: ['Xverse', 'Unisat'] },
] as const;
export type NetworkId = (typeof NETWORKS)[number]['id'];
export type WizardState = { network: NetworkId | null; wallet: string | null; step: 0 | 1 | 2 };
export const EMPTY_WIZARD: WizardState = { network: null, wallet: null, step: 0 };
export function chooseNetwork(state: WizardState, network: NetworkId): WizardState {
  return { network, wallet: state.network === network ? state.wallet : null, step: 1 };
}
export function chooseWallet(state: WizardState, wallet: string): WizardState {
  const network = NETWORKS.find((item) => item.id === state.network);
  if (!network || !(network.wallets as readonly string[]).includes(wallet)) return state;
  return { ...state, wallet, step: 2 };
}
export const FIELD_NAMES = [
  'Display name', 'Email', 'Phone', 'Organization', 'Role', 'Website', 'Street', 'City',
  'Region', 'Postal code', 'Country', 'Network alias', 'Wallet label', 'Contact name',
  'Contact email', 'Reference number', 'Tags', 'Recovery hint (mock only)', 'Notes', 'Biography',
];
export function initialForm(): string[] {
  return FIELD_NAMES.map((_, i) => i === 0 ? 'Demo wallet' : i === 1 ? 'demo@example.com' : '');
}
export function validateForm(values: string[]): Record<number, string> {
  const errors: Record<number, string> = {};
  if (!values[0]?.trim()) errors[0] = 'Display name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[1] ?? '')) errors[1] = 'Enter a valid email';
  if (values[14] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[14])) errors[14] = 'Enter a valid contact email';
  return errors;
}
export const INITIAL_ROWS = 1000;
export const PAGE_SIZE = 1000;
export const MAX_ROWS = 50000;
export type StressRow = { id: string; index: number };
export function makeRows(start: number, count: number): StressRow[] {
  return Array.from({ length: Math.max(0, Math.min(count, MAX_ROWS - start)) }, (_, i) => ({
    id: `row-${start + i}`, index: start + i,
  }));
}

// A canceled operation resolves as canceled and never calls a success callback later.
// Used by both mock actions and paging; cancellation is not an injected failure.
export function delayedResult<T>(value: T, duration: number) {
  let timer: ReturnType<typeof setTimeout>;
  let finish: (result: { canceled: true } | { canceled: false; value: T }) => void;
  const promise = new Promise<{ canceled: true } | { canceled: false; value: T }>((resolve) => {
    finish = resolve;
    timer = setTimeout(() => resolve({ canceled: false, value }), duration);
  });
  return { promise, cancel: () => { clearTimeout(timer); finish({ canceled: true }); } };
}
