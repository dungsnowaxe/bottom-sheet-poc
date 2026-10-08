import { Redirect, useLocalSearchParams } from 'expo-router';
import { ComparisonScreen } from '../../lab/ComparisonScreen';
import { LIBRARIES, SCENARIOS, type Library, type Scenario } from '../../lab/model';

export default function CompareRoute() {
  const params = useLocalSearchParams<{ library: string; scenario: string }>();
  if (!(LIBRARIES as readonly string[]).includes(params.library) || !(SCENARIOS as readonly string[]).includes(params.scenario)) {
    return <Redirect href="/" />;
  }
  return <ComparisonScreen key={`${params.library}-${params.scenario}`} library={params.library as Library} scenario={params.scenario as Scenario} />;
}
