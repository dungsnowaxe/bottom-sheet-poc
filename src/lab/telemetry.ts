import { Platform } from 'react-native';
import { LIBRARY_INFO, type Library, type Scenario, type RowMode, type Outcome } from './model';

export type Event = { atMs: number; name: string; level: number; detail?: string | number };
export type RunConfig = { library: Library; scenario: Scenario; rowMode: RowMode; outcome: Outcome; condition: 'baseline' | 'js-busy' };
export type RunLog = {
  schemaVersion: 1; startedAt: string; build: 'development' | 'release'; platform: string; osVersion: string;
  versions: Record<string, string>; config: RunConfig; events: Event[];
  caveats: string[];
};
export function createRunLog(config: RunConfig) {
  const start = performance.now();
  const log: RunLog = {
    schemaVersion: 1, startedAt: new Date().toISOString(), build: __DEV__ ? 'development' : 'release',
    platform: Platform.OS, osVersion: String(Platform.Version),
    versions: { expo: '57.0.27', reactNative: '0.86.3', expoUI: LIBRARY_INFO.expo.version, gorhom: LIBRARY_INFO.gorhom.version, trueSheet: LIBRARY_INFO.true.version, legendList: '3.6.0' },
    config: { ...config }, events: [],
    caveats: ['JS-observed callbacks include bridge/JS scheduling delay.', 'Content layout is NOT native presentation completion.', 'No UI FPS, native memory, or native frame timestamps are inferred from this log.'],
  };
  return {
    log,
    mark(name: string, level = 0, detail?: string | number) {
      // Bounded, non-reactive log: never rerender the sheet on a timing sample.
      if (log.events.length < 2000) log.events.push({ atMs: Math.round((performance.now() - start) * 100) / 100, name, level, detail });
    },
  };
}
export type Recorder = ReturnType<typeof createRunLog>;
