import { Routes, Route } from 'react-router-dom'
import LevelSelect from './pages/LevelSelect'
import Workspace from './pages/Workspace'
import Summary from './pages/Summary'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LevelSelect />} />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="/summary" element={<Summary />} />
    </Routes>
  )
}

export default App
