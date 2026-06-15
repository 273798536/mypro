import { AppProvider } from './context/AppContext';
import TopBar from './components/TopBar';
import FilterPanel from './components/FilterPanel';
import RecordList from './components/RecordList';
import RecordDetail from './components/RecordDetail';
import './App.css';

export default function App() {
  return (
    <AppProvider>
      <div className="app-root">
        <TopBar />
        <div className="app-main">
          <div className="app-left">
            <FilterPanel />
            <RecordList />
          </div>
          <div className="app-right">
            <RecordDetail />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
