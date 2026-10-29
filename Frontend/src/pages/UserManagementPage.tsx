
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/store';
import { UserCog, User as UserIcon, Search, Edit, Check, Lock, Building, Trash2, RefreshCcw, Mail, Briefcase, AlertCircle, X, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole, User, UserStatus } from '../types';

const UserManagementPage: React.FC = () => {
    const { users, currentUser, updateUser, registerUser, settings, deleteUser } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- Pagination State ---
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);
    
    // --- Add User Form State ---
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('USER');
    
    // Selection State for Add (Cascading)
    const [newWorkGroupId, setNewWorkGroupId] = useState('');
    const [newDeptId, setNewDeptId] = useState('');
    
    const [showAddConfirm, setShowAddConfirm] = useState(false);

    // --- Confirmation State ---
    const [suspendConfirm, setSuspendConfirm] = useState<{ id: string, name: string } | null>(null);
    const [reactivateConfirm, setReactivateConfirm] = useState<{ id: string, name: string } | null>(null);

    // --- Edit User State ---
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    
    // Selection State for Edit (Cascading)
    const [editWorkGroupId, setEditWorkGroupId] = useState('');
    
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'USER' as UserRole,
        departmentId: ''
    });

    // Filter Users
    const activeOrSuspendedUsers = users.filter(u => 
        u.status !== 'PENDING' && (
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    // Calculate Pagination
    const totalItems = activeOrSuspendedUsers.length;
    const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
    const paginatedUsers = itemsPerPage === -1 ? activeOrSuspendedUsers : activeOrSuspendedUsers.slice(startIndex, startIndex + itemsPerPage);

    // --- Helper Function: Get Dept & WorkGroup Names ---
    const getDeptInfo = (deptId?: string) => {
        if (!deptId) return { deptName: '-', workGroupName: '-' };
        
        const dept = settings.departments?.find(d => d.id === deptId);
        if (!dept) return { deptName: '-', workGroupName: '-' };
        
        const workGroup = settings.workGroups?.find(g => g.id === dept.workGroupId);
        return {
            deptName: dept.name,
            workGroupName: workGroup?.name || '-'
        };
    };

    // --- Handlers: Add User ---
    const handleAddUserRequest = (e: React.FormEvent) => {
        e.preventDefault();
        setShowAddConfirm(true);
    };

    const confirmAddUser = async () => {
        const success = await registerUser({
            username: newUsername,
            password: newPassword,
            name: newName,
            email: newEmail,
            role: newRole,
            departmentId: newDeptId || undefined, // Save only Department ID (WorkGroup is derived)
            status: 'ACTIVE'
        });
        
        if (success) {
            setNewUsername('');
            setNewPassword('');
            setNewName('');
            setNewEmail('');
            setNewRole('USER');
            setNewWorkGroupId('');
            setNewDeptId('');
            setShowAddConfirm(false);
        } else {
            alert('Username นี้มีผู้ใช้งานแล้ว');
            setShowAddConfirm(false);
        }
    };

    // --- Handlers: Edit User ---
    const openEditModal = (user: User) => {
        setEditingUser(user);
        
        // Reverse Lookup: Find WorkGroup based on User's Department
        let initialWorkGroupId = '';
        if (user.departmentId) {
            const dept = settings.departments.find(d => d.id === user.departmentId);
            if (dept && dept.workGroupId) {
                initialWorkGroupId = dept.workGroupId;
            }
        }

        setEditWorkGroupId(initialWorkGroupId);
        setEditFormData({
            name: user.name,
            email: user.email || '',
            username: user.username,
            password: '', 
            role: user.role,
            departmentId: user.departmentId || ''
        });
    };

    const handleUpdateUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowEditConfirm(true);
    };

    const confirmUpdateUser = () => {
        if (!editingUser) return;

        const updates: Partial<User> = {
            name: editFormData.name,
            email: editFormData.email,
            role: editFormData.role,
            departmentId: editFormData.departmentId || undefined
        };

        if (editFormData.password.trim()) {
            updates.password = editFormData.password;
        }

        updateUser(editingUser.id, updates);
        setEditingUser(null);
        setShowEditConfirm(false);
    };

    // --- Handlers: Status & Roles ---
    const handleSoftDelete = (user: User) => {
        if (user.id === currentUser?.id) return;
        setSuspendConfirm({ id: user.id, name: user.name });
    };

    const confirmSuspend = () => {
        if (suspendConfirm) {
            deleteUser(suspendConfirm.id);
            setSuspendConfirm(null);
        }
    };

    const handleReactivateRequest = (user: User) => {
        if (user.id === currentUser?.id) return;
        setReactivateConfirm({ id: user.id, name: user.name });
    };

    const confirmReactivate = () => {
        if (reactivateConfirm) {
            updateUser(reactivateConfirm.id, { status: 'ACTIVE' });
            setReactivateConfirm(null);
        }
    };

    const toggleRole = (id: string, currentRole: UserRole) => {
        if (id === currentUser?.id) return;
        // Cycle: USER -> EXECUTIVE -> ADMIN -> USER
        let newRole: UserRole = 'USER';
        if (currentRole === 'USER') newRole = 'EXECUTIVE';
        else if (currentRole === 'EXECUTIVE') newRole = 'ADMIN';
        
        updateUser(id, { role: newRole });
    };

    const getRoleBadge = (role: UserRole) => {
        switch(role) {
            case 'ADMIN': 
                return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200';
            case 'EXECUTIVE':
                return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
            default:
                return 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100';
        }
    };

    return (
        <div className="p-6 pb-20">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">จัดการผู้ใช้งาน (User Management)</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* 1. User List Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-0 flex flex-col overflow-hidden">
                    <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-0 gap-4">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <UserCog size={20} className="mr-2 text-blue-600" />
                            รายชื่อผู้ใช้งาน ({activeOrSuspendedUsers.length})
                        </h3>
                        <div className="relative w-full sm:w-auto">
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อ, username, email..." 
                                className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search size={16} className="absolute left-3 top-2 text-slate-400" />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto flex-1 border-t border-slate-100">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
                                    <th className="px-4 py-3 whitespace-nowrap">กลุ่มงาน</th>
                                    <th className="px-4 py-3 whitespace-nowrap">ฝ่าย/งาน</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">สิทธิ์</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">สถานะ</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map(user => {
                                        const { deptName, workGroupName } = getDeptInfo(user.departmentId);
                                        return (
                                            <tr key={user.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${user.status === 'SUSPENDED' ? 'bg-red-50 border-red-100' : ''}`}>
                                                <td className="px-4 py-3 font-medium text-slate-900 flex items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold ${user.status === 'ACTIVE' ? 'bg-blue-100 text-blue-600' : 'bg-red-200 text-red-600'}`}>
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={user.status === 'SUSPENDED' ? 'text-red-700 font-medium' : ''}>{user.name}</span>
                                                        <span className="text-[10px] text-slate-400">{user.username}</span>
                                                    </div>
                                                </td>
                                                {/* Work Group Column */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center text-slate-600">
                                                        <Briefcase size={14} className="mr-1.5 opacity-40 text-orange-500"/>
                                                        <span className="truncate max-w-[120px]">{workGroupName}</span>
                                                    </div>
                                                </td>
                                                {/* Department Column */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center text-slate-600">
                                                        <Building size={14} className="mr-1.5 opacity-40 text-indigo-500"/>
                                                        <span className="truncate max-w-[120px]">{deptName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button 
                                                        onClick={() => toggleRole(user.id, user.role)}
                                                        disabled={user.id === currentUser?.id || user.status === 'SUSPENDED'}
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${getRoleBadge(user.role)} ${user.id === currentUser?.id ? 'cursor-default opacity-80' : ''}`}
                                                    >
                                                        {user.role}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                        {user.status === 'ACTIVE' ? 'ใช้งานปกติ' : 'ถูกระงับ'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button 
                                                            onClick={() => openEditModal(user)}
                                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                                                            title="แก้ไขข้อมูล"
                                                            disabled={user.status === 'SUSPENDED'}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        {user.id !== currentUser?.id && (
                                                            <>
                                                                {user.status === 'ACTIVE' ? (
                                                                    <button 
                                                                        onClick={() => handleSoftDelete(user)}
                                                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-all"
                                                                        title="ลบ (ระงับการใช้งาน)"
                                                                    >
                                                                        <X size={16} /> 
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleReactivateRequest(user)}
                                                                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-all"
                                                                        title="เปิดใช้งานใหม่"
                                                                    >
                                                                        <RefreshCcw size={16} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center text-sm text-slate-600">
                            <span>แสดง</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="mx-2 border border-slate-300 rounded px-2 py-1 outline-none bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={-1}>ทั้งหมด</option>
                            </select>
                            <span>รายชื่อ</span>
                            <span className="ml-4 text-slate-500 hidden sm:inline">
                                (ทั้งหมด {totalItems} รายชื่อ)
                            </span>
                        </div>

                        {itemsPerPage !== -1 && (
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-sm font-medium text-slate-700">
                                    หน้า {currentPage} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Add User Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit relative overflow-hidden">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                        <UserIcon size={20} className="mr-2 text-green-600" />
                        เพิ่มผู้ใช้งานใหม่
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">กรณีแอดมินสร้างให้เอง ระบบจะเปิดใช้งานให้อัตโนมัติ</p>
                    <form onSubmit={handleAddUserRequest} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อ-นามสกุล</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">อีเมล</label>
                            <input 
                                required
                                type="email"
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                            <input 
                                required
                                type="password"
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">กลุ่มงาน</label>
                                <select 
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                    value={newWorkGroupId}
                                    onChange={e => {
                                        setNewWorkGroupId(e.target.value);
                                        setNewDeptId(''); // Reset department when group changes
                                    }}
                                >
                                    <option value="">-- เลือก --</option>
                                    {settings.workGroups?.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">ฝ่าย/งาน</label>
                                <select 
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-100"
                                    value={newDeptId}
                                    onChange={e => setNewDeptId(e.target.value)}
                                    disabled={!newWorkGroupId}
                                >
                                    <option value="">-- เลือก --</option>
                                    {settings.departments
                                        ?.filter(d => d.workGroupId === newWorkGroupId)
                                        .map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">สิทธิ์การใช้งาน</label>
                            <select 
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as UserRole)}
                            >
                                <option value="USER">USER (ทั่วไป)</option>
                                <option value="EXECUTIVE">EXECUTIVE (ผู้บริหาร)</option>
                                <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                            </select>
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                            บันทึก
                        </button>
                    </form>

                    {/* Confirmation Overlay for Add */}
                    {showAddConfirm && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-50 mb-4 text-green-600">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการเพิ่มผู้ใช้งาน?</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                    คุณต้องการบันทึกข้อมูลผู้ใช้งานใหม่นี้ใช่หรือไม่?
                                </p>
                                <div className="flex justify-center space-x-3">
                                    <button 
                                        onClick={() => setShowAddConfirm(false)}
                                        className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm"
                                    >
                                        กลับ
                                    </button>
                                    <button 
                                        onClick={confirmAddUser}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-colors font-medium text-sm"
                                    >
                                        ยืนยัน
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Overlay for Soft Delete (Suspend) */}
            {suspendConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full text-center">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 mb-4 text-red-600">
                            <X className="h-7 w-7" /> 
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">ลบผู้ใช้งาน?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            คุณต้องการลบคุณ <span className="font-bold text-slate-800">{suspendConfirm.name}</span> ใช่หรือไม่? 
                            <br/><span className="text-red-500 font-medium">ระบบจะเปลี่ยนสถานะเป็น "ถูกระงับ" แทนการลบจริง</span>
                        </p>
                        <div className="flex justify-center space-x-3">
                            <button 
                                onClick={() => setSuspendConfirm(null)}
                                className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-bold text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={confirmSuspend}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg shadow-red-100 transition-colors font-bold text-sm"
                            >
                                ยืนยันการลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Overlay for Reactivate */}
            {reactivateConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full text-center">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 mb-4 text-emerald-600">
                            <Power className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">เปิดใช้งานใหม่?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            คุณต้องการคืนสถานะ "ใช้งานปกติ" ให้กับ<br/>
                            <span className="font-bold text-slate-800">{reactivateConfirm.name}</span> ใช่หรือไม่?
                        </p>
                        <div className="flex justify-center space-x-3">
                            <button 
                                onClick={() => setReactivateConfirm(null)}
                                className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-bold text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={confirmReactivate}
                                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-colors font-bold text-sm"
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                                <Edit size={20} className="mr-2 text-blue-600" />
                                แก้ไขข้อมูลผู้ใช้งาน
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUserSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                                <div className="relative">
                                    <input 
                                        required
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editFormData.name}
                                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                                    />
                                    <UserIcon size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
                                <div className="relative">
                                    <input 
                                        required
                                        type="email"
                                        className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editFormData.email}
                                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                                    />
                                    <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Username <span className="text-xs text-red-400 font-normal">(แก้ไขไม่ได้)</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        disabled
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                                        value={editFormData.username}
                                    />
                                    <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มงาน</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full pl-8 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            value={editWorkGroupId}
                                            onChange={e => {
                                                setEditWorkGroupId(e.target.value);
                                                setEditFormData({...editFormData, departmentId: ''});
                                            }}
                                        >
                                            <option value="">-- เลือก --</option>
                                            {settings.workGroups?.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                        <Briefcase size={16} className="absolute left-2.5 top-3 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ฝ่าย/งาน</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full pl-8 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:bg-slate-100"
                                            value={editFormData.departmentId}
                                            onChange={e => setEditFormData({...editFormData, departmentId: e.target.value})}
                                            disabled={!editWorkGroupId}
                                        >
                                            <option value="">-- เลือก --</option>
                                            {settings.departments
                                                ?.filter(d => d.workGroupId === editWorkGroupId)
                                                .map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))
                                            }
                                        </select>
                                        <Building size={16} className="absolute left-2.5 top-3 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    รหัสผ่านใหม่ <span className="text-xs font-normal text-red-500">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="••••••••"
                                        value={editFormData.password}
                                        onChange={e => setEditFormData({...editFormData, password: e.target.value})}
                                    />
                                    <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">สิทธิ์การใช้งาน</label>
                                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData({...editFormData, role: 'USER'})}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                                            editFormData.role === 'USER' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        USER
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData({...editFormData, role: 'EXECUTIVE'})}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                                            editFormData.role === 'EXECUTIVE' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        EXEC
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData({...editFormData, role: 'ADMIN'})}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                                            editFormData.role === 'ADMIN' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        ADMIN
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingUser(null)} 
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center transition-colors"
                                >
                                    <Check size={18} className="mr-2" />
                                    บันทึกการแก้ไข
                                </button>
                            </div>
                        </form>

                        {/* Confirmation Overlay for Edit */}
                        {showEditConfirm && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full text-center">
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mb-4 text-blue-600">
                                        <AlertCircle className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการแก้ไขข้อมูล?</h3>
                                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                        กรุณาตรวจสอบความถูกต้องของข้อมูลอีกครั้ง<br/>คุณต้องการบันทึกการเปลี่ยนแปลงนี้ใช่หรือไม่?
                                    </p>
                                    <div className="flex justify-center space-x-3">
                                        <button 
                                            onClick={() => setShowEditConfirm(false)}
                                            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm"
                                        >
                                            กลับ
                                        </button>
                                        <button 
                                            onClick={confirmUpdateUser}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-colors font-medium text-sm"
                                        >
                                            ยืนยันบันทึก
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
