import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QuestionList from './pages/QuestionList';
import QuestionDetail from './pages/QuestionDetail';
import ExamGenerator from './pages/ExamGenerator';
import QualityControl from './pages/QualityControl';
import AnswerEntry from './pages/AnswerEntry';
import { useStore } from './store/useStore';

function PageRouter() {
  const { currentPage, selectedQuestionId } = useStore();

  if (selectedQuestionId) {
    return <QuestionDetail />;
  }

  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />;
    case 'questions':
      return <QuestionList />;
    case 'generator':
      return <ExamGenerator />;
    case 'quality':
      return <QualityControl />;
    case 'answers':
      return <AnswerEntry />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  return (
    <Layout>
      <PageRouter />
    </Layout>
  );
}
