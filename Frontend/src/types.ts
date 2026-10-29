
export enum RecordType {
    PURCHASE = 'PURCHASE', // จัดซื้อ
    HIRING = 'HIRING',     // จัดจ้าง
    OTHER = 'OTHER',       // ทะเบียนคุมอื่นๆ
}

export interface ProcurementRecord {
    id: string;
    requestId: string;
    requestDate: string;
    category: string;
    itemCount: number;
    amount: number;
    company: string;
    remarks: string;
    officialNumber: string | null;
    type: RecordType;
    departmentId?: string;
    createdBy: string;
    createdAt: number;
    considerationId?: string;
    considerationDate?: string;
    // Security & Audit enhancements for Hospital Intranet
    isDeleted?: boolean;
    deletedAt?: string;
    deletedBy?: string;
    isLocked?: boolean;
    lockedAt?: string;
    lockedBy?: string;
}

export interface AuditLog {
    id: string;
    recordId: string;
    requestId?: string;
    action: 'CREATE' | 'UPDATE' | 'SOFT_DELETE' | 'RESTORE' | 'PERMANENT_DELETE' | 'LOCK' | 'UNLOCK' | 'LOGIN' | 'SECURITY_ALERT';
    userName: string;
    userId: string;
    timestamp: string;
    details: string;
    changes?: { field: string; label: string; oldValue: any; newValue: any }[];
}

export interface SystemBackupData {
    version: string;
    exportedAt: string;
    exportedBy: string;
    hospital: string;
    counts: {
        procurements: number;
        considerations: number;
        receivings: number;
        users: number;
        auditLogs: number;
    };
    procurements: ProcurementRecord[];
    considerations: ConsiderationRecord[];
    receivings: ReceivingReport[];
    users: User[];
    settings: AppSettings;
    auditLogs: AuditLog[];
}

export interface ReceivingReport {
    id: string;
    receiveDate: string;
    deliveryNoteNo: string;
    requestId: string;
    createdAt: number;
    procurementId?: string;
}

export interface ConsiderationRecord {
    id: string;
    requestId: string;
    considerationNumber: string;
    considerationDate: string;
    procurementId?: string;
}

// --- New Interfaces for Settings ---
export interface WorkGroup {
    id: string;
    name: string;
    prefix?: string; // NEW: Prefix for the entire work group (e.g. "บห.", "ยศ.")
    isActive: boolean;
}

export interface Department {
    id: string;
    name: string;
    prefix?: string;
    requestPrefix?: string;
    workGroupId?: string; // Link to WorkGroup
    isActive: boolean;
}

export interface ProcurementCategory {
    id: string;
    name: string;
    departmentId?: string;
    isActive: boolean;
}

export interface AppSettings {
    requestIdPrefix: string;
    categories: ProcurementCategory[];
    departments: Department[];
    workGroups: WorkGroup[];
}

export interface DashboardStat {
    totalPurchase: number;
    totalHiring: number;
    purchaseCount: number;
    hiringCount: number;
}

export type UserRole = 'ADMIN' | 'USER' | 'EXECUTIVE';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface User {
    id: string;
    username: string;
    password: string;
    name: string;
    email: string;
    role: UserRole;
    departmentId?: string;
    createdAt: number;
    status: UserStatus;
    providerId?: string; // MOPH Provider ID (เช่น PRV-10738-0001)
    cid?: string;        // เลขประจำตัวประชาชน 13 หลัก
    position?: string;   // ตำแหน่ง
    licenseNo?: string;  // เลขที่ใบประกอบวิชาชีพ / ทะเบียนพัสดุ
}
