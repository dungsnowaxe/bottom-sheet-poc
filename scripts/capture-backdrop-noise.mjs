#!/usr/bin/env node
// Android-only pixel capture; Argent drives the saved flow. No simultaneous
// Argent video recording, so it cannot add a second screen-capture workload.
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = resolve(root, 'node_modules/@swmansion/argent/dist/cli.js');
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i+1] || args[i+1].startsWith('--')) throw Error(`Missing value for ${name}`);
  return args[i+1];
}
const udid = option('--device', 'emulator-5554');
const output = resolve(root, option('--out', 'artifacts/backdrop-noise/repeat'));
const selectedCase = option('--case', 'all');
const cases = ['expo-dimmed', 'expo-blur', 'gorhom-dimmed', 'gorhom-blur', 'true-dimmed', 'true-blur'];
if (selectedCase !== 'all' && !cases.includes(selectedCase)) throw Error('Invalid --case');
mkdirSync(output, { recursive: true });
function run(tool, params) {
  const result = JSON.parse(execFileSync(process.execPath,
    [cli, 'run', tool, '--args', JSON.stringify(params)],
    { cwd: root, encoding: 'utf8', timeout: 60_000 }));
  if (result.success === false || result.ok === false) throw Error(`${tool}: ${JSON.stringify(result)}`);
  return result;
}
function adb(...params) {
  return execFileSync('adb', ['-s', udid, ...params], { encoding: 'utf8', timeout: 15_000 });
}

for (const name of cases.filter(c => selectedCase === 'all' || c === selectedCase)) {
  const [library, scenario] = name.split('-');
  run('restart-app', { udid, bundleId: 'dev.snowaxe.bottomsheetpoc' });
  // Cold-start deep links can otherwise be lost while the JS runtime boots.
  run('await-ui-element', { udid, condition: 'visible', selector: { identifier: 'lab-home' }, timeoutMs: 10_000 });
  run('open-url', { udid, url: `sheetlab://compare/${library}?scenario=${scenario}` });
  run('await-ui-element', { udid, condition: 'visible', selector: { identifier: `compare-${library}-${scenario}` }, timeoutMs: 10_000 });
  run('await-screen-idle', { udid });
  const prefix = resolve(output, name);
  const remote = `/sdcard/sheetlab-noise-${process.pid}-${name}.mp4`;
  const stdout = createWriteStream(prefix+'-capture.log');
  const stderr = createWriteStream(prefix+'-stderr.log');
  const startedAt = Date.now();
  const child = spawn('adb', ['-s', udid, 'shell',
    `screenrecord --verbose --bit-rate 40M --time-limit 28 ${remote} & pid=$!; echo PID:$pid; wait $pid`]);
  let log = '';
  child.stdout.on('data', data => { log += data.toString(); stdout.write(data); });
  child.stderr.pipe(stderr);
  let spawnError;
  child.on('error', error => { spawnError = error; });
  const closed = new Promise(resolveClose => child.once('close', code => resolveClose(code)));
  const reminder = setTimeout(() => console.warn(`Stop native capture reminder: ${name}`), 24_000);
  let replay;
  let captureExitCode;
  try {
    // Initial image/encoder warmup; analysis uses actual PTS, not this nominal time.
    await sleep(500);
    if (spawnError) throw spawnError;
    if (!/PID:\d+/.test(log)) throw Error('Native recorder did not acknowledge its PID');
    replay = run('flow-execute', { name: 'backdrop-noise-hold-android', project_root: root,
      device: udid, prerequisiteAcknowledged: true });
  } finally {
    clearTimeout(reminder);
    const pid = log.match(/PID:(\d+)/)?.[1];
    // Only signal the recorder created above, never another agent's recording.
    if (pid && child.exitCode === null) {
      try { adb('shell', 'kill', '-2', pid); } catch (error) {
        console.warn(`Recorder stop: ${error.message}`);
      }
    }
    captureExitCode = await closed;
    stdout.end();
    writeFileSync(prefix+'-metadata.json', JSON.stringify({
      device: udid, case: name, app: 'dev.snowaxe.bottomsheetpoc', startedAt,
      capture: { method: 'adb-screenrecord', bitrate: '40M', nativeResolution: true, captureExitCode },
      replay,
    }, null, 2)+'\n');
    adb('pull', remote, prefix+'.mp4');
    adb('shell', 'rm', '-f', remote);
  }
  if (captureExitCode !== 0) throw Error(`Native capture exited ${captureExitCode}`);
  console.log(`${name}: replay passed (${replay.passed} non-echo steps); ${prefix}.mp4`);
}
