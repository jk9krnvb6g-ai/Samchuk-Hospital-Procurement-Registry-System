import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProcurementRecord, ReceivingReport, RecordType, ConsiderationRecord, AppSettings, User, Department, ProcurementCategory, WorkGroup, AuditLog, SystemBackupData } from '../types';
import { generate1000MockRecords } from './mockDataGenerator';

// ==========================================
// ⚙️ BACKEND & CENTRAL GATEWAY CONFIGURATION
// ==========================================
export const getApiBaseUrl = (): string => {
    // 1. Explicit environment variable override
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
        return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '');
    }
    // 2. Server-side / fallback
    if (typeof window === 'undefined') {
        return 'https://10.2.0.13:3002/api/Procurement';
    }
    // 3. Dynamic client resolution: preserve protocol and use Central Gateway port 3002
    const hostname = window.location.hostname || '10.2.0.13';
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${hostname}:3002/api/Procurement`;
};

const API_URL = getApiBaseUrl();

// Helper to provide authorization Bearer headers
export const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('procurement_session_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
};

// Unified fetch wrapper ensuring Gateway URL and Authorization headers
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (response.status === 401 && endpoint !== '/login' && typeof window !== 'undefined') {
        sessionStorage.removeItem('procurement_session_token');
        sessionStorage.removeItem('procurement_session_user');
        window.dispatchEvent(new Event('procurement:session-expired'));
    }
    return response;
};

// Thai number helpers for client-side demo calculations
const toArabic = (str: string) => {
    if (!str) return '';
    return str.replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d).toString());
};

const toThaiNum = (num: number | string) => {
    if (num === null || num === undefined) return '';
    return num.toString().replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[parseInt(d, 10)]);
};

// Local storage helpers for demo persistence
const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length >= 500) {
                    return parsed as unknown as T;
                }
            }
        }
    } catch (e) {
        // ignore storage errors
    }
    return fallback;
};

const saveToStorage = (key: string, data: any) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(data));
        }
    } catch (e) {
        // ignore
    }
};

// ==========================================
// 🌟 DEFAULT USERS & EMPTY DATASETS (พร้อมสำหรับการติดตั้งใช้งานจริง)
// ==========================================
const DEMO_USERS: User[] = [
    { id: 'usr_admin', username: 'admin', password: 'admin123', name: 'System Admin (ผู้ดูแลระบบ)', email: 'admin@samchuk.go.th', role: 'ADMIN', departmentId: 'dept_1', status: 'ACTIVE', createdAt: Date.now() },
    { id: 'usr_exec', username: 'executive', password: 'user123', name: 'นพ.สมชาย สุขเกษม (ผู้อำนวยการ)', email: 'director@samchuk.go.th', role: 'EXECUTIVE', departmentId: 'dept_1', status: 'ACTIVE', createdAt: Date.now() },
    { id: 'usr_staff', username: 'user', password: 'user123', name: 'นางสมศรี ใจดี (เจ้าหน้าที่พัสดุ)', email: 'somsri@samchuk.go.th', role: 'USER', departmentId: 'dept_1', status: 'ACTIVE', createdAt: Date.now() },
];

const DEMO_DEPARTMENTS: Department[] = [
    { id: 'dept_1', name: 'กลุ่มงานสุขภาพดิจิทัล', requestPrefix: 'สพ ๐๐๓๓.๐๖/๑๔/', workGroupId: 'wg_1', isActive: true },
    { id: 'dept_2', name: 'ฝ่ายบริหารทั่วไป', requestPrefix: 'สพ ๐๐๓๓.๐๑/', workGroupId: 'wg_1', isActive: true },
    { id: 'dept_3', name: 'กลุ่มงานการพยาบาล', requestPrefix: 'สพ ๐๐๓๓.๐๒/', workGroupId: 'wg_2', isActive: true },
    { id: 'dept_4', name: 'กลุ่มงานบริการด้านปฐมภูมิ', requestPrefix: 'สพ ๐๐๓๓.๐๓/', workGroupId: 'wg_2', isActive: true },
];

const DEMO_WORKGROUPS: WorkGroup[] = [
    { id: 'wg_1', name: 'กลุ่มงานบริหารทั่วไป', prefix: 'พด.', isActive: true },
    { id: 'wg_2', name: 'กลุ่มงานการแพทย์และพยาบาล', prefix: 'พย.', isActive: true },
];

const DEMO_CATEGORIES: ProcurementCategory[] = [
    { id: 'cat_1', name: 'ยาและเวชภัณฑ์', departmentId: 'dept_3', isActive: true },
    { id: 'cat_2', name: 'วัสดุการแพทย์', departmentId: 'dept_3', isActive: true },
    { id: 'cat_3', name: 'วัสดุวิทยาศาสตร์การแพทย์', departmentId: 'dept_3', isActive: true },
    { id: 'cat_4', name: 'วัสดุคอมพิวเตอร์', departmentId: 'dept_1', isActive: true },
    { id: 'cat_5', name: 'วัสดุสำนักงาน', departmentId: 'dept_1', isActive: true },
    { id: 'cat_6', name: 'จ้างเหมาบริการ', departmentId: 'dept_1', isActive: true },
    { id: 'cat_7', name: 'ที่ดินและสิ่งก่อสร้าง', departmentId: 'dept_1', isActive: true },
];

// ข้อมูลว่างเปล่าสำหรับ Clean Installation (ไม่มีข้อมูลจำลองตกค้าง)
const DEMO_PROCUREMENTS: ProcurementRecord[] = [];
const DEMO_CONSIDERATIONS: ConsiderationRecord[] = [];
const DEMO_RECEIVINGS: ReceivingReport[] = [];

interface AppContextType {
    isLoading: boolean;
    serverError: boolean;
    serverErrorMessage: string;
    isDemoMode: boolean;
    retryConnection: () => void;
    resetDemoData: () => void;
    procurements: ProcurementRecord[];
    receivings: ReceivingReport[];
    considerations: ConsiderationRecord[];
    settings: AppSettings;
    currentUser: User | null;
    users: User[];
    login: (username: string, password: string) => Promise<{ success: boolean, message?: string }>;
    loginWithProviderId: (providerId: string, pin?: string) => Promise<{ success: boolean; user?: User; message?: string }>;
    logout: () => void;
    registerUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
    deleteUser: (id: string) => void;
    updateUser: (id: string, data: Partial<User>) => void;
    addProcurement: (record: Omit<ProcurementRecord, 'id' | 'createdAt' | 'officialNumber' | 'createdBy'>, force?: boolean) => Promise<{ success: boolean, message?: string, isWarning?: boolean }>;
    updateProcurement: (id: string, record: Partial<ProcurementRecord>) => Promise<{ success: boolean; message?: string }>;
    deleteProcurement: (id: string) => void;
    // Hospital Intranet Security & Integrity methods
    auditLogs: AuditLog[];
    addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    softDeleteProcurement: (id: string, reason?: string) => Promise<boolean>;
    restoreProcurement: (id: string) => Promise<boolean>;
    permanentDeleteProcurement: (id: string) => Promise<boolean>;
    toggleLockProcurement: (id: string, reason?: string) => Promise<{ success: boolean; message: string }>;
    exportBackupData: () => SystemBackupData;
    restoreBackupData: (backup: SystemBackupData) => Promise<{ success: boolean; message: string }>;
    addReceiving: (record: Omit<ReceivingReport, 'id' | 'createdAt'>) => void;
    upsertReceiving: (requestId: string, number: string | null, date: string, procurementId?: string, requestDate?: string) => Promise<boolean>;
    deleteReceiving: (id: string) => void;
    addConsideration: (record: ConsiderationRecord) => void;
    upsertConsideration: (requestId: string, number: string | null, date: string, procurementId?: string, requestDate?: string) => Promise<boolean>;
    getLinkedData: (requestId: string, requestDate?: string, procurementId?: string) => { receiving?: ReceivingReport; consideration?: ConsiderationRecord };
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    addDepartment: (dept: Department) => void;
    updateDepartment: (id: string, data: Partial<Department>) => void;
    addWorkGroup: (group: WorkGroup) => void;
    updateWorkGroup: (id: string, data: Partial<WorkGroup>) => void;
    addCategory: (category: ProcurementCategory) => void;
    updateCategory: (id: string, data: Partial<ProcurementCategory>) => void;
    deleteCategory: (id: string) => void;
    checkChronologyIssue: (record: ProcurementRecord) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [serverError, setServerError] = useState(false);
    const [serverErrorMessage, setServerErrorMessage] = useState('');
    const [isDemoMode, setIsDemoMode] = useState(false);
    // In Production: Demo Mode and Mock Data are strictly disabled (Fail-Closed)
    const isLocalDemo = !import.meta.env.PROD && isDemoMode;
    const [users, setUsers] = useState<User[]>(DEMO_USERS);
    // เริ่มต้นที่ null เพื่อให้แสดงหน้า Login ทันที
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    // ฐานข้อมูลเริ่มต้นว่างเปล่า 0 รายการ สะอาด พร้อมติดตั้งใช้งานจริง
    const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
    const [receivings, setReceivings] = useState<ReceivingReport[]>([]);
    const [considerations, setConsiderations] = useState<ConsiderationRecord[]>([]);
    const [settings, setSettings] = useState<AppSettings>({
        requestIdPrefix: 'สพ ๐๐๓๓.๐๖/๑๔/',
        departments: DEMO_DEPARTMENTS,
        categories: DEMO_CATEGORIES,
        workGroups: DEMO_WORKGROUPS
    });

    // --- Hospital Intranet Audit Logs ---
    const INITIAL_AUDIT_LOGS: AuditLog[] = [];
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    const addAuditLog = (logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
        const newLog: AuditLog = {
            ...logData,
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toISOString()
        };
        setAuditLogs(prev => [newLog, ...prev.slice(0, 499)]);
    };

    const resetDemoData = () => {
        setProcurements([]);
        setConsiderations([]);
        setReceivings([]);
        setAuditLogs([]);
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('samchuk_demo_procurements_v3');
                localStorage.removeItem('samchuk_demo_considerations_v3');
                localStorage.removeItem('samchuk_demo_receivings_v3');
                localStorage.removeItem('samchuk_audit_logs_v1');
            } catch (e) {}
        }
    };

    const getThaiYear = (dateString?: string): number => {
        if (!dateString) {
            const now = new Date();
            const m = now.getMonth() + 1;
            const y = now.getFullYear();
            return m >= 10 ? y + 1 + 543 : y + 543;
        }
        const clean = dateString.toString().split('T')[0].trim();
        const parts = clean.split(/[-\/]/);
        let y = 0, m = 0;
        if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
        } else if (parts[2] && parts[2].length === 4) {
            m = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
        } else {
            const d = new Date(clean);
            if (!isNaN(d.getTime())) {
                y = d.getFullYear();
                m = d.getMonth() + 1;
            }
        }
        if (!y || !m) {
            const now = new Date();
            return (now.getMonth() + 1 >= 10) ? now.getFullYear() + 1 + 543 : now.getFullYear() + 543;
        }
        if (y > 2400) {
            return m >= 10 ? y + 1 : y;
        }
        return m >= 10 ? y + 1 + 543 : y + 543;
    };

    const fetchData = async (isBackground = false) => {
        if (!isBackground) { setIsLoading(true); setServerError(false); }
        if (!isLocalDemo && !sessionStorage.getItem('procurement_session_token')) {
            setProcurements([]); setReceivings([]); setConsiderations([]);
            if (!isBackground) setIsLoading(false);
            return;
        }
        try {
            const dataRes = await apiFetch('/data', { signal: AbortSignal.timeout(4000) });
            if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}`);
            const data = await dataRes.json();
            setProcurements(data.procurements || []);
            setReceivings(data.receivings || []);
            setConsiderations(data.considerations || []);
            setUsers(data.users || []);
            setSettings({
                requestIdPrefix: data.settings?.requestIdPrefix || 'สพ ๐๐๓๓.๐๖/๑๔/',
                departments: data.settings?.departments || [],
                categories: data.settings?.categories || [],
                workGroups: data.settings?.workGroups || []
            });
            setIsDemoMode(false);
            setServerError(false);
            setServerErrorMessage('');
            if (isBackground) setServerError(false);
        } catch (error: any) {
            if (import.meta.env.PROD) {
                // In Production: Never show mock records as real data
                setIsDemoMode(false);
                setServerError(true);
                setServerErrorMessage(`ไม่สามารถเชื่อมต่อ Central API Gateway ได้ที่ ${API_URL} (${error.message || 'Offline'}) กรุณาตรวจสอบสถานะ Gateway บนพอร์ต 3002`);
                setProcurements([]);
                setReceivings([]);
                setConsiderations([]);
                setUsers([]);
            } else {
                // In Development/Preview only
                setIsDemoMode(true);
                setServerError(false);
            }
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        const expireSession = () => {
            setCurrentUser(null);
            setProcurements([]); setReceivings([]); setConsiderations([]);
            setUsers([]);
            setServerError(true);
            setServerErrorMessage('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        };
        window.addEventListener('procurement:session-expired', expireSession);
        return () => window.removeEventListener('procurement:session-expired', expireSession);
    }, []);

    useEffect(() => {
        // ล้างข้อมูลแคชจำลองเก่าออกเพื่อความสะอาด
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('samchuk_demo_procurements_v3');
                localStorage.removeItem('samchuk_demo_considerations_v3');
                localStorage.removeItem('samchuk_demo_receivings_v3');
                localStorage.removeItem('samchuk_audit_logs_v1');
            } catch (e) {}
        }
        if (sessionStorage.getItem('procurement_session_token')) fetchData(false);
        else setIsLoading(false);
        const intervalId = setInterval(() => {
            if (sessionStorage.getItem('procurement_session_token')) fetchData(true);
        }, 60000);
        return () => clearInterval(intervalId);
    }, [isDemoMode]);

    const retryConnection = () => { fetchData(false); };

    const login = async (u: string, p: string) => {
        const cleanUser = (u || '').trim().toLowerCase();
        const cleanPass = (p || '').trim();

        // In Production: Strictly block Demo Mode credentials
        if (isDemoMode && !import.meta.env.PROD) {
            const user = users.find(usr => usr.username.toLowerCase() === cleanUser);
            if (user) {
                if (cleanPass && user.password && user.password !== cleanPass && cleanPass !== 'admin123' && cleanPass !== 'user123') {
                    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง (สำหรับเข้าติดตั้ง: admin / admin123)' };
                }
                setCurrentUser(user);
                sessionStorage.setItem('procurement_session_user', JSON.stringify(user));
                return { success: true };
            }
            return { success: false, message: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ (บัญชีผู้ดูแลระบบเริ่มต้น: admin / admin123)' };
        }

        try {
            const res = await apiFetch('/login', {
                method: 'POST',
                body: JSON.stringify({ username: u, password: p }),
                signal: AbortSignal.timeout(5000)
            });
            const result = await res.json();
            if (!res.ok) return { success: false, message: result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
            if (result.success && result.token && result.user) {
                setCurrentUser(result.user); 
                sessionStorage.setItem('procurement_session_user', JSON.stringify(result.user));
                sessionStorage.setItem('procurement_session_token', result.token);
                await fetchData(true);
                return result;
            }
            return { success: false, message: result.message || 'ไม่สามารถเข้าสู่ระบบได้' };
        } catch (e: any) { 
            if (import.meta.env.PROD) {
                return { success: false, message: `ไม่สามารถเชื่อมต่อระบบยืนยันตัวตน Central API Gateway ได้ (${e.message}) กรุณาตรวจสอบการเชื่อมต่อเครือข่าย` };
            }
            return { success: false, message: 'ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง' }; 
        }
    };

    // Provider ID must be verified by a trusted backend identity provider before enabling SSO.
    // Never authenticate a user by matching a client-side identifier or a privileged substring.
    const loginWithProviderId = async (_providerId: string, _pin?: string): Promise<{ success: boolean; user?: User; message?: string }> => {
        return { success: false, message: 'การเข้าสู่ระบบด้วย Provider ID ยังไม่เปิดใช้งาน กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน' };
    };

    const logout = () => { 
        setCurrentUser(null); 
        sessionStorage.removeItem('procurement_session_user'); 
        sessionStorage.removeItem('procurement_session_token');
        setProcurements([]); setReceivings([]); setConsiderations([]);
        setUsers([]);
    };

    const registerUser = async (userData: any) => {
        if (isDemoMode && !import.meta.env.PROD) {
            const newUser: User = { ...userData, id: `usr_${Date.now()}`, status: 'ACTIVE', createdAt: Date.now() };
            setUsers(prev => [...prev, newUser]);
            return true;
        }
        try { 
            // Backend has no /register route. Fail explicitly instead of reporting false success.
            console.warn('User registration API is not available; configure an ADMIN-only backend endpoint first');
            return false; 
        } catch (e) { return false; }
    };

    const updateUser = async (id: string, data: any) => {
        if (isDemoMode && !import.meta.env.PROD) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
            return;
        }
        try { 
            const response = await apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
            if (!response.ok) throw new Error(`Update user failed: HTTP ${response.status}`);
            await fetchData(true); 
        } catch(e) { throw e; }
    };

    const deleteUser = (id: string) => updateUser(id, { status: 'SUSPENDED' });

    const parseRunningNumber = (officialNumber: string | null) => {
        if (!officialNumber) return 0;
        const parts = officialNumber.split('/');
        const match = parts[0]?.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    };

    // Calculate next sequence across all 3 tables (Unified Master Sequence)
    const getNextUnifiedSequence = (prefix: string, dateStr: string) => {
        const targetFy = getThaiYear(dateStr);
        const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
        
        let maxNum = 0;
        const checkValue = (val: string | null | undefined, itemDate?: string) => {
            if (!val) return;
            if (itemDate && getThaiYear(itemDate) !== targetFy) return;
            const normalized = toArabic(val);
            const parts = normalized.split('/');
            const lastPart = parts[parts.length - 1];
            const match = lastPart.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        };

        procurements.forEach(p => checkValue(p.requestId, p.requestDate));
        considerations.forEach(c => checkValue(c.considerationNumber, c.considerationDate));
        receivings.forEach(r => checkValue(r.deliveryNoteNo, r.receiveDate));

        return `${cleanPrefix}${toThaiNum(maxNum + 1)}`;
    };

    // Logic: Share sequence across all departments in the same Work Group (เงื่อนไข 1 บาทขึ้นไปออกเลขที่ได้เลย)
    const generateRunningNumber = (type: RecordType, amount: number, dateStr: string) => {
        if (amount < 1) return null;
        
        const userDept = settings.departments?.find(d => d.id === currentUser?.departmentId);
        const workGroup = userDept?.workGroupId ? settings.workGroups?.find(g => g.id === userDept.workGroupId) : settings.workGroups?.[0];
        
        // Auto default prefix based on registry type
        let prefix = workGroup?.prefix ? workGroup.prefix.trim() : '';
        if (!prefix) {
            prefix = type === RecordType.PURCHASE ? 'พด.' : type === RecordType.HIRING ? 'จง.' : 'อต.';
        }
        const thaiYear = getThaiYear(dateStr);
        
        const groupDeptIds = userDept?.workGroupId
            ? settings.departments.filter(d => d.workGroupId === userDept.workGroupId).map(d => d.id)
            : settings.departments.map(d => d.id);

        const existingInGroup = procurements.filter(p => {
            if (p.type !== type || !p.officialNumber) return false;
            if (getThaiYear(p.requestDate) !== thaiYear) return false;
            return groupDeptIds.length === 0 || groupDeptIds.includes(p.departmentId || '');
        });

        let maxNum = 0;
        existingInGroup.forEach(p => {
            const num = parseRunningNumber(p.officialNumber);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        return `${prefix ? prefix + ' ' : ''}${maxNum + 1}/${thaiYear}`;
    };

    const validateChronology = (type: RecordType, dateStr: string): { valid: boolean, message?: string } => {
        const thaiYear = getThaiYear(dateStr);
        const userDept = settings.departments?.find(d => d.id === currentUser?.departmentId);
        if (!userDept) return { valid: true };

        const groupDeptIds = settings.departments
            .filter(d => d.workGroupId === userDept.workGroupId)
            .map(d => d.id);

        const existingInGroup = procurements.filter(p => {
            if (p.type !== type || !p.officialNumber) return false;
            if (getThaiYear(p.requestDate) !== thaiYear) return false;
            return groupDeptIds.includes(p.departmentId || '');
        });

        if (existingInGroup.length === 0) return { valid: true };
        let maxNum = 0;
        let maxRecord: ProcurementRecord | null = null;
        existingInGroup.forEach(p => {
            const num = parseRunningNumber(p.officialNumber);
            if (num > maxNum) { maxNum = num; maxRecord = p; }
        });

        if (maxRecord) {
            const latestDate = new Date((maxRecord as ProcurementRecord).requestDate).getTime();
            const newDate = new Date(dateStr).getTime();
            if (newDate < latestDate) {
                return { valid: false, message: `⚠️ วันที่ย้อนหลังกว่าเลขที่ล่าสุดของกลุ่มงาน\nเลขที่ล่าสุด: ${(maxRecord as ProcurementRecord).officialNumber}\nลงวันที่: ${(maxRecord as ProcurementRecord).requestDate}\nคุณกำลังบันทึก: ${dateStr}` };
            }
        }
        return { valid: true };
    };

    const checkChronologyIssue = (record: ProcurementRecord): boolean => {
        if (!record.officialNumber || !record.requestDate) return false;
        const currentNum = parseRunningNumber(record.officialNumber);
        const currentDate = new Date(record.requestDate).getTime();
        const thaiYear = getThaiYear(record.requestDate);
        const dept = settings.departments.find(d => d.id === record.departmentId);
        if (!dept) return false;
        const groupDeptIds = settings.departments.filter(d => d.workGroupId === dept.workGroupId).map(d => d.id);

        return procurements.some(p => {
            if (p.type !== record.type || !p.officialNumber) return false;
            if (getThaiYear(p.requestDate) !== thaiYear) return false;
            if (!groupDeptIds.includes(p.departmentId || '')) return false;
            const pNum = parseRunningNumber(p.officialNumber);
            const pDate = new Date(p.requestDate).getTime();
            return (pNum < currentNum && pDate > currentDate); 
        });
    };

    const addProcurement = async (data: any, force = false) => {
        if (data.amount >= 1 && !force) {
            const validation = validateChronology(data.type, data.requestDate);
            if (!validation.valid) return { success: false, isWarning: true, message: validation.message };
        }
        const officialNumber = generateRunningNumber(data.type, data.amount, data.requestDate);
        
        if (isLocalDemo) {
            const userDept = settings.departments.find(d => d.id === (currentUser?.departmentId || 'dept_1'));
            const prefix = userDept?.requestPrefix || 'สพ ๐๐๓๓.๐๖/๑๔/';
            const newRequestId = getNextUnifiedSequence(prefix, data.requestDate);
            const newRec: ProcurementRecord = {
                ...data,
                id: `proc_${Date.now()}`,
                requestId: newRequestId,
                officialNumber,
                departmentId: currentUser?.departmentId || 'dept_1',
                createdBy: currentUser?.id || 'usr_admin',
                createdAt: Date.now()
            };
            setProcurements(prev => {
                const next = [newRec, ...prev];
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
            addAuditLog({
                recordId: newRec.id,
                requestId: newRec.requestId,
                action: 'CREATE',
                userName: currentUser?.name || 'ไม่ระบุ',
                userId: currentUser?.id || 'unknown',
                details: `สร้างรายการใหม่: ${newRec.category} วงเงิน ${Number(newRec.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`
            });
            return { success: true };
        }

        const newRecord = { ...data, officialNumber, departmentId: currentUser?.departmentId, createdBy: currentUser?.id || 'unknown' };
        try {
            const res = await apiFetch('/procurements', { method: 'POST', body: JSON.stringify(newRecord) });
            fetchData(true); 
            addAuditLog({
                recordId: newRecord.id || 'server_id',
                requestId: newRecord.requestId || 'NEW',
                action: 'CREATE',
                userName: currentUser?.name || 'ไม่ระบุ',
                userId: currentUser?.id || 'unknown',
                details: `สร้างรายการใหม่: ${newRecord.category || '-'} วงเงิน ${Number(newRecord.amount || 0).toLocaleString('th-TH')} บาท`
            });
            return { success: true };
        } catch(e) { return { success: false, message: "Server Error" }; }
    };

    const updateProcurement = async (id: string, data: Partial<ProcurementRecord>): Promise<{ success: boolean; message?: string }> => {
        const currentItem = procurements.find(p => p.id === id);
        if (!currentItem) return { success: false, message: 'ไม่พบรายการข้อมูล' };

        // Check if locked and not admin
        if (currentItem.isLocked && currentUser?.role !== 'ADMIN') {
            return {
                success: false,
                message: 'รายการนี้ถูกล็อคเนื่องจากตรวจรับสมบูรณ์แล้ว ไม่อนุญาตให้แก้ไขตัวเลข ยกเว้นได้รับอนุมัติจากผู้ดูแลระบบ (Admin)'
            };
        }

        let newOfficialNumber = currentItem.officialNumber;
        const amount = data.amount !== undefined ? data.amount : currentItem.amount;
        const reqDate = data.requestDate || currentItem.requestDate;

        if (amount >= 1 && !newOfficialNumber) {
            newOfficialNumber = generateRunningNumber(currentItem.type, amount, reqDate);
        } else if (amount < 1) {
            newOfficialNumber = null;
        }

        const payload = { ...data, officialNumber: newOfficialNumber };

        // Calculate changes for Audit Log
        const changes: { field: string; label: string; oldValue: any; newValue: any }[] = [];
        if (data.amount !== undefined && data.amount !== currentItem.amount) {
            changes.push({ field: 'amount', label: 'จำนวนเงิน', oldValue: currentItem.amount, newValue: data.amount });
        }
        if (data.category !== undefined && data.category !== currentItem.category) {
            changes.push({ field: 'category', label: 'หมวดพัสดุ', oldValue: currentItem.category, newValue: data.category });
        }
        if (data.company !== undefined && data.company !== currentItem.company) {
            changes.push({ field: 'company', label: 'คู่สัญญา/บริษัท', oldValue: currentItem.company, newValue: data.company });
        }
        if (data.requestDate !== undefined && data.requestDate !== currentItem.requestDate) {
            changes.push({ field: 'requestDate', label: 'วันที่ขอ', oldValue: currentItem.requestDate, newValue: data.requestDate });
        }
        if (data.remarks !== undefined && data.remarks !== currentItem.remarks) {
            changes.push({ field: 'remarks', label: 'หมายเหตุ', oldValue: currentItem.remarks, newValue: data.remarks });
        }

        if (isLocalDemo) {
            setProcurements(prev => {
                const next = prev.map(p => p.id === id ? { ...p, ...payload } : p);
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
            if (changes.length > 0) {
                addAuditLog({
                    recordId: currentItem.id,
                    requestId: currentItem.requestId,
                    action: 'UPDATE',
                    userName: currentUser?.name || 'ไม่ระบุ',
                    userId: currentUser?.id || 'unknown',
                    details: `แก้ไขข้อมูล (${changes.map(c => c.label).join(', ')})`,
                    changes
                });
            }
            return { success: true };
        }

        try {
            await apiFetch(`/procurements/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            fetchData(true);
            if (changes.length > 0) {
                addAuditLog({
                    recordId: currentItem.id,
                    requestId: currentItem.requestId,
                    action: 'UPDATE',
                    userName: currentUser?.name || 'ไม่ระบุ',
                    userId: currentUser?.id || 'unknown',
                    details: `แก้ไขข้อมูล (${changes.map(c => c.label).join(', ')})`,
                    changes
                });
            }
            return { success: true };
        } catch(e) { 
            console.error(e);
            return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
        }
    };

    // Soft delete to protect against accidental deletion in hospital
    const deleteProcurement = async (id: string) => { 
        softDeleteProcurement(id);
    };

    const softDeleteProcurement = async (id: string, reason?: string): Promise<boolean> => {
        const target = procurements.find(p => p.id === id);
        if (!target) return false;

        if (target.isLocked && currentUser?.role !== 'ADMIN') {
            return false;
        }

        const updated = {
            ...target,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: currentUser?.name || 'ไม่ระบุ'
        };

        if (isLocalDemo) {
            setProcurements(prev => {
                const next = prev.map(p => p.id === id ? updated : p);
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
        } else {
            try {
                await apiFetch(`/procurements/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
                fetchData(true);
            } catch (e) {
                console.error(e);
            }
        }

        addAuditLog({
            recordId: target.id,
            requestId: target.requestId,
            action: 'SOFT_DELETE',
            userName: currentUser?.name || 'ไม่ระบุ',
            userId: currentUser?.id || 'unknown',
            details: `ย้ายไปยังถังขยะกู้คืนข้อมูล${reason ? `: ${reason}` : ''}`
        });

        return true;
    };

    const restoreProcurement = async (id: string): Promise<boolean> => {
        const target = procurements.find(p => p.id === id);
        if (!target) return false;

        const updated = {
            ...target,
            isDeleted: false,
            deletedAt: undefined,
            deletedBy: undefined
        };

        if (isLocalDemo) {
            setProcurements(prev => {
                const next = prev.map(p => p.id === id ? updated : p);
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
        } else {
            try {
                await apiFetch(`/procurements/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
                fetchData(true);
            } catch (e) {
                console.error(e);
            }
        }

        addAuditLog({
            recordId: target.id,
            requestId: target.requestId,
            action: 'RESTORE',
            userName: currentUser?.name || 'ไม่ระบุ',
            userId: currentUser?.id || 'unknown',
            details: 'กู้คืนรายการจากถังขยะกลับสู่ระบบปกติ'
        });

        return true;
    };

    const permanentDeleteProcurement = async (id: string): Promise<boolean> => {
        const target = procurements.find(p => p.id === id);
        if (!target) return false;

        if (isLocalDemo) {
            setProcurements(prev => {
                const next = prev.filter(p => p.id !== id);
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
        } else {
            try {
                await apiFetch(`/procurements/${id}`, { method: 'DELETE' });
                fetchData(true);
            } catch (e) {
                console.error(e);
            }
        }

        addAuditLog({
            recordId: target.id,
            requestId: target.requestId,
            action: 'PERMANENT_DELETE',
            userName: currentUser?.name || 'ไม่ระบุ',
            userId: currentUser?.id || 'unknown',
            details: `ลบรายการออกจากระบบถาวร (ถอนเลขที่: ${target.requestId})`
        });

        return true;
    };

    const toggleLockProcurement = async (id: string, reason?: string): Promise<{ success: boolean; message: string }> => {
        const target = procurements.find(p => p.id === id);
        if (!target) return { success: false, message: 'ไม่พบรายการข้อมูล' };

        if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'EXECUTIVE') {
            return { success: false, message: 'สิทธิ์ไม่เพียงพอ เฉพาะ Admin หรือ ผู้บริหาร เท่านั้นที่สามารถล็อคหรือปลดล็อคได้' };
        }

        const nextLocked = !target.isLocked;
        const updated = {
            ...target,
            isLocked: nextLocked,
            lockedAt: nextLocked ? new Date().toISOString() : undefined,
            lockedBy: nextLocked ? (currentUser?.name || 'Admin') : undefined
        };

        if (isLocalDemo) {
            setProcurements(prev => {
                const next = prev.map(p => p.id === id ? updated : p);
                saveToStorage('samchuk_demo_procurements_v3', next);
                return next;
            });
        } else {
            try {
                await apiFetch(`/procurements/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
                fetchData(true);
            } catch (e) {
                console.error(e);
            }
        }

        addAuditLog({
            recordId: target.id,
            requestId: target.requestId,
            action: nextLocked ? 'LOCK' : 'UNLOCK',
            userName: currentUser?.name || 'ไม่ระบุ',
            userId: currentUser?.id || 'unknown',
            details: nextLocked 
                ? `ล็อคข้อมูลรายการ (ตรวจรับสมบูรณ์แล้ว)${reason ? `: ${reason}` : ''}`
                : `ปลดล็อคข้อมูลรายการเพื่ออนุญาตแก้ไข${reason ? `: ${reason}` : ''}`
        });

        return { 
            success: true, 
            message: nextLocked ? 'ล็อคข้อมูลรายการเรียบร้อยแล้ว' : 'ปลดล็อคข้อมูลรายการเรียบร้อยแล้ว' 
        };
    };

    // One-Click Internal Database Backup & Restore
    const exportBackupData = (): SystemBackupData => {
        const backup: SystemBackupData = {
            version: '1.0.0-hospital-intranet',
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser?.name || 'System Admin',
            hospital: 'โรงพยาบาลสามชุก สุพรรณบุรี',
            counts: {
                procurements: procurements.length,
                considerations: considerations.length,
                receivings: receivings.length,
                users: users.length,
                auditLogs: auditLogs.length
            },
            procurements,
            considerations,
            receivings,
            users,
            settings,
            auditLogs
        };

        addAuditLog({
            recordId: 'SYSTEM',
            requestId: 'BACKUP',
            action: 'UPDATE',
            userName: currentUser?.name || 'Admin',
            userId: currentUser?.id || 'admin',
            details: `ส่งออกไฟล์สำรองฐานข้อมูล (${procurements.length} รายการพัสดุ)`
        });

        return backup;
    };

    const restoreBackupData = async (backup: SystemBackupData): Promise<{ success: boolean; message: string }> => {
        try {
            if (!backup || !backup.procurements || !Array.isArray(backup.procurements)) {
                return { success: false, message: 'รูปแบบไฟล์สำรองไม่ถูกต้อง ไม่พบโครงสร้างข้อมูลพัสดุ' };
            }

            setProcurements(backup.procurements);
            saveToStorage('samchuk_demo_procurements_v3', backup.procurements);

            if (backup.considerations && Array.isArray(backup.considerations)) {
                setConsiderations(backup.considerations);
                saveToStorage('samchuk_demo_considerations_v3', backup.considerations);
            }

            if (backup.receivings && Array.isArray(backup.receivings)) {
                setReceivings(backup.receivings);
                saveToStorage('samchuk_demo_receivings_v3', backup.receivings);
            }

            if (backup.users && Array.isArray(backup.users)) {
                setUsers(backup.users);
            }

            if (backup.settings) {
                setSettings(backup.settings);
            }

            if (backup.auditLogs && Array.isArray(backup.auditLogs)) {
                const mergedLogs = [...backup.auditLogs, {
                    id: `audit_${Date.now()}`,
                    recordId: 'SYSTEM',
                    requestId: 'RESTORE',
                    action: 'UPDATE' as const,
                    userName: currentUser?.name || 'Admin',
                    userId: currentUser?.id || 'admin',
                    timestamp: new Date().toISOString(),
                    details: `กู้คืนระบบจากไฟล์สำรองข้อมูล (ส่งออกจาก ${backup.exportedBy} เมื่อ ${backup.exportedAt})`
                }];
                setAuditLogs(mergedLogs);
                saveToStorage('samchuk_audit_logs_v1', mergedLogs);
            }

            return { 
                success: true, 
                message: `กู้คืนข้อมูลสำเร็จ: ${backup.procurements.length} รายการพัสดุ` 
            };
        } catch (err: any) {
            return { success: false, message: `เกิดข้อผิดพลาดในการกู้คืน: ${err.message}` };
        }
    };

    const addReceiving = async (data: any) => { 
        if (isLocalDemo) {
            setReceivings(prev => [...prev, { ...data, id: `recv_${Date.now()}`, createdAt: new Date().toISOString() }]);
            return;
        }
        const response = await apiFetch('/receivings/upsert', { method: 'POST', body: JSON.stringify(data) });
        if (!response.ok) throw new Error(`Receiving save failed: HTTP ${response.status}`);
        await fetchData(true); 
    };

    const deleteReceiving = async (id: string) => { 
        if (isLocalDemo) {
            setReceivings(prev => prev.filter(r => r.id !== id));
            return;
        }
        throw new Error('Receiving deletion is not supported by the backend; no data was deleted'); 
    };

    const addConsideration = async (record: any) => { 
        if (isLocalDemo) {
            setConsiderations(prev => [...prev, { ...record, id: `cons_${Date.now()}` }]);
            return;
        }
        const response = await apiFetch('/considerations/upsert', { method: 'POST', body: JSON.stringify(record) });
        if (!response.ok) throw new Error(`Consideration save failed: HTTP ${response.status}`);
        await fetchData(true); 
    };

    const upsertReceiving = async (requestId: string, number: string | null, date: string, procurementId?: string, requestDate?: string) => {
        if (isLocalDemo) {
            let finalNo = number;
            if (!finalNo || finalNo.trim() === '') {
                const targetProc = procurements.find(p => p.id === procurementId || p.requestId === requestId);
                const fullId = targetProc ? targetProc.requestId : requestId;
                const lastPartMatch = toArabic(fullId).match(/(\d+)$/);
                const prefix = lastPartMatch ? fullId.substring(0, fullId.length - lastPartMatch[0].length) : fullId;
                finalNo = getNextUnifiedSequence(prefix, date || requestDate || '');
            }

            setReceivings(prev => {
                const existingIdx = prev.findIndex(r => (procurementId && r.procurementId === procurementId) || r.requestId === requestId);
                if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = { ...updated[existingIdx], deliveryNoteNo: finalNo, receiveDate: date, procurementId };
                    return updated;
                } else {
                    return [...prev, { id: `recv_${Date.now()}`, requestId, deliveryNoteNo: finalNo, receiveDate: date, createdAt: Date.now(), procurementId }];
                }
            });
            return true;
        }

        try { 
            const res = await apiFetch('/receivings/upsert', { 
                method: 'POST', 
                body: JSON.stringify({ requestId, deliveryNoteNo: number, receiveDate: date, procurementId, requestDate }) 
            }); 
            if (res.ok) { await fetchData(true); return true; } 
        } catch (e) {} 
        return false;
    };

    const upsertConsideration = async (requestId: string, number: string | null, date: string, procurementId?: string, requestDate?: string) => {
        if (isLocalDemo) {
            let finalNo = number;
            if (!finalNo || finalNo.trim() === '') {
                const targetProc = procurements.find(p => p.id === procurementId || p.requestId === requestId);
                const fullId = targetProc ? targetProc.requestId : requestId;
                const lastPartMatch = toArabic(fullId).match(/(\d+)$/);
                const prefix = lastPartMatch ? fullId.substring(0, fullId.length - lastPartMatch[0].length) : fullId;
                finalNo = getNextUnifiedSequence(prefix, date || requestDate || '');
            }

            setConsiderations(prev => {
                const existingIdx = prev.findIndex(c => (procurementId && c.procurementId === procurementId) || c.requestId === requestId);
                if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = { ...updated[existingIdx], considerationNumber: finalNo, considerationDate: date, procurementId };
                    return updated;
                } else {
                    return [...prev, { id: `cons_${Date.now()}`, requestId, considerationNumber: finalNo, considerationDate: date, procurementId }];
                }
            });
            return true;
        }

        try { 
            const res = await apiFetch('/considerations/upsert', { 
                method: 'POST', 
                body: JSON.stringify({ requestId, considerationNumber: number, considerationDate: date, procurementId, requestDate }) 
            }); 
            if (res.ok) { await fetchData(true); return true; } 
        } catch (e) {} 
        return false;
    };

    const getLinkedData = (requestId: string, requestDate?: string, procurementId?: string) => {
        let recv: ReceivingReport | undefined;
        let cons: ConsiderationRecord | undefined;

        // 1. Match by procurementId if present
        if (procurementId) {
            recv = receivings.find(r => r.procurementId === procurementId);
            cons = considerations.find(c => c.procurementId === procurementId);
        }

        // 2. Match by requestId and same fiscal year
        if (!recv && requestId) {
            if (requestDate) {
                const fy = getThaiYear(requestDate);
                recv = receivings.find(r => r.requestId === requestId && (r.receiveDate ? getThaiYear(r.receiveDate) === fy : false));
            } else {
                recv = receivings.find(r => r.requestId === requestId);
            }
        }

        if (!cons && requestId) {
            if (requestDate) {
                const fy = getThaiYear(requestDate);
                cons = considerations.find(c => c.requestId === requestId && (c.considerationDate ? getThaiYear(c.considerationDate) === fy : false));
            } else {
                cons = considerations.find(c => c.requestId === requestId);
            }
        }

        return { receiving: recv, consideration: cons };
    };

    const updateSettings = async (s: any) => {
        setSettings(prev => ({ ...prev, ...s }));
        if (!isDemoMode) fetchData(true);
    };

    const addDepartment = async (dept: Department) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, departments: [...prev.departments, dept] }));
            return;
        }
        try { await apiFetch('/department', { method: 'POST', body: JSON.stringify(dept) }); fetchData(true); } catch(e) {} 
    };

    const updateDepartment = async (id: string, data: Partial<Department>) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, departments: prev.departments.map(d => d.id === id ? { ...d, ...data } : d) }));
            return;
        }
        try { await apiFetch(`/department/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); fetchData(true); } catch(e) {} 
    };

    const addWorkGroup = async (group: WorkGroup) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, workGroups: [...prev.workGroups, group] }));
            return;
        }
        await apiFetch('/workgroup', { method: 'POST', body: JSON.stringify(group) }); 
        fetchData(true); 
    };

    const updateWorkGroup = async (id: string, data: Partial<WorkGroup>) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, workGroups: prev.workGroups.map(w => w.id === id ? { ...w, ...data } : w) }));
            return;
        }
        await apiFetch(`/workgroup/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); 
        fetchData(true); 
    };

    const addCategory = async (category: ProcurementCategory) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, categories: [...prev.categories, category] }));
            return;
        }
        await apiFetch('/category', { method: 'POST', body: JSON.stringify(category) }); 
        fetchData(true); 
    };

    const updateCategory = async (id: string, data: Partial<ProcurementCategory>) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...data } : c) }));
            return;
        }
        await apiFetch(`/category/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); 
        fetchData(true); 
    };

    const deleteCategory = async (id: string) => { 
        if (isLocalDemo) {
            setSettings(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
            return;
        }
        await apiFetch(`/category/${id}`, { method: 'DELETE' }); 
        fetchData(true); 
    };

    return (
        <AppContext.Provider value={{
            isLoading, serverError, serverErrorMessage, isDemoMode, retryConnection, resetDemoData,
            procurements, receivings, considerations, settings, currentUser, users,
            login, loginWithProviderId, logout, registerUser, deleteUser, updateUser, addProcurement, updateProcurement, deleteProcurement,
            auditLogs, addAuditLog, softDeleteProcurement, restoreProcurement, permanentDeleteProcurement, toggleLockProcurement,
            exportBackupData, restoreBackupData,
            addReceiving, upsertReceiving, deleteReceiving, addConsideration, upsertConsideration, getLinkedData, updateSettings,
            addDepartment, updateDepartment, addWorkGroup, updateWorkGroup,
            addCategory, updateCategory, deleteCategory, checkChronologyIssue
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
