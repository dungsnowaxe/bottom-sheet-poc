import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { chooseNetwork, chooseWallet, EMPTY_WIZARD, NETWORKS, type Library, type Outcome, type WizardState } from './model';
import { SheetSurface } from './SheetSurface';
import type { Recorder } from './telemetry';
import { Button, Copy, Heading, layout, palette } from './ui';
import { useMockAction } from './useMockAction';

function Connecting({ active, outcome, recorder, back, cancel }: {
  active: boolean; outcome: Outcome; recorder: Recorder; back: () => void; cancel: () => void;
}) {
  const action = useMockAction(active, outcome, recorder, 2);
  const { start } = action;
  useEffect(() => { if (active) start(); }, [active, start]);
  return <View className={layout.sheetBody}>
    {action.status === 'pending' ? <ActivityIndicator color={palette.accent} /> : null}
    <Copy testID={`connection-${action.status}`}>{action.status === 'pending' || action.status === 'idle' ? 'Simulating connection… no wallet app is opened.'
      : action.status === 'success' ? 'Mock connection succeeded. No real connection was made.' : 'Mock connection failed. Retry or select another wallet.'}</Copy>
    {action.status === 'failure' ? <Button label="Retry connection" testID="connection-retry" onPress={action.start} /> : null}
    <Button label="Back to wallets" testID="connecting-back" secondary onPress={() => { action.cancel(); back(); }} />
    <Button label="Cancel flow" testID="connecting-cancel" secondary onPress={() => { action.cancel(); cancel(); }} />
  </View>;
}
export function Wizard({ library, open, close, stacked, outcome, recorder, onStep }: {
  library: Library; open: boolean; close: () => void; stacked: boolean; outcome: Outcome; recorder: Recorder;
  onStep: (step: number) => void;
}) {
  const [state, setState] = useState<WizardState>(EMPTY_WIZARD);
  const transition = (next: WizardState) => {
    recorder.mark('wizard-step', next.step);
    setState(next); onStep(next.step);
  };
  const back = () => transition({ ...state, step: state.step === 2 ? 1 : 0 });
  const network = NETWORKS.find((item) => item.id === state.network);
  const titles = ['Choose a network', 'Choose a wallet', 'Connecting'];
  const header = (level: number) => <View className={layout.sheetHeader}>
    <Heading testID={`wizard-step-${level}`}>{titles[level]}</Heading>
    <Copy>{stacked ? `Retained stack · sheet ${level + 1} / 3` : `Single sheet · step ${level + 1} / 3`}</Copy>
    {level > 0 ? <Copy>{network?.name}{level === 2 ? ` · ${state.wallet}` : ''}</Copy> : null}
  </View>;
  const content = (level: number): ReactNode => {
    if (level === 2) return <Connecting active={open && state.step === 2} outcome={outcome} recorder={recorder} back={back} cancel={close} />;
    return <View className={layout.sheetBody}>
      {level === 0 ? NETWORKS.map((item) => <Button key={item.id} label={`${state.network === item.id ? '✓ ' : ''}${item.name}`}
        testID={`network-${item.id}`} secondary onPress={() => transition(chooseNetwork(state, item.id))} />)
        : network?.wallets.map((wallet) => <Button key={wallet} label={`${state.wallet === wallet ? '✓ ' : ''}${wallet}`}
          testID={`wallet-${wallet.toLowerCase().replace(/\s+/g, '-')}`} secondary onPress={() => transition(chooseWallet(state, wallet))} />)}
      {level === 1 ? <Button label="Back to networks" testID="wallet-back" secondary onPress={back} /> : null}
      <Button label="Cancel flow" testID={`wizard-cancel-${level}`} onPress={close} />
    </View>;
  };
  if (!stacked) return <SheetSurface library={library} open={open} level={0} sizing="auto" recorder={recorder}
    onDismiss={close} onRequestClose={close} header={header(state.step)}>{content(state.step)}</SheetSurface>;
  // Nest the presentation anchors in the previous sheet's content so SwiftUI has
  // an actual presented parent. Previous content/selection remains mounted.
  const surface = (level: 0 | 1 | 2): ReactNode => <SheetSurface library={library}
    open={open && state.step >= level} topActive={state.step === level} level={level} sizing="auto" recorder={recorder}
    onDismiss={() => {
      // Ignore callbacks from programmed/cascading dismissal of obsolete levels.
      if (!open || state.step < level) return;
      if (level === 0) close(); else transition({ ...state, step: level === 2 ? 1 : 0 });
    }} onRequestClose={() => { if (level === 0) close(); else back(); }} header={header(level)}>
    {content(level)}
    {level < 2 ? <View className="h-0">{surface((level + 1) as 1 | 2)}</View> : null}
  </SheetSurface>;
  return surface(0);
}
