import { cn } from 'cn';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState, type ComponentType, type RefAttributes } from 'react';
import { Alert, Keyboard, ScrollView, Text, TextInput, View, type ScrollViewProps, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { FIELD_NAMES, initialForm, validateForm, type Library } from './model';
import { SheetSurface } from './SheetSurface';
import type { Recorder } from './telemetry';
import { Button, Copy, Heading, layout, palette } from './ui';

// Gorhom's integrated input/scrollable expose RN-compatible imperative methods.
// Both are third-party components; wrap once to enable className support.
const IntegratedScroll = withUniwind(BottomSheetScrollView as unknown as ComponentType<ScrollViewProps & RefAttributes<ScrollView>>);
const IntegratedInput = withUniwind(BottomSheetTextInput as unknown as ComponentType<TextInputProps & RefAttributes<TextInput>>);
export function FormScenario({ library, open, close, recorder }: {
  library: Library; open: boolean; close: () => void; recorder: Recorder;
}) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(initialForm);
  const [saved, setSaved] = useState(initialForm);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('Required: display name and email. All data is local.');
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<(TextInput | null)[]>([]);
  const footer = useRef<View>(null);
  const viewport = useRef<View>(null);
  const offset = useRef(0);
  const focus = useRef<number | null>(null);
  const pendingMeasure = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = values.some((value, i) => value !== saved[i]);
  const Scroll = library === 'gorhom' ? IntegratedScroll : ScrollView;
  const Input = library === 'gorhom' ? IntegratedInput : TextInput;

  const ensureVisible = useCallback(() => {
    const index = focus.current;
    if (index === null) return; // Native avoidance alone can still leave multiline fields behind an overlay footer.
    const input = inputs.current[index];
    if (!input || !viewport.current || !footer.current) return;
    viewport.current.measureInWindow((_x, top, _w, height) => {
      footer.current?.measureInWindow((_fx, footerTop) => {
        input.measureInWindow((_ix, y, _iw, inputHeight) => {
          const bottom = Math.min(top + height, footerTop) - 16;
          const delta = y + inputHeight > bottom ? y + inputHeight - bottom : y < top + 12 ? y - top - 12 : 0;
          if (delta) scroll.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
        });
      });
    });
  }, []);
  const scheduleVisibility = useCallback(() => {
    if (pendingMeasure.current) clearTimeout(pendingMeasure.current);
    pendingMeasure.current = setTimeout(ensureVisible, 180);
  }, [ensureVisible]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => { recorder.mark('keyboard-shown-js'); scheduleVisibility(); });
    const hidden = Keyboard.addListener('keyboardDidHide', () => recorder.mark('keyboard-hidden-js'));
    return () => { shown.remove(); hidden.remove(); if (pendingMeasure.current) clearTimeout(pendingMeasure.current); };
  }, [recorder, scheduleVisibility]);
  const requestClose = useCallback(() => {
    if (!dirty) { Keyboard.dismiss(); close(); return; }
    Alert.alert('Discard edits?', 'Your unsaved mock edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { Keyboard.dismiss(); close(); } },
    ]);
  }, [dirty, close]);
  const save = () => {
    const next = validateForm(values);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first !== undefined) {
      setMessage('Fix the highlighted fields. Your other values are preserved.');
      inputs.current[Number(first)]?.focus();
      focus.current = Number(first);
      scheduleVisibility();
      recorder.mark('form-validation-failed');
      return;
    }
    setSaved([...values]);
    setMessage('Saved locally. Keep editing or close.');
    recorder.mark('form-saved');
  };
  const footerNode = <View ref={footer} className={layout.footer} style={{ paddingBottom: Math.max(12, insets.bottom + 8) }} onLayout={scheduleVisibility}>
    <Copy testID="form-status">{message}</Copy>
    <View className={layout.row}><View className="flex-1"><Button label="Save" testID="form-save" onPress={save} /></View>
      <Button label="Close" testID="form-close" secondary onPress={requestClose} /></View>
  </View>;
  return <SheetSurface library={library} open={open} level={0} sizing="scroll" dismissible={!dirty}
    recorder={recorder} onDismiss={close} onRequestClose={requestClose} footer={footerNode}
    header={<View className={layout.sheetHeader}><Heading testID="form-screen">Edit wallet info</Heading>
      <Copy>20 fields · {dirty ? 'unsaved edits' : 'saved'} · never enter real secrets</Copy>
      <View className={layout.row}>{[0, 9, 19].map((index) => <Button key={index} label={`Focus ${index + 1}`}
        testID={`focus-field-${index}`} secondary onPress={() => {
          focus.current = index;
          scroll.current?.scrollTo({ y: index * 98, animated: false });
          inputs.current[index]?.focus();
          scheduleVisibility();
        }} />)}</View>
    </View>}>
    <View ref={viewport} className="flex-1" onLayout={scheduleVisibility}>
      <Scroll ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        scrollEventThrottle={32} onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; if (focus.current !== null) scheduleVisibility(); }}
        contentContainerClassName="gap-3.5 p-5 pb-40" className="flex-1">
        {FIELD_NAMES.map((label, i) => <View key={label} className="gap-1.5">
          <Text className={layout.label}>{i + 1}. {label}</Text>
          <Input ref={(node) => { inputs.current[i] = node; }} testID={`form-field-${i}`} accessibilityLabel={label}
            value={values[i]} placeholder={label} placeholderTextColor={palette.muted}
            autoCapitalize={i === 1 || i === 14 || i === 5 ? 'none' : 'sentences'} autoCorrect={i !== 1 && i !== 14}
            keyboardType={i === 1 || i === 14 ? 'email-address' : i === 2 ? 'phone-pad' : i === 9 || i === 15 ? 'number-pad' : i === 5 ? 'url' : 'default'}
            multiline={i >= 18}
            className={cn(layout.input, i >= 18 && 'min-h-[100px]', errors[i] && 'border-danger')}
            style={i >= 18 ? { textAlignVertical: 'top' } : undefined}
            onContentSizeChange={scheduleVisibility}
            onBlur={() => { if (focus.current === i) focus.current = null; }}
            onChangeText={(text) => setValues((previous) => previous.map((value, index) => index === i ? text : value))}
            onFocus={() => { focus.current = i; recorder.mark('input-focused', 0, i); scheduleVisibility(); }} />
          {errors[i] ? <Text testID={`form-error-${i}`} className={layout.error}>{errors[i]}</Text> : null}
        </View>)}
      </Scroll>
    </View>
  </SheetSurface>;
}
