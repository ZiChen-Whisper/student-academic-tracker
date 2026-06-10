import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const RoleContext = createContext(null);

// localStorage 辅助函数
function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => loadFromStorage('role', 'admin'));
  const [selectedStudentId, setSelectedStudentId] = useState(() => loadFromStorage('selectedStudentId', ''));
  const [selectedStudentName, setSelectedStudentName] = useState(() => loadFromStorage('selectedStudentName', ''));
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => loadFromStorage('selectedTeacherId', ''));
  const [selectedTeacherName, setSelectedTeacherName] = useState(() => loadFromStorage('selectedTeacherName', ''));
  const [selectedAdminId, setSelectedAdminId] = useState(() => loadFromStorage('selectedAdminId', ''));
  const [selectedAdminName, setSelectedAdminName] = useState(() => loadFromStorage('selectedAdminName', ''));
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState(() => loadFromStorage('selectedTeacherClassId', ''));
  const [teacherClasses, setTeacherClasses] = useState(() => loadFromStorage('teacherClasses', []));

  // 持久化到 localStorage
  useEffect(() => { saveToStorage('role', role); }, [role]);
  useEffect(() => { saveToStorage('selectedStudentId', selectedStudentId); }, [selectedStudentId]);
  useEffect(() => { saveToStorage('selectedStudentName', selectedStudentName); }, [selectedStudentName]);
  useEffect(() => { saveToStorage('selectedTeacherId', selectedTeacherId); }, [selectedTeacherId]);
  useEffect(() => { saveToStorage('selectedTeacherName', selectedTeacherName); }, [selectedTeacherName]);
  useEffect(() => { saveToStorage('selectedAdminId', selectedAdminId); }, [selectedAdminId]);
  useEffect(() => { saveToStorage('selectedAdminName', selectedAdminName); }, [selectedAdminName]);
  useEffect(() => { saveToStorage('selectedTeacherClassId', selectedTeacherClassId); }, [selectedTeacherClassId]);
  useEffect(() => { saveToStorage('teacherClasses', teacherClasses); }, [teacherClasses]);

  const switchRole = useCallback((newRole) => {
    setRole(newRole);
  }, []);

  const selectStudent = useCallback((id, name) => {
    setSelectedStudentId(id);
    setSelectedStudentName(name);
  }, []);

  const clearStudent = useCallback(() => {
    setSelectedStudentId('');
    setSelectedStudentName('');
  }, []);

  const selectTeacher = useCallback((id, name) => {
    setSelectedTeacherId(id);
    setSelectedTeacherName(name);
  }, []);

  const clearTeacher = useCallback(() => {
    setSelectedTeacherId('');
    setSelectedTeacherName('');
    setSelectedTeacherClassId('');
    setTeacherClasses([]);
  }, []);

  const selectAdmin = useCallback((id, name) => {
    setSelectedAdminId(id);
    setSelectedAdminName(name);
  }, []);

  const clearAdmin = useCallback(() => {
    setSelectedAdminId('');
    setSelectedAdminName('');
  }, []);

  return (
    <RoleContext.Provider value={{
      role,
      switchRole,
      selectedStudentId,
      selectedStudentName,
      selectStudent,
      clearStudent,
      selectedTeacherId,
      selectedTeacherName,
      selectTeacher,
      clearTeacher,
      selectedAdminId,
      selectedAdminName,
      selectAdmin,
      clearAdmin,
      selectedTeacherClassId,
      setSelectedTeacherClassId,
      teacherClasses,
      setTeacherClasses,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
