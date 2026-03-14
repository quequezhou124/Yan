import type { BackendPage2Response, ScenarioData } from '../types/scenario'

export function mapBackendPage2ToScenarioData(
  response: BackendPage2Response,
  title = 'Generated Scenario',
): ScenarioData {
  return {
    title,
    sentences: response.p2.sentences,
    translations: response.p2.translation,
  }
}

// Later, replace the mock data source with a fetch such as:
// fetch(`/content/{scene}/{original language}/{country}`)
//   .then((response) => response.json())
//   .then((data) => mapBackendPage2ToScenarioData(data, title))
