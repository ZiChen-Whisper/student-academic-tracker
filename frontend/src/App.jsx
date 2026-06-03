import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Student from './pages/Student';
import NL2SQL from './pages/NL2SQL';
import Alert from './pages/Alert';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="student" element={<Student />} />
          <Route path="nl2sql" element={<NL2SQL />} />
          <Route path="alert" element={<Alert />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
