import { createContext, useContext, useState, useCallback } from 'react';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRole] = useState('teacher'); // 'teacher' | 'student' | 'parent'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedTeacherName, setSelectedTeacherName] = useState('');

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
