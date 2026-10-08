import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Recorder } from './telemetry';
import { Button, Copy } from './ui';

const Context = createContext<{ enabled: boolean; running: boolean; start: () => void }>({ enabled: false, running: false, start: () => {} });
export function DiagnosticProvider({ recorder, open, children }: { recorder: Recorder; open: boolean; children: ReactNode }) {
  const [running, setRunning] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTimers = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
    timeout.current = null; interval.current = null;
  }, []);
  const stop = useCallback(() => { clearTimers(); setRunning(false); }, [clearTimers]);
  useEffect(() => { if (!open) clearTimers(); return clearTimers; }, [open, clearTimers]);
  const start = useCallback(() => {
    if (timeout.current || interval.current || !open) return;
    setRunning(true);
    recorder.mark('js-busy-armed', 0, 'starts in 1000ms; 80ms work every 250ms for 10s');
    timeout.current = setTimeout(() => {
      timeout.current = null;
      const end = performance.now() + 10000;
      recorder.mark('js-busy-start');
      interval.current = setInterval(() => {
        if (performance.now() >= end) { recorder.mark('js-busy-end'); stop(); return; }
        const until = performance.now() + 80;
        while (performance.now() < until) { /* Explicit synthetic JS contention, never baseline. */ }
      }, 250);
    }, 1000);
  }, [open, recorder, stop]);
  return <Context.Provider value={{ enabled: recorder.log.config.condition === 'js-busy', running: open && running, start }}>{children}</Context.Provider>;
}
export function DiagnosticControl() {
  const { enabled, running, start } = useContext(Context);
  if (!enabled) return null;
  return <View style={{ gap: 6 }}><Button label={running ? 'JS-busy window active / armed' : 'Start JS-busy window'}
    testID="diagnostic-start" secondary disabled={running} onPress={start} />
    <Copy>Diagnostic only: after 1s, 80ms JS work / 250ms for 10s.</Copy></View>;
}
