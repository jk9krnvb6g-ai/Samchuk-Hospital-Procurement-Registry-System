
import React, { useState } from 'react';
import { AppProvider, useApp } from './services/store';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ProcurementTable from './pages/ProcurementTable';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import PendingUsersPage from './pages/PendingUsersPage';
import RecycleBinPage from './pages/RecycleBinPage';
import AuditLogPage from './pages/AuditLogPage';
import { RecordType } from './types';
import { Menu, ServerCrash, RefreshCw, ChevronRight, Calendar, Printer, Lock } from 'lucide-react';
import { AutoLockModal } from './components/AutoLockModal';

const MainApp: React.FC = () => {
    const { currentUser, serverError, serverErrorMessage, retryConnection, isLoading, isDemoMode, login, procurements, resetDemoData } = useApp();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);

    // Auto-lock idle timer for Hospital Intranet security
    React.useEffect(() => {
        if (!currentUser || isScreenLocked) return;

        // 15 minutes of inactivity before screen auto-locks
        const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
        let timer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setIsScreenLocked(true);
            }, IDLE_TIMEOUT_MS);
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

        resetTimer();

        return () => {
            clearTimeout(timer);
            events.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, [currentUser, isScreenLocked]);

    // Calculate current fiscal quarter
    const currentQuarterInfo = () => {
        const now = new Date();
        const m = now.getMonth();
        let q = 1;
        let months = 'ต.ค. - ธ.ค.';
        if (m >= 9 && m <= 11) { q = 1; months = 'ต.ค. - ธ.ค.'; }
        else if (m >= 0 && m <= 2) { q = 2; months = 'ม.ค. - มี.ค.'; }
        else if (m >= 3 && m <= 5) { q = 3; months = 'เม.ย. - มิ.ย.'; }
        else { q = 4; months = 'ก.ค. - ก.ย.'; }
        const fy = m >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543;
        return { q, months, fy };
    };

    const quarter = currentQuarterInfo();

    const getTabTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Dashboard ภาพรวม';
            case 'executive': return 'Dashboard ผู้บริหาร';
            case 'purchase': return 'ทะเบียนคุมจัดซื้อ (PO)';
            case 'hiring': return 'ทะเบียนคุมจัดจ้าง (HO)';
            case 'other': return 'ทะเบียนคุมอื่นๆ';
            case 'pending_users': return 'รอยืนยันการสมัคร';
            case 'users': return 'จัดการผู้ใช้งาน';
            case 'recycle_bin': return 'ถังขยะกู้คืนข้อมูล (Recycle Bin)';
            case 'audit_logs': return 'ประวัติการใช้งานและกิจกรรม (Audit Trail)';
            case 'settings': return 'ตั้งค่าระบบ & สำรองข้อมูล';
            default: return 'ระบบงานพัสดุ';
        }
    };

    if (serverError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6 text-red-600 animate-pulse">
                        <ServerCrash size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ไม่สามารถเชื่อมต่อระบบได้</h2>
                    <p className="text-slate-500 mb-4">
                        กรุณาตรวจสอบว่าได้เปิดโปรแกรม Server (Backend) หรือไม่ <br/>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs mt-2 inline-block">Port: 3002</code>
                    </p>
                    
                    {serverErrorMessage && (
                        <div className="mb-6 bg-red-50 text-red-700 text-xs p-3 rounded-lg text-left overflow-auto max-h-32 border border-red-200">
                            <strong>Technical Detail:</strong><br/>
                            {serverErrorMessage}
                        </div>
                    )}

                    <button 
                        onClick={retryConnection}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200"
                    >
                        {isLoading ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <RefreshCw size={20} />
                        )}
                        <span>ลองเชื่อมต่อใหม่</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginPage />;
    }

    const renderContent = () => {
        // Access Control Logic
        const role = currentUser.role;

        if (role === 'EXECUTIVE') {
            if (activeTab === 'dashboard') return <Dashboard />;
            if (activeTab === 'executive') return <ExecutiveDashboard />;
            return <Dashboard />; // Fallback for restricted pages
        }

        if (role === 'USER') {
            if (activeTab === 'executive') return <Dashboard />; // User cannot see Executive Dashboard
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'executive': 
                return <ExecutiveDashboard />;
            case 'purchase':
                return <ProcurementTable type={RecordType.PURCHASE} title="ทะเบียนคุมจัดซื้อ (Purchase Orders)" />;
            case 'hiring':
                return <ProcurementTable type={RecordType.HIRING} title="ทะเบียนคุมจัดจ้าง (Hiring Orders)" />;
            case 'other':
                return <ProcurementTable type={RecordType.OTHER} title="ทะเบียนคุมอื่นๆ (Other Registry)" />;
            case 'pending_users':
                return currentUser.role === 'ADMIN' ? <PendingUsersPage /> : <Dashboard />;
            case 'users':
                return currentUser.role === 'ADMIN' ? <UserManagementPage /> : <Dashboard />;
            case 'recycle_bin':
                return currentUser.role === 'ADMIN' ? <RecycleBinPage onBack={() => setActiveTab('dashboard')} /> : <Dashboard />;
            case 'audit_logs':
                return (currentUser.role === 'ADMIN' || currentUser.role === 'EXECUTIVE') ? <AuditLogPage onBack={() => setActiveTab('dashboard')} /> : <Dashboard />;
            case 'settings':
                return currentUser.role === 'ADMIN' ? <SettingsPage /> : <Dashboard />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative">
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen}
            />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-64">
                {/* Universal Top Navigation Bar */}
                <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                    {/* Left: Mobile Toggle & Breadcrumbs */}
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="เปิดเมนู"
                        >
                            <Menu size={22} />
                        </button>
                        
                        {/* Breadcrumbs */}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium overflow-hidden">
                            <span className="hidden sm:inline hover:text-slate-800">รพ.สามชุก</span>
                            <ChevronRight size={14} className="hidden sm:inline text-slate-300 flex-shrink-0" />
                            <span className="text-slate-900 font-bold truncate">{getTabTitle()}</span>
                        </div>
                    </div>

                    {/* Right: Quarter Badge, Print, Profile */}
                    <div className="flex items-center space-x-3">
                        {/* Fiscal Quarter Indicator */}
                        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                            <Calendar size={13} className="text-teal-600" />
                            <span>ไตรมาส {quarter.q} ({quarter.months}) / ปีงบ {quarter.fy}</span>
                        </div>

                        {/* Quick Print Button */}
                        <button
                            onClick={() => window.print()}
                            className="hidden sm:flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                            title="พิมพ์หน้านี้ (Print Preview)"
                        >
                            <Printer size={13} />
                            <span>พิมพ์</span>
                        </button>

                        {/* Quick Screen Lock Button for Hospital Desk Security */}
                        <button
                            onClick={() => setIsScreenLocked(true)}
                            className="flex items-center space-x-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors font-semibold cursor-pointer shadow-2xs"
                            title="ล็อคหน้าจอทันทีเมื่อลุกจากโต๊ะ (Hospital Intranet Screen Lock)"
                        >
                            <Lock size={13} className="text-amber-600" />
                            <span className="hidden sm:inline">ล็อคหน้าจอ</span>
                        </button>

                        {/* User Identity Chip */}
                        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shadow-inner">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[140px]">{currentUser.name}</p>
                                <span className="text-[10px] text-teal-700 font-medium leading-none">{currentUser.role}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>

            {/* Auto Lock Screen Modal */}
            <AutoLockModal 
                isLocked={isScreenLocked} 
                onUnlock={() => setIsScreenLocked(false)} 
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    );
};

export default App;
