import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider } from './contexts/RoleContext';
import Layout from './components/Layout';
import AdminHome from './pages/admin/AdminHome';
import AdminDataManagement, { ClassSubjectPage, CoursePage } from './pages/admin/AdminDataManagement';
import AdminChangeHistory from './pages/admin/AdminChangeHistory';
import TableViewer from './components/TableViewer';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherOverview from './pages/teacher/TeacherOverview';
import TeacherStudent from './pages/teacher/TeacherStudent';
import TeacherAlert from './pages/teacher/TeacherAlert';
import TeacherScore from './pages/teacher/TeacherScore';
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
            <Route path="admin/data" element={<AdminDataManagement />}>
              <Route index element={<Navigate to="student" replace />} />
              <Route path="student" element={<TableViewer tableName="student" />} />
              <Route path="teacher" element={<TableViewer tableName="teacher" />} />
              <Route path="class-subject" element={<ClassSubjectPage />} />
              <Route path="class-subject/class" element={<TableViewer tableName="class" />} />
              <Route path="class-subject/subject" element={<TableViewer tableName="subject" />} />
              <Route path="course" element={<CoursePage />} />
              <Route path="course/course-schedule" element={<TableViewer tableName="course_schedule" />} />
              <Route path="course/student-subject" element={<TableViewer tableName="student_subject" />} />
              <Route path="score" element={<TableViewer tableName="exam_score" />} />
              <Route path="behavior" element={<TableViewer tableName="learning_behavior" />} />
              <Route path="family" element={<TableViewer tableName="family_background" />} />
              <Route path="alert" element={<TableViewer tableName="risk_alert" />} />
              <Route path="suggestion" element={<TableViewer tableName="learning_suggestion" />} />
              <Route path="log" element={<TableViewer tableName="nl2sql_log" readonly />} />
            </Route>
            <Route path="admin/history" element={<AdminChangeHistory />} />

            {/* 教师视角 */}
            <Route path="teacher" element={<TeacherHome />} />
            <Route path="teacher/overview" element={<TeacherOverview />} />
            <Route path="teacher/student" element={<TeacherStudent />} />
            <Route path="teacher/alert" element={<TeacherAlert />} />
            <Route path="teacher/score" element={<TeacherScore />} />

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