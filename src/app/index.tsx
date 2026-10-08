import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LIBRARIES, LIBRARY_INFO, SCENARIOS, SCENARIO_INFO, type Library } from '../lab/model';
import { Button, Card, Chips, Copy, Heading, layout, SafeArea } from '../lab/ui';

export default function Home() {
  const [library, setLibrary] = useState<Library>('expo');
  return <SafeArea className={layout.page}><ScrollView contentContainerClassName={layout.pageContent}>
    <Text className={layout.eyebrow}>NATIVE VS CUSTOM · IOS + ANDROID</Text>
    <Heading testID="lab-home">Bottom Sheet Lab</Heading>
    <Copy>Same tasks. Shared content. Three approaches. Compare behavior before drawing performance conclusions.</Copy>
    <Card><Text className={layout.label}>Choose the implementation</Text>
      <Chips values={LIBRARIES} selected={library} onSelect={setLibrary} prefix="library" />
      <Heading>{LIBRARY_INFO[library].name}</Heading>
      <Copy>{LIBRARY_INFO[library].description} · pinned {LIBRARY_INFO[library].version}</Copy>
    </Card>
    {SCENARIOS.map((scenario, index) => <Card key={scenario}>
      <View className={layout.row}><Text className={layout.eyebrow}>0{index + 1}</Text><Heading>{SCENARIO_INFO[scenario].title}</Heading></View>
      <Copy>{SCENARIO_INFO[scenario].detail}</Copy>
      <Button label={`Try ${SCENARIO_INFO[scenario].title.toLowerCase()}`} testID={`scenario-${scenario}`}
        onPress={() => router.push({ pathname: '/compare/[library]', params: { library, scenario } })} />
    </Card>)}
    <Button label="Comparison & benchmark notes" testID="open-report" secondary onPress={() => router.push('/report')} />
    <Copy>All data is deterministic and local. No destructive operation or wallet connection is real. Native modules require a development or release build—not Expo Go for the complete matrix.</Copy>
  </ScrollView></SafeArea>;
}
