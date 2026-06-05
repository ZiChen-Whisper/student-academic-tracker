import { createContext, useContext, useState, useCallback } from 'react';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRole] = useState('admin'); // 'admin' | 'teacher' | 'student' | 'parent'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedAdminName, setSelectedAdminName] = useState('');
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState('');

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
