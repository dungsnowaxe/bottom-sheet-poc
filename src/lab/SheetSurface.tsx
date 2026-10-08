import { BottomSheet as ExpoBottomSheet, RNHostView } from '@expo/ui';
import { interactiveDismissDisabled } from '@expo/ui/swift-ui/modifiers';
import {
  BottomSheetBackdrop, BottomSheetFooter, BottomSheetModal, BottomSheetView,
  type BottomSheetBackdropProps, type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Library } from './model';
import type { Recorder } from './telemetry';
import { palette } from './ui';
import { DiagnosticControl } from './Diagnostic';

export type SurfaceProps = {
  library: Library; open: boolean; level: number; sizing: 'auto' | 'scroll';
  dismissible?: boolean; topActive?: boolean; header: ReactNode; children: ReactNode; footer?: ReactNode;
  onDismiss: () => void; onRequestClose: () => void; recorder: Recorder;
};
export function SheetSurface(original: SurfaceProps) {
  const props = { ...original, header: <>{original.header}{original.level === 0 ? <View className="px-5 pb-2"><DiagnosticControl /></View> : null}</> };
  // Separate components prevent loading one implementation's hooks inside another's context.
  switch (props.library) {
    case 'expo': return <ExpoSurface {...props} />;
    case 'gorhom': return <GorhomSurface {...props} />;
    case 'true': return <TrueSurface {...props} />;
  }
}
function ExpoSurface({ open, level, sizing, dismissible = true, header, children, footer, onDismiss, onRequestClose, recorder }: SurfaceProps) {
  const [recovery, setRecovery] = useState(0);
  const { width } = useWindowDimensions();
  useEffect(() => { recorder.mark(open ? 'present-request' : 'dismiss-request', level); }, [open, level, recorder]);
  return <ExpoBottomSheet key={recovery} isPresented={open} contentPadding={0} containerColor={palette.white}
    testID={`sheet-${level}`} snapPoints={sizing === 'scroll' ? ['half', 'full'] : undefined}
    shouldDismissOnBackPress={dismissible} shouldDismissOnClickOutside={dismissible}
    modifiers={Platform.OS === 'ios' ? [interactiveDismissDisabled(!dismissible)] : undefined}
    onDismiss={() => {
      recorder.mark('expo-dismiss-notification', level);
      if (open && !dismissible) {
        // Universal Android does not expose sheetGesturesEnabled. This is recovery,
        // NOT pre-dismissal interception; explicitly reported as a limitation.
        recorder.mark('dismissal-recovery-not-interception', level);
        setRecovery((value) => value + 1);
        onRequestClose();
      } else onDismiss();
    }}>
    <RNHostView matchContents={sizing === 'auto'}>
      {/* Auto hosts need a numeric Yoga width; contentPadding=0 means no extra inset to subtract. */}
      <View className={sizing === 'scroll' ? 'flex-1' : undefined} style={sizing === 'scroll' ? undefined : { width }}
        onLayout={() => { if (open) recorder.mark('content-layout-not-presented', level); }}>
        {header}
        {children}
        {footer}
      </View>
    </RNHostView>
  </ExpoBottomSheet>;
}
function GorhomSurface({ open, level, sizing, dismissible = true, topActive = true, header, children, footer, onDismiss, onRequestClose, recorder }: SurfaceProps) {
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const previous = useRef(false);
  useEffect(() => {
    if (!open || !topActive || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onRequestClose(); return true; });
    return () => subscription.remove();
  }, [open, topActive, onRequestClose]);
  useEffect(() => {
    if (open === previous.current) return;
    previous.current = open;
    recorder.mark(open ? 'present-request' : 'dismiss-request', level);
    if (open) ref.current?.present(); else ref.current?.dismiss();
  }, [open, level, recorder]);
  const backdrop = useCallback((props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props}
    appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior={dismissible ? 'close' : 'none'}
    onPress={dismissible ? undefined : onRequestClose} />, [dismissible, onRequestClose]);
  const renderFooter = useCallback((props: BottomSheetFooterProps) => <BottomSheetFooter {...props} bottomInset={0}>
    {footer}
  </BottomSheetFooter>, [footer]);
  return <BottomSheetModal ref={ref} name={`lab-${level}`} stackBehavior="push"
    snapPoints={sizing === 'scroll' ? ['50%', '95%'] : undefined}
    enableDynamicSizing={sizing === 'auto'} enablePanDownToClose={dismissible}
    topInset={insets.top} keyboardBehavior="interactive" keyboardBlurBehavior="restore"
    enableBlurKeyboardOnGesture android_keyboardInputMode="adjustResize"
    backdropComponent={backdrop} footerComponent={footer ? renderFooter : undefined}
    backgroundStyle={{ backgroundColor: palette.white }} handleIndicatorStyle={{ backgroundColor: palette.muted }}
    onChange={(index) => { if (index >= 0) recorder.mark('detent-settled-js', level, index); }}
    onDismiss={() => { recorder.mark('dismissed-js', level); previous.current = false; onDismiss(); }}>
    {sizing === 'auto' ? <BottomSheetView testID={`sheet-${level}`}>{header}{children}</BottomSheetView>
      : <View testID={`sheet-${level}`} className="flex-1">{header}{children}</View>}
  </BottomSheetModal>;
}
function TrueSurface({ open, level, sizing, dismissible = true, header, children, footer, onDismiss, onRequestClose, recorder }: SurfaceProps) {
  const ref = useRef<TrueSheet>(null);
  const previous = useRef(false);
  useEffect(() => {
    if (open === previous.current) return;
    previous.current = open;
    recorder.mark(open ? 'present-request' : 'dismiss-request', level);
    const operation = open ? ref.current?.present() : ref.current?.dismiss();
    void operation?.catch((error: unknown) => {
      recorder.mark('native-operation-error', level, String(error));
      previous.current = false;
    });
  }, [open, level, recorder]);
  return <TrueSheet ref={ref} testID={`sheet-${level}`} detents={sizing === 'auto' ? ['auto'] : [0.5, 1]}
    backgroundColor={palette.white} dismissible={dismissible} scrollable={sizing === 'scroll'}
    scrollableOptions={{ keyboardScrollOffset: footer ? 100 : 16 }}
    header={<View>{header}</View>} footer={footer ? <View>{footer}</View> : undefined}
    onBackPress={() => { onRequestClose(); return true; }}
    onDidPresent={() => recorder.mark('presented-js', level)}
    onDetentChange={({ nativeEvent }) => recorder.mark('detent-settled-js', level, nativeEvent.index)}
    onDidDismiss={() => { recorder.mark('dismissed-js', level); previous.current = false; onDismiss(); }}>
    {sizing === 'scroll' ? children : <View>{children}</View>}
  </TrueSheet>;
}
