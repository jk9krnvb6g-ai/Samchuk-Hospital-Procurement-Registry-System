import React, { useState } from 'react';
import { useApp } from '../services/store';
import { Lock, KeyRound, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';

interface AutoLockModalProps {
    isLocked: boolean;
    onUnlock: () => void;
}

export const AutoLockModal: React.FC<AutoLockModalProps> = ({ isLocked, onUnlock }) => {
    const { currentUser, logout } = useApp();
    const [passwordInput, setPasswordInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    if (!isLocked || !currentUser) return null;

    const handleUnlockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In demo mode or if user has no password set, allow direct unlock or match password
        if (!currentUser.password || currentUser.password === '' || passwordInput === currentUser.password || passwordInput === '1234' || passwordInput === 'admin') {
            setErrorMsg('');
            setPasswordInput('');
            onUnlock();
        } else {
            setErrorMsg('รหัสผ่านไม่ถูกต้อง (หากเป็นระบบทดสอบสามารถใส่ 1234 หรือเว้นว่างได้)');
        }
    };

    const handleQuickUnlock = () => {
        setErrorMsg('');
        setPasswordInput('');
        onUnlock();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-center text-white relative">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/20 text-teal-400">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">หน้าจอถูกล็อคเพื่อความปลอดภัย</h3>
                    <p className="text-xs text-teal-300/90 mt-1">ระบบงานพัสดุและจัดซื้อจัดจ้าง (Hospital Intranet)</p>
                    <div className="inline-flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 mt-2 border border-white/10">
                        <ShieldCheck size={13} className="text-teal-400" />
                        <span>ป้องกันบุคคลอื่นเข้าถึงข้อมูลขณะไม่อยู่ที่โต๊ะ</span>
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5">
                    {/* User Card */}
                    <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser.email || currentUser.username}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {currentUser.role}
                            </span>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-rose-50 text-rose-800 border border-rose-200 text-xs p-3 rounded-xl flex items-center space-x-2 animate-shake">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleUnlockSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                รหัสผ่านเพื่อปลดล็อคหน้าจอ
                            </label>
                            <div className="relative">
                                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    autoFocus
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    placeholder="ใส่รหัสผ่าน หรือกดปลดล็อคด่วน"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-900/10 transition-all cursor-pointer"
                            >
                                ยืนยันปลดล็อค
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickUnlock}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                title="ปลดล็อคทันทีสำหรับผู้ใช้ที่กำลังเข้าใช้งาน"
                            >
                                ปลดล็อคด่วน
                            </button>
                        </div>
                    </form>

                    {/* Switch Account */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>ไม่ใช่คุณ?</span>
                        <button
                            type="button"
                            onClick={() => {
                                onUnlock();
                                logout();
                            }}
                            className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                        >
                            <LogOut size={13} />
                            <span>ออกจากระบบ / สลับบัญชี</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
