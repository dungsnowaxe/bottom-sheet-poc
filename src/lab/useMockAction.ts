import { useCallback, useEffect, useRef, useState } from 'react';
import { delayedResult, type Outcome } from './model';
import type { Recorder } from './telemetry';

export function useMockAction(active: boolean, outcome: Outcome, recorder: Recorder, level: number) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failure'>('idle');
  const task = useRef<ReturnType<typeof delayedResult<Outcome>> | null>(null);
  const generation = useRef(0);
  const cancel = useCallback(() => {
    generation.current++;
    task.current?.cancel();
    task.current = null;
    setStatus('idle');
  }, []);
  const start = useCallback(() => {
    if (task.current || !active) return;
    const ticket = ++generation.current;
    const next = delayedResult(outcome, 1500);
    task.current = next;
    setStatus('pending');
    recorder.mark('mock-operation-start', level, outcome);
    void next.promise.then((result) => {
      if (ticket !== generation.current || result.canceled) return;
      task.current = null;
      setStatus(result.value);
      recorder.mark('mock-operation-finish', level, result.value);
    });
  }, [active, outcome, recorder, level]);
  const invalidate = useCallback(() => {
    generation.current++; task.current?.cancel(); task.current = null;
  }, []);
  useEffect(() => {
    if (!active) invalidate();
    return invalidate;
  }, [active, invalidate]);
  return { status: active ? status : 'idle' as const, start, cancel };
}
