
'use client';

import { createContext, useContext, useState, useEffect, useCallback, FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { addDays } from 'date-fns';

interface School {
  id: string;
  name: string;
  signupDate?: string;
  subscriptionEndDate?: string;
}

interface LoginLog {
    schoolId: string;
    schoolName: string;
    timestamp: string;
}

interface AdminCredentials {
  id: string;
  password?: string;
}

interface AuthContextType {
  schoolId: string | null;
  schoolName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (schoolId: string) => string;
  signup: (schoolName: string, schoolId: string) => void;
  logout: (keepIdForRenewal?: boolean) => void;
  loginAdmin: (password: string) => void;
  getSchools: () => School[];
  setSchools: (schools: School[]) => void;
  addLoginLog: (school: School) => void;
  getAdminCredentials: () => AdminCredentials;
  setAdminCredentials: (creds: AdminCredentials) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getAdminCredentials = useCallback((): AdminCredentials => {
    if (typeof window === 'undefined') {
      return { id: 'admin', password: 'admin' };
    }
    try {
      const creds = localStorage.getItem('adminCredentials');
      if (creds) {
        return JSON.parse(creds);
      }
    } catch (e) {
      console.error("Could not access localStorage for admin credentials", e);
    }
    return { id: 'admin', password: 'admin' };
  }, []);

  const setAdminCredentials = useCallback((creds: AdminCredentials) => {
    try {
      localStorage.setItem('adminCredentials', JSON.stringify(creds));
    } catch (e) {
      console.error("Could not set admin credentials in localStorage", e);
    }
  }, []);
  
  const getSchools = useCallback((): School[] => {
    if (typeof window === 'undefined') return [];
    try {
        const schools = localStorage.getItem('registeredSchools');
        return schools ? JSON.parse(schools) : [];
    } catch (e) {
        console.error("Could not access localStorage", e);
        return [];
    }
  }, []);


  const logout = useCallback((keepIdForRenewal = false) => {
    try {
        if (!keepIdForRenewal) {
            localStorage.removeItem('schoolID');
            localStorage.removeItem('schoolIDForRenewal');
        }
        localStorage.removeItem('schoolName');
        localStorage.removeItem('isAdmin');
    } catch (e) {
        console.error("Could not access localStorage", e);
    }
    setSchoolId(null);
    setSchoolName(null);
    setIsAdmin(false);
    setIsLoading(false);
    router.push('/');
  }, [router]);

  useEffect(() => {
    try {
      const adminStatus = localStorage.getItem('isAdmin');
      if (adminStatus === 'true') {
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }
      
      const currentSchoolId = localStorage.getItem('schoolID');
      if (currentSchoolId) {
        const schools = getSchools();
        const school = schools.find(s => s.id === currentSchoolId);
        if (school) {
          const now = new Date();
          const hasSubscription = school.subscriptionEndDate && new Date(school.subscriptionEndDate) >= now;
          const trialDays = parseInt(localStorage.getItem('trialPeriodDays') || '30', 10);
          const inTrial = school.signupDate && addDays(new Date(school.signupDate), trialDays) >= now;

          if (hasSubscription || inTrial) {
            setSchoolId(school.id);
            setSchoolName(school.name);
          } else {
            logout(true);
          }
        } else {
          logout();
        }
      }
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setIsLoading(false);
  }, [getSchools, logout]);

  const setSchools = useCallback((schools: School[]) => {
    try {
        localStorage.setItem('registeredSchools', JSON.stringify(schools));
    } catch (e) {
        console.error("Could not access localStorage", e);
    }
  }, []);

  const addLoginLog = useCallback((school: School) => {
    try {
        const logs = localStorage.getItem('loginLogs');
        const parsedLogs: LoginLog[] = logs ? JSON.parse(logs) : [];
        const newLog: LoginLog = {
            schoolId: school.id,
            schoolName: school.name,
            timestamp: new Date().toISOString()
        };
        const updatedLogs = [newLog, ...parsedLogs].slice(0, 100); 
        localStorage.setItem('loginLogs', JSON.stringify(updatedLogs));
    } catch (e) {
        console.error("Could not write to login logs", e);
    }
  }, []);

  const login = (id: string): string => {
    const schools = getSchools();
    const school = schools.find(s => s.id.toLowerCase() === id.toLowerCase());

    if (!school) {
      throw new Error("No school found with this ID. Please check the ID or sign up.");
    }
    
    const now = new Date();
    const hasSubscription = school.subscriptionEndDate && new Date(school.subscriptionEndDate) >= now;
    const trialDays = parseInt(localStorage.getItem('trialPeriodDays') || '30', 10);
    const inTrial = school.signupDate && addDays(new Date(school.signupDate), trialDays) >= now;

    if (!hasSubscription && !inTrial) {
        const status = school.signupDate ? `Your ${trialDays}-day free trial has expired.` : "Your subscription has expired.";
        localStorage.setItem('schoolIDForRenewal', school.id);
        router.push('/subscribe');
        throw new Error(`${status} Please renew your subscription.`);
    }

    try {
        localStorage.setItem('schoolID', school.id);
        localStorage.setItem('schoolName', school.name);
        localStorage.removeItem('schoolIDForRenewal');
        addLoginLog(school);
    } catch (e) {
        throw new Error("Could not save session. Please enable cookies/localStorage.");
    }

    setSchoolId(school.id);
    setSchoolName(school.name);
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    return school.name;
  };

  const signup = (name: string, id: string) => {
    const schools = getSchools();
    if (schools.some(s => s.id.toLowerCase() === id.toLowerCase())) {
      throw new Error("This School ID is already taken. Please choose another one.");
    }
    const adminCreds = getAdminCredentials();
    if (id.toLowerCase() === adminCreds.id.toLowerCase()) {
      throw new Error(`The ID '${adminCreds.id}' is reserved.`);
    }

    const newSchool: School = { name, id, signupDate: new Date().toISOString() };
    const updatedSchools = [...schools, newSchool];
    setSchools(updatedSchools);
    
    try {
        localStorage.setItem('schoolID', id);
        localStorage.setItem('schoolName', name);
    } catch (e) {
        throw new Error("Could not save session. Please enable cookies/localStorage.");
    }

    setSchoolId(id);
    setSchoolName(name);
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
  };

  const loginAdmin = (password: string) => {
    const creds = getAdminCredentials();
    if(password !== creds.password) {
        throw new Error("Incorrect password for admin.");
    }
    try {
        localStorage.setItem('isAdmin', 'true');
        localStorage.removeItem('schoolID');
        localStorage.removeItem('schoolName');
    } catch (e) {
        throw new Error("Could not save admin session.");
    }
    setIsAdmin(true);
    setSchoolId(null);
    setSchoolName(null);
  };

  const authContextValue: AuthContextType = {
    schoolId,
    schoolName,
    isAdmin,
    isLoading,
    login,
    signup,
    logout,
    loginAdmin,
    getSchools,
    setSchools,
    addLoginLog,
    getAdminCredentials,
    setAdminCredentials,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

    