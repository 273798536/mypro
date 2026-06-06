import LevelSelect from './components/LevelSelect'
import AnnotationWorkspace from './components/AnnotationWorkspace'
import { useStore } from './store/useStore'

function App() {
  const { currentLevel, isCompleted, settlement } = useStore()

  return (
    <div className="App">
      {currentLevel ? (
        isCompleted && settlement ? (
          <AnnotationWorkspace />
        ) : (
          <AnnotationWorkspace />
        )
      ) : (
        <LevelSelect />
      )}
    </div>
  )
}

export default App
