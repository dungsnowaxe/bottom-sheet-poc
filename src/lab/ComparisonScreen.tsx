import { BlurTargetView } from 'expo-blur';
import { BlurBackdrop } from './BlurBackdrop';
import { BackdropScenario } from './BackdropScenario';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { Confirmation } from './Confirmation';
import { DiagnosticProvider } from './Diagnostic';
import { FormScenario } from './Form';
import { LIBRARY_INFO, SCENARIO_INFO, type Library, type Outcome, type RowMode, type Scenario } from './model';
import { StressList } from './StressList';
import { createRunLog, type Recorder } from './telemetry';
import { Button, Card, Chips, Copy, Heading, layout, SafeArea } from './ui';
import { withUniwind } from 'uniwind';
import { Wizard } from './Wizard';

// BlurTargetView is a third-party component; wrap once to enable className support.
const BlurTarget = withUniwind(BlurTargetView);

type Session = { id: number; recorder: Recorder; outcome: Outcome; mode: RowMode };
export function ComparisonScreen({ library, scenario }: { library: Library; scenario: Scenario }) {
  const isBackdropScenario = scenario === 'blur' || scenario === 'dimmed';
  const blurTarget = useRef<View | null>(null);
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [mode, setMode] = useState<RowMode>('light');
  const [condition, setCondition] = useState<'baseline' | 'js-busy'>('baseline');
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const sequence = useRef(0);
  const [exportStatus, setExportStatus] = useState('');
  const close = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    router.setParams({ step: '0' });
  }, []);
  const launch = () => {
    const recorder = createRunLog({ library, scenario, rowMode: mode, outcome, condition });
    recorder.mark('open-button-js');
    setSession({ id: ++sequence.current, recorder, outcome, mode });
    openRef.current = true; setOpen(true); setExportStatus('');
  };
  const exportLog = async () => {
    if (!session) return;
    try {
      await Clipboard.setStringAsync(JSON.stringify(session.recorder.log, null, 2));
      setExportStatus(`Copied ${session.recorder.log.events.length} events. Save as JSON alongside your native trace.`);
    } catch (error) { setExportStatus(`Copy failed: ${String(error)}`); }
  };
  return <SafeArea className={layout.page}>
    <BlurTarget ref={blurTarget} className="flex-1">
    <ScrollView contentContainerClassName={layout.pageContent}>
      <Button label="← All scenarios" testID="lab-back" secondary disabled={open} preserveDisabledAppearance={isBackdropScenario} onPress={() => router.back()} />
      <Text className={layout.eyebrow}>BOTTOM SHEET LAB</Text>
      <Heading testID={`compare-${library}-${scenario}`}>{SCENARIO_INFO[scenario].title}</Heading>
      <Copy>{LIBRARY_INFO[library].name} {LIBRARY_INFO[library].version} · {Platform.OS} · {__DEV__ ? 'Development build (not production evidence)' : 'Release build'}</Copy>
      <Card>
        <Copy>{SCENARIO_INFO[scenario].detail}</Copy>
        {scenario === 'confirmation' || scenario === 'wizard' || scenario === 'stack' ? <>
          <Text className={layout.label}>Mock outcome (fixed for this run)</Text>
          <Chips values={['success', 'failure'] as const} selected={outcome} onSelect={setOutcome} prefix="outcome" />
        </> : null}
        {scenario === 'list' ? <><Text className={layout.label}>Row workload</Text>
          <Chips values={['light', 'heavy'] as const} selected={mode} onSelect={setMode} prefix="rows" /></> : null}
        <Text className={layout.label}>Measurement condition</Text>
        <Chips values={['baseline', 'js-busy'] as const} selected={condition} onSelect={setCondition} prefix="condition" />
        <Copy>JS-busy mode exposes an explicit diagnostic button in the root sheet. It does not start automatically.</Copy>
        <Button label="Open sheet" testID="open-sheet" onPress={launch} disabled={open} preserveDisabledAppearance={isBackdropScenario} />
      </Card>
      <Card><Heading>What to inspect</Heading>
        <Copy>{scenario === 'form' ? 'Focus fields 1, 10 and 20. Type, switch keyboard types, Save invalid values, hide the keyboard, then try closing dirty edits. Save and focused input must both remain visible.'
          : scenario === 'dimmed' || scenario === 'blur' ? 'Inspect the background text and cards while the sheet stays sharp. Tap outside, swipe down, use Android Back, and reopen. The blur case uses a shared page overlay, not a native sheet blur API.'
          : scenario === 'list' ? 'Drag between half/full, fling the list, jump to its end to page, inject a failure then retry, pull to refresh, close and reopen to verify reset.'
          : scenario === 'stack' ? 'Select network and wallet, cancel while Connecting, return with Back, and change networks. Try swipe/backdrop dismissal at every level; prior sheets must retain state.'
          : scenario === 'wizard' ? 'Follow the three steps, Back, change networks, inject failure/retry, and cancel the pending connection. Reopening starts fresh.'
          : 'Remove twice rapidly, try pending dismissal, observe success or failure, retry, cancel, and reopen.'}</Copy>
        {library === 'expo' ? <Copy>Known adapter limits: no native presentation-complete callback in Universal; Android swipe blocking is not exposed. Blocked swipe recovery is logged as a limitation, not successful interception.</Copy> : null}
        <Copy>No performance ranking is inferred from the event log. Native frame/memory traces and release-device runs are required.</Copy>
      </Card>
      <Card><Button label="Copy last run JSON" testID="export-log" secondary disabled={!session || open} onPress={() => { void exportLog(); }} />
        <Copy testID="export-status">{exportStatus || 'Logs stay in memory until copied or you leave this screen. Export after dismissing the sheet.'}</Copy>
        <Button label="Comparison notes" secondary disabled={open} preserveDisabledAppearance={isBackdropScenario} onPress={() => router.push('/report')} />
      </Card>
    </ScrollView>
    </BlurTarget>
    {scenario === 'blur' ? <BlurBackdrop visible={open} target={blurTarget} /> : null}
    {session ? <DiagnosticProvider key={session.id} recorder={session.recorder} open={open}>
      {scenario === 'dimmed' || scenario === 'blur' ? <BackdropScenario library={library} variant={scenario} open={open} close={close} recorder={session.recorder} />
        : scenario === 'confirmation' ? <Confirmation library={library} open={open} close={close} outcome={session.outcome} recorder={session.recorder} />
        : scenario === 'form' ? <FormScenario library={library} open={open} close={close} recorder={session.recorder} />
        : scenario === 'list' ? <StressList library={library} open={open} close={close} mode={session.mode} recorder={session.recorder} />
        : <Wizard library={library} open={open} close={close} stacked={scenario === 'stack'} outcome={session.outcome} recorder={session.recorder}
          onStep={(step) => router.setParams({ step: String(step) })} />}
    </DiagnosticProvider> : null}
  </SafeArea>;
}
