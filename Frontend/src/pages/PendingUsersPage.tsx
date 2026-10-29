
import React, { useState } from 'react';
import { useApp } from '../services/store';
import { UserCheck, Check, X, Building, User as UserIcon, Clock, AlertCircle, Mail, Briefcase } from 'lucide-react';

const PendingUsersPage: React.FC = () => {
    const { users, updateUser, settings } = useApp();
    const [confirmAction, setConfirmAction] = useState<{ id: string, name: string, email: string, username: string, type: 'APPROVE' | 'REJECT' } | null>(null);

    const pendingUsers = users.filter(u => u.status === 'PENDING');

    const handleApprove = async (id: string) => {
        // Update Status locally & DB to ACTIVE immediately
        await updateUser(id, { status: 'ACTIVE' });
        setConfirmAction(null);
    };

    const handleReject = (id: string) => {
        // Rejecting a new application: Mark as Suspended so they don't stay in pending list
        updateUser(id, { status: 'SUSPENDED' });
        setConfirmAction(null);
    };

    const getDeptInfo = (deptId?: string) => {
        if (!deptId) return { deptName: 'ไม่ระบุ', workGroupName: 'ไม่ระบุ' };
        
        const dept = settings.departments?.find(d => d.id === deptId);
        if (!dept) return { deptName: 'ไม่ระบุ', workGroupName: 'ไม่ระบุ' };
        
        const workGroup = settings.workGroups?.find(g => g.id === dept.workGroupId);
        return {
            deptName: dept.name,
            workGroupName: workGroup?.name || 'ไม่ระบุ'
        };
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                    <UserCheck className="mr-3 text-amber-500" size={28} />
                    รอยืนยันการสมัครสมาชิก
                </h2>
                <p className="text-sm text-slate-500">กรุณาตรวจสอบและอนุมัติสิทธิ์การเข้าใช้งานระบบสำหรับผู้ที่ลงทะเบียนใหม่</p>
            </div>

            {pendingUsers.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <Check size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">ไม่มีรายการรอยืนยัน</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">ขณะนี้ยังไม่มีผู้ใช้งานใหม่ที่รอการอนุมัติสิทธิ์เข้าใช้งาน</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingUsers.map(user => {
                        const { deptName, workGroupName } = getDeptInfo(user.departmentId);
                        return (
                            <div key={user.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-slate-100 bg-amber-50/30">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold text-xl">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-slate-900 leading-tight truncate">{user.name}</h4>
                                            <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Mail size={14} className="mr-2 text-slate-400" />
                                            <span className="truncate">{user.email || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Briefcase size={14} className="mr-2 text-slate-400" />
                                            <span className="truncate">{workGroupName}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Building size={14} className="mr-2 text-slate-400" />
                                            <span>{deptName}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Clock size={14} className="mr-2 text-slate-400" />
                                            <span>สมัครเมื่อ: {new Date(user.createdAt).toLocaleDateString('th-TH')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-white flex space-x-3 mt-auto">
                                    <button 
                                        onClick={() => setConfirmAction({ id: user.id, name: user.name, email: user.email, username: user.username, type: 'REJECT' })}
                                        className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center"
                                    >
                                        <X size={16} className="mr-1.5" /> ปฏิเสธ
                                    </button>
                                    <button 
                                        onClick={() => setConfirmAction({ id: user.id, name: user.name, email: user.email, username: user.username, type: 'APPROVE' })}
                                        className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center"
                                    >
                                        <Check size={16} className="mr-1.5" /> อนุมัติ
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${confirmAction.type === 'APPROVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {confirmAction.type === 'APPROVE' ? <Check size={32} /> : <X size={32} />}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {confirmAction.type === 'APPROVE' ? 'อนุมัติผู้ใช้งาน?' : 'ปฏิเสธคำขอ?'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            คุณต้องการดำเนินการกับคุณ <span className="font-bold text-slate-800">{confirmAction.name}</span> ใช่หรือไม่?
                        </p>
                        
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={() => confirmAction.type === 'APPROVE' ? handleApprove(confirmAction.id) : handleReject(confirmAction.id)}
                                className={`flex-1 py-3 text-white rounded-xl text-sm font-bold shadow-lg transition-all ${confirmAction.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingUsersPage;
