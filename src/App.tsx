import './App.css'
import { ScenarioPlayer } from './components/ScenarioPlayer'
import { mockScenario } from './data/mockScenario'

function App() {
  return <ScenarioPlayer scenario={mockScenario} />
}

export default App
