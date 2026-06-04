import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoleProvider } from './contexts/RoleContext';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Student from './pages/Student';
import NL2SQL from './pages/NL2SQL';
import Alert from './pages/Alert';
import StudentView from './pages/StudentView';
import StudentSuggestions from './pages/StudentSuggestions';
import ParentView from './pages/ParentView';
import ParentAlerts from './pages/ParentAlerts';

function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* 教师视角 */}
            <Route index element={<Overview />} />
            <Route path="student" element={<Student />} />
            <Route path="nl2sql" element={<NL2SQL />} />
            <Route path="alert" element={<Alert />} />

            {/* 学生视角 */}
            <Route path="student-view" element={<StudentView />} />
            <Route path="student-view/suggestions" element={<StudentSuggestions />} />

            {/* 家长视角 */}
            <Route path="parent-view" element={<ParentView />} />
            <Route path="parent-view/alerts" element={<ParentAlerts />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  );
}

export default App;
