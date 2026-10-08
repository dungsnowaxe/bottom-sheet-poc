import { describe, expect, test } from 'bun:test';
import { chooseNetwork, chooseWallet, delayedResult, EMPTY_WIZARD, initialForm, makeRows, validateForm } from '../src/lab/model';

// Public scenario rules; native keyboard/gesture behavior belongs to device acceptance,
// not mocks of the three libraries.
describe('wallet selection', () => {
  test('changing networks clears the previous wallet but revisiting the same network retains it', () => {
    const selected = chooseWallet(chooseNetwork(EMPTY_WIZARD, 'ethereum'), 'MetaMask');
    expect(selected).toEqual({ network: 'ethereum', wallet: 'MetaMask', step: 2 });
    expect(chooseNetwork(selected, 'ethereum')).toEqual({ network: 'ethereum', wallet: 'MetaMask', step: 1 });
    expect(chooseNetwork(selected, 'solana')).toEqual({ network: 'solana', wallet: null, step: 1 });
  });
  test('a wallet cannot advance the flow without a compatible network', () => {
    expect(chooseWallet(EMPTY_WIZARD, 'MetaMask')).toEqual(EMPTY_WIZARD);
    const solana = chooseNetwork(EMPTY_WIZARD, 'solana');
    expect(chooseWallet(solana, 'MetaMask')).toEqual({ network: 'solana', wallet: null, step: 1 });
  });
});
test('validation identifies invalid fields without mutating the rest of the draft', () => {
  const values = initialForm();
  values[0] = ' '; values[1] = 'invalid'; values[14] = 'also-invalid'; values[19] = 'Retain this biography';
  const before = [...values];
  expect(validateForm(values)).toEqual({ 0: 'Display name is required', 1: 'Enter a valid email', 14: 'Enter a valid contact email' });
  expect(values).toEqual(before);
  expect(validateForm(initialForm())).toEqual({});
});
test('paging produces stable unique IDs and clamps the final page to the cap', () => {
  expect(makeRows(0, 2)).toEqual([{ id: 'row-0', index: 0 }, { id: 'row-1', index: 1 }]);
  expect(makeRows(49998, 1000)).toEqual([{ id: 'row-49998', index: 49998 }, { id: 'row-49999', index: 49999 }]);
  expect(makeRows(50000, 1000)).toEqual([]);
});
test('canceling a pending operation cannot produce a late success', async () => {
  const task = delayedResult('success', 10);
  task.cancel(); task.cancel();
  expect(await task.promise).toEqual({ canceled: true });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(await task.promise).toEqual({ canceled: true });
});
test('an uncanceled operation delivers the configured outcome', async () => {
  expect(await delayedResult('failure', 1).promise).toEqual({ canceled: false, value: 'failure' });
});
