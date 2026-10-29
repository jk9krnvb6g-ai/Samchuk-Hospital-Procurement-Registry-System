import React from 'react';
import { useApp } from '../services/store';
import { 
    LayoutDashboard, ShoppingCart, Briefcase, Settings, Users, 
    LogOut, User as UserIcon, Archive, X, UserCheck, TrendingUp,
    Shield, Activity, Trash2, History
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const { currentUser, logout, users, procurements } = useApp();

    const pendingCount = users.filter(u => u.status === 'PENDING').length;
    const deletedCount = procurements.filter(p => p.isDeleted).length;

    // Determine Menu Items based on Role
    const getMenuItems = () => {
        const role = currentUser?.role;

        const baseItems = [
            { id: 'dashboard', label: 'Dashboard ภาพรวม', icon: LayoutDashboard },
        ];

        // Executive: Only Dashboard & Executive Dashboard
        if (role === 'EXECUTIVE') {
            return [
                ...baseItems,
                { id: 'executive', label: 'Dashboard ผู้บริหาร', icon: TrendingUp }
            ];
        }

        // User: Dashboard + Operations (No Executive Dash)
        if (role === 'USER') {
            return [
                ...baseItems,
                { id: 'purchase', label: 'ทะเบียนคุมจัดซื้อ (PO)', icon: ShoppingCart },
                { id: 'hiring', label: 'ทะเบียนคุมจัดจ้าง (HO)', icon: Briefcase },
                { id: 'other', label: 'ทะเบียนคุมอื่นๆ', icon: Archive },
            ];
        }

        // Admin: Everything
        if (role === 'ADMIN') {
            return [
                ...baseItems,
                { id: 'executive', label: 'Dashboard ผู้บริหาร', icon: TrendingUp },
                { id: 'purchase', label: 'ทะเบียนคุมจัดซื้อ (PO)', icon: ShoppingCart },
                { id: 'hiring', label: 'ทะเบียนคุมจัดจ้าง (HO)', icon: Briefcase },
                { id: 'other', label: 'ทะเบียนคุมอื่นๆ', icon: Archive },
            ];
        }

        return baseItems;
    };

    const menuItems = getMenuItems();

    const adminItems = [];
    if (currentUser?.role === 'ADMIN') {
        adminItems.push({ 
            id: 'pending_users', 
            label: 'รอยืนยันการสมัคร', 
            icon: UserCheck,
            badge: pendingCount > 0 ? pendingCount : null 
        });
        adminItems.push({ id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users });
        adminItems.push({ 
            id: 'recycle_bin', 
            label: 'ถังขยะกู้คืนข้อมูล', 
            icon: Trash2,
            badge: deletedCount > 0 ? deletedCount : null 
        });
        adminItems.push({ id: 'audit_logs', label: 'ประวัติการใช้งาน (Audit)', icon: History });
        adminItems.push({ id: 'settings', label: 'ตั้งค่าระบบ & สำรอง', icon: Settings });
    }

    const handleMenuClick = (id: string) => {
        setActiveTab(id);
        if (window.innerWidth < 1024) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Overlay for mobile/tablet */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container - Deep Navy Professional Medical Theme */}
            <div className={`fixed left-0 top-0 h-screen bg-[#0f172a] text-slate-100 flex flex-col overflow-y-auto z-[70] transition-all duration-300 ease-in-out shadow-2xl border-r border-slate-800
                ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}>
                
                {/* Header Branding */}
                <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-[#0f172a] flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <Activity size={22} className="stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white tracking-wide">Procurement OS</h1>
                            <p className="text-[11px] text-teal-300/80 font-medium">รพ.สามชุก สุพรรณบุรี</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>

                {/* User Profile Card */}
                <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/40">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-teal-400 flex-shrink-0 shadow-inner">
                            <UserIcon size={18} />
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.name}</p>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    currentUser?.role === 'ADMIN' ? 'bg-indigo-400' :
                                    currentUser?.role === 'EXECUTIVE' ? 'bg-amber-400' : 'bg-emerald-400'
                                }`} />
                                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">{currentUser?.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-3 space-y-1">
                    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">เมนูหลัก</p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isExecutive = item.id === 'executive';
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleMenuClick(item.id)}
                                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm text-left group ${
                                    isActive
                                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-900/40' 
                                    : isExecutive 
                                        ? 'text-amber-300 hover:bg-slate-800/80 hover:text-amber-200' 
                                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                                }`}
                            >
                                <Icon size={18} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : isExecutive ? 'text-amber-400' : 'text-slate-400 group-hover:text-teal-300'}`} />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}

                    {adminItems.length > 0 && (
                        <div className="pt-4">
                            <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                <Shield size={12} className="mr-1.5 text-indigo-400" />
                                ผู้ดูแลระบบ
                            </p>
                            {adminItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleMenuClick(item.id)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm text-left group mb-1 ${
                                            isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-950/40' 
                                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 truncate">
                                            <Icon size={18} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {item.badge && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </nav>

                {/* Footer & Logout */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-semibold transition-all border border-red-500/20 hover:border-transparent"
                    >
                        <LogOut size={15} />
                        <span>ออกจากระบบ</span>
                    </button>
                    <div className="text-[11px] text-slate-400 text-center mt-3 leading-tight space-y-0.5">
                        <p className="font-medium text-slate-300">โรงพยาบาลสามชุก</p>
                        <p className="opacity-75">กลุ่มงานสุขภาพดิจิทัล v2.0</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
