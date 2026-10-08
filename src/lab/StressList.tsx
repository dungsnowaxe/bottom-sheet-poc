import { useBottomSheetScrollableCreator } from '@gorhom/bottom-sheet';
import { LegendList, type LegendListProps, type LegendListRef } from '@legendapp/list/react-native';
import { cn } from 'cn';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { delayedResult, INITIAL_ROWS, makeRows, MAX_ROWS, PAGE_SIZE, type Library, type RowMode, type StressRow } from './model';
import { SheetSurface } from './SheetSurface';
import type { Recorder } from './telemetry';
import { Button, Copy, Heading, layout, palette } from './ui';

const keyExtractor = (item: StressRow) => item.id;
const fixedLight = () => 56;
const fixedHeavy = () => 164;
const StressItem = memo(function StressItem({ item, mode }: { item: StressRow; mode: RowMode }) {
  if (mode === 'light') return <View className="h-14 justify-center border-b border-line px-5">
    <Text className={layout.label}>Row {item.index + 1}</Text>
  </View>;
  // Fixed, identical synthetic expense for all adapters; no remote images, clocks or randomness.
  let checksum = item.index + 1;
  for (let i = 0; i < 20000; i++) checksum = (Math.imul(checksum, 1664525) + 1013904223) >>> 0;
  return <View className={cn('h-[164px] gap-[9px] border-b border-line p-4', item.index % 2 ? 'bg-row-alt' : 'bg-sheet')}>
    <View className={layout.row}><View className="h-[34px] w-[34px] rounded-[10px]" style={{ backgroundColor: `hsl(${checksum % 360}, 60%, 60%)` }} />
      <View><Text className={layout.label}>Synthetic asset {item.index + 1}</Text><Text className={layout.copy}>Local render workload · {checksum.toString(16)}</Text></View></View>
    <View className="h-[34px] flex-row items-end gap-[3px]">
      {Array.from({ length: 20 }, (_, i) => <View key={i} className="flex-1 rounded-[2px] bg-accent" style={{ height: 6 + ((checksum >>> (i % 24)) % 28) }} />)}
    </View>
    <Text className={layout.copy}>Nested views + 20,000 deterministic arithmetic iterations</Text>
  </View>;
});
function IntegratedList(props: LegendListProps<StressRow> & { listRef: React.RefObject<LegendListRef | null> }) {
  const { listRef, ...rest } = props;
  const scrollable = useBottomSheetScrollableCreator();
  return <LegendList {...rest} ref={listRef} renderScrollComponent={scrollable} />;
}
export function StressList({ library, open, close, mode, recorder }: {
  library: Library; open: boolean; close: () => void; mode: RowMode; recorder: Recorder;
}) {
  const [rows, setRows] = useState(() => makeRows(0, INITIAL_ROWS));
  const rowsRef = useRef(rows);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [armed, setArmed] = useState(false);
  const failNext = useRef(false);
  const task = useRef<ReturnType<typeof delayedResult<boolean>> | null>(null);
  const ticket = useRef(0);
  const ref = useRef<LegendListRef>(null);
  const [pagingEnabled, setPagingEnabled] = useState(false);
  useEffect(() => () => { ticket.current++; task.current?.cancel(); }, []);
  useEffect(() => {
    if (!open) { ticket.current++; task.current?.cancel(); task.current = null; }
  }, [open]);
  const load = useCallback((retry = false) => {
    if (!open || task.current || rowsRef.current.length >= MAX_ROWS || (error && !retry)) return;
    const generation = ++ticket.current;
    const fail = failNext.current;
    failNext.current = false; setArmed(false);
    const next = delayedResult(fail, 600);
    task.current = next; setLoading(true); setError(false);
    recorder.mark('page-request', 0, rowsRef.current.length);
    void next.promise.then((result) => {
      if (generation !== ticket.current || result.canceled) return;
      task.current = null; setLoading(false);
      if (result.value) { setError(true); recorder.mark('page-failed'); return; }
      const updated = [...rowsRef.current, ...makeRows(rowsRef.current.length, PAGE_SIZE)];
      rowsRef.current = updated; setRows(updated);
      recorder.mark('page-loaded', 0, updated.length);
    });
  }, [open, error, recorder]);
  const refresh = useCallback(() => {
    task.current?.cancel();
    const generation = ++ticket.current;
    const next = delayedResult(false, 600);
    task.current = next; setRefreshing(true); setLoading(false); setError(false);
    failNext.current = false; setArmed(false);
    recorder.mark('refresh-request');
    void next.promise.then((result) => {
      if (generation !== ticket.current || result.canceled) return;
      task.current = null;
      const initial = makeRows(0, INITIAL_ROWS);
      setPagingEnabled(false);
      rowsRef.current = initial; setRows(initial); setRefreshing(false);
      ref.current?.scrollToOffset({ offset: 0, animated: false });
      recorder.mark('refresh-completed', 0, INITIAL_ROWS);
    });
  }, [recorder]);
  const renderItem = useCallback(({ item }: { item: StressRow }) => <StressItem item={item} mode={mode} />, [mode]);
  const listProps: LegendListProps<StressRow> = {
    data: rows, renderItem, keyExtractor, recycleItems: true,
    getFixedItemSize: mode === 'light' ? fixedLight : fixedHeavy,
    estimatedItemSize: mode === 'light' ? 56 : 164,
    // Native hosts can report a transient zero-sized viewport during presentation.
    // Do not treat that mount-time geometry as a user reaching the end.
    onScrollBeginDrag: () => setPagingEnabled(true),
    // Do not consume Legend's reached-edge gate with a mount-time no-op callback.
    // Subscribe only after an explicit scroll interaction; refresh unsubscribes.
    onEndReached: pagingEnabled && !refreshing ? () => load() : undefined, onEndReachedThreshold: 0.5,
    refreshing, onRefresh: refresh, style: { flex: 1 }, testID: 'stress-list',
    ListFooterComponent: <View className="gap-2.5 p-4">
      {loading ? <ActivityIndicator testID="list-loading" color={palette.accent} /> : null}
      {error ? <><Text testID="list-error" className={layout.error}>Mock page failed. Existing rows are retained.</Text>
        <Button label="Retry page" testID="list-retry" onPress={() => load(true)} /></> : null}
      {rows.length >= MAX_ROWS ? <Copy testID="list-end">All 50,000 rows loaded.</Copy> : <Copy>Scroll to load another 1,000 rows.</Copy>}
    </View>,
  };
  return <SheetSurface library={library} open={open} level={0} sizing="scroll" recorder={recorder}
    onDismiss={close} onRequestClose={close}
    header={<View className={layout.sheetHeader}><Heading testID="list-screen">Legend List · {mode}</Heading>
      <Copy testID="list-count">{rows.length.toLocaleString('en-US')} / 50,000 rows · pull to refresh</Copy>
      <View className={layout.row}>
        <Button label="Jump to end" testID="list-jump" secondary onPress={() => {
          setPagingEnabled(true);
          requestAnimationFrame(() => ref.current?.scrollToEnd({ animated: false }));
        }} />
        <Button label={armed ? 'Failure armed' : 'Fail next page'} testID="list-arm-failure" secondary onPress={() => { failNext.current = true; setArmed(true); }} />
        <Button label="Close" testID="list-close" secondary onPress={close} />
      </View>
    </View>}>
    {library === 'gorhom' ? <IntegratedList {...listProps} listRef={ref} /> : <LegendList {...listProps} ref={ref} />}
  </SheetSurface>;
}
