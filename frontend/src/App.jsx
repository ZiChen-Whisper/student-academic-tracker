import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider } from './contexts/RoleContext';
import Layout from './components/Layout';
import AdminHome from './pages/admin/AdminHome';
import AdminOverview from './pages/admin/AdminOverview';
import AdminStudent from './pages/admin/AdminStudent';
import AdminNL2SQL from './pages/admin/AdminNL2SQL';
import AdminAlert from './pages/admin/AdminAlert';
import AdminChangeHistory from './pages/admin/AdminChangeHistory';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherOverview from './pages/teacher/TeacherOverview';
import TeacherStudent from './pages/teacher/TeacherStudent';
import TeacherNL2SQL from './pages/teacher/TeacherNL2SQL';
import TeacherAlert from './pages/teacher/TeacherAlert';
import StudentHome from './pages/StudentHome';
import StudentView from './pages/StudentView';
import StudentSuggestions from './pages/StudentSuggestions';
import ParentHome from './pages/ParentHome';
import ParentView from './pages/ParentView';
import ParentAlerts from './pages/ParentAlerts';

function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* 管理员视角 */}
            <Route index element={<Navigate to="/admin" replace />} />
            <Route path="admin" element={<AdminHome />} />
            <Route path="admin/overview" element={<AdminOverview />} />
            <Route path="admin/student" element={<AdminStudent />} />
            <Route path="admin/nl2sql" element={<AdminNL2SQL />} />
            <Route path="admin/alert" element={<AdminAlert />} />
            <Route path="admin/history" element={<AdminChangeHistory />} />

            {/* 教师视角 */}
            <Route path="teacher" element={<TeacherHome />} />
            <Route path="teacher/overview" element={<TeacherOverview />} />
            <Route path="teacher/student" element={<TeacherStudent />} />
            <Route path="teacher/nl2sql" element={<TeacherNL2SQL />} />
            <Route path="teacher/alert" element={<TeacherAlert />} />

            {/* 学生视角 */}
            <Route path="student-view" element={<StudentHome />} />
            <Route path="student-view/trends" element={<StudentView />} />
            <Route path="student-view/suggestions" element={<StudentSuggestions />} />

            {/* 家长视角 */}
            <Route path="parent-view" element={<ParentHome />} />
            <Route path="parent-view/report" element={<ParentView />} />
            <Route path="parent-view/alerts" element={<ParentAlerts />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  );
}

export default App;
