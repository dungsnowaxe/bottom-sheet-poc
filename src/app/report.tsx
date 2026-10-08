import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Button, Card, Copy, Heading, layout, SafeArea } from '../lab/ui';

export default function Report() {
  return <SafeArea className={layout.page}><ScrollView contentContainerClassName={layout.pageContent}>
    <Button label="← Back" secondary onPress={() => router.back()} />
    <Heading testID="report-screen">Comparison notes</Heading>
    <Card><Heading>Expo UI · 57.0.22</Heading><Copy>Universal SwiftUI / Compose sheet with RNHostView for shared RN content. Android rests at partial/full only. Universal lacks a presentation-complete callback and an Android swipe-lock prop; recovery is not prevention. Embedded list gesture behavior and keyboard/footer clearance need native verification.</Copy></Card>
    <Card><Heading>Gorhom · 5.2.14</Heading><Copy>Reanimated/Gesture Handler sheet with explicit keyboard, footer, scrollable, and modal-stack adapters. Legend List uses useBottomSheetScrollableCreator. Greater control requires more integration configuration. JS-busy behavior must be measured, not assumed.</Copy></Card>
    <Card><Heading>TrueSheet · stable 3.11.18</Heading><Copy>Native presentation with keyboard handling, floating footer, and retained stacking. Scrollable content uses fixed detents; v3 does not support auto detents with scrollables. Native scroll-view discovery and Legend List geometry need device testing. No v4 beta APIs are used.</Copy></Card>
    <Card><Heading>No measured winner yet</Heading><Copy>See docs/comparison.md and docs/benchmark-protocol.md for evidence status, acceptance checks, release build commands, and the five-run protocol. In-app logs are JS-observed lifecycle events—not UI frame or native-memory measurements.</Copy></Card>
  </ScrollView></SafeArea>;
}
