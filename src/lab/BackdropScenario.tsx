import { View } from 'react-native';
import type { Library } from './model';
import type { Recorder } from './telemetry';
import { SheetSurface } from './SheetSurface';
import { Button, Copy, Heading, layout } from './ui';

export function BackdropScenario({ library, variant, open, close, recorder }: {
  library: Library; variant: 'dimmed' | 'blur'; open: boolean; close: () => void; recorder: Recorder;
}) {
  return <SheetSurface library={library} open={open} level={0} sizing="auto"
    recorder={recorder} onDismiss={close} onRequestClose={close}
    header={<View className={layout.sheetHeader}>
      <Heading testID={`backdrop-${variant}-screen`}>{variant === 'blur' ? 'Blur backdrop' : 'Dimmed backdrop'}</Heading>
      <Copy>{variant === 'blur'
        ? 'The lab page is blurred using a shared Expo BlurView beneath the sheet. The implementation’s normal dimming remains on top.'
        : 'The implementation’s default dimmed backdrop darkens the page while keeping the sheet content clear.'}</Copy>
    </View>}>
    <View className={layout.sheetBody}>
      <Copy>Inspect the text and cards behind the sheet. Tap outside or swipe down to dismiss, then reopen to check that the background resets.</Copy>
      <Button label="Close sheet" testID="backdrop-close" onPress={close} />
    </View>
  </SheetSurface>;
}
