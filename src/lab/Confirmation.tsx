import { View } from 'react-native';
import type { Library, Outcome } from './model';
import type { Recorder } from './telemetry';
import { SheetSurface } from './SheetSurface';
import { Button, Copy, Heading, layout } from './ui';
import { useMockAction } from './useMockAction';

export function Confirmation({ library, open, close, outcome, recorder }: {
  library: Library; open: boolean; close: () => void; outcome: Outcome; recorder: Recorder;
}) {
  const action = useMockAction(open, outcome, recorder, 0);
  const pending = action.status === 'pending';
  const requestClose = () => { if (!pending) close(); };
  return <SheetSurface library={library} open={open} level={0} sizing="auto" dismissible={!pending}
    recorder={recorder} onDismiss={close} onRequestClose={requestClose}
    header={<View className={layout.sheetHeader}><Heading testID="confirmation-screen">Remove saved wallet?</Heading>
      <Copy>This only removes a mock saved entry. No wallet or funds are affected.</Copy></View>}>
    <View className={layout.sheetBody}>
      <Copy testID={`removal-${action.status}`}>{action.status === 'idle' ? 'You can cancel without changing anything.'
        : pending ? 'Removing… dismissal is locked where supported.'
        : action.status === 'success' ? 'Mock wallet removed.' : 'Mock removal failed. Nothing was removed.'}</Copy>
      {action.status === 'success' ? <Button label="Done" testID="confirmation-done" onPress={close} /> : <>
        <Button label={pending ? 'Removing…' : action.status === 'failure' ? 'Retry removal' : 'Remove'}
          testID="confirmation-remove" danger disabled={pending} onPress={action.start} />
        <Button label="Cancel" testID="confirmation-cancel" secondary disabled={pending} onPress={requestClose} />
      </>}
    </View>
  </SheetSurface>;
}
