import React, { useState, useEffect } from 'react';
import { useApp } from '../services/store';
import { 
    Lock, User, UserPlus, LogIn, AlertCircle, Building, CheckCircle, 
    HelpCircle, Mail, Briefcase, Eye, EyeOff, ShieldCheck, Activity, 
    PhoneCall, KeyRound, Sparkles, ChevronRight, FileText, RefreshCw, 
    ShieldAlert, Clock, AlertTriangle, QrCode, Smartphone, Stethoscope,
    Check, ArrowLeft, Fingerprint
} from 'lucide-react';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

// Helper to generate a 4-character visual captcha code
const generateCaptchaCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

type AuthMethod = 'PASSWORD' | 'REGISTER';

const LoginPage: React.FC = () => {
    const { login, registerUser, settings, addAuditLog } = useApp();
    const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
    
    // Traditional login states
    const [username, setUsername] = useState(() => {
        return typeof window !== 'undefined' ? localStorage.getItem('samchuk_saved_username') || '' : '';
    });
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => {
        return typeof window !== 'undefined' ? !!localStorage.getItem('samchuk_saved_username') : false;
    });

    // Security Captcha states
    const [captchaCode, setCaptchaCode] = useState(generateCaptchaCode);
    const [captchaInput, setCaptchaInput] = useState('');

    // Security Brute-Force Rate Limiting & Lockout states
    const [failedAttempts, setFailedAttempts] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('samchuk_login_failed_attempts');
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });
    const [lockoutTimer, setLockoutTimer] = useState(0);

    // Registration states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [workGroupId, setWorkGroupId] = useState('');
    const [deptId, setDeptId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

    // Countdown effect for lockout timer
    useEffect(() => {
        let interval: any = null;
        if (lockoutTimer > 0) {
            interval = setInterval(() => {
                setLockoutTimer(prev => {
                    if (prev <= 1) {
                        setFailedAttempts(0);
                        sessionStorage.removeItem('samchuk_login_failed_attempts');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [lockoutTimer]);

    const refreshCaptcha = () => {
        setCaptchaCode(generateCaptchaCode());
        setCaptchaInput('');
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setIsCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
    };

    // Password strength evaluator for registration
    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, text: 'ยังไม่ได้ระบุ', color: 'bg-slate-200' };
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass) || /[a-z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 2) return { score: 1, text: 'ความปลอดภัยต่ำ (ควรมีความยาว 8 ตัวอักษรขึ้นไป)', color: 'bg-red-500 text-red-700' };
        if (score <= 3) return { score: 2, text: 'ความปลอดภัยปานกลาง', color: 'bg-amber-500 text-amber-700' };
        return { score: 3, text: 'ความปลอดภัยสูง (รัดกุมดีเยี่ยม)', color: 'bg-emerald-500 text-emerald-700' };
    };

    // Standard Username/Password Login Submit
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (lockoutTimer > 0) {
            setError(`⚠️ บัญชีถูกระงับชั่วคราว กรุณารออีก ${lockoutTimer} วินาที ก่อนลองใหม่อีกครั้ง`);
            return;
        }

        if (authMethod === 'REGISTER') {
            setShowRegisterConfirm(true);
            return;
        }

        if (authMethod === 'PASSWORD') {
            if (!captchaInput || captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
                setError('รหัสความปลอดภัย (CAPTCHA) ไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง');
                refreshCaptcha();
                return;
            }

            setIsSubmitting(true);
            try {
                if (rememberMe) {
                    localStorage.setItem('samchuk_saved_username', username.trim());
                } else {
                    localStorage.removeItem('samchuk_saved_username');
                }

                const result = await login(username, password);
                if (result.success) {
                    setFailedAttempts(0);
                    sessionStorage.removeItem('samchuk_login_failed_attempts');
                    addAuditLog({
                        recordId: 'auth_success',
                        action: 'LOGIN',
                        userName: username,
                        userId: username,
                        details: `เข้าสู่ระบบสำเร็จผ่านบัญชีโรงพยาบาลสามชุก (256-Bit SSL)`
                    });
                } else {
                    const nextFailed = failedAttempts + 1;
                    setFailedAttempts(nextFailed);
                    sessionStorage.setItem('samchuk_login_failed_attempts', nextFailed.toString());

                    addAuditLog({
                        recordId: 'auth_failed',
                        action: 'SECURITY_ALERT',
                        userName: username || 'นิรนาม',
                        userId: 'guest',
                        details: `พยายามเข้าสู่ระบบไม่สำเร็จ (ครั้งที่ ${nextFailed}/${MAX_FAILED_ATTEMPTS})`
                    });

                    if (nextFailed >= MAX_FAILED_ATTEMPTS) {
                        setLockoutTimer(LOCKOUT_SECONDS);
                        setError(`🚨 ความปลอดภัย: กรอกรหัสผิดเกิน ${MAX_FAILED_ATTEMPTS} ครั้ง ระบบขอระงับการเข้าสู่ระบบชั่วคราว 60 วินาที`);
                    } else {
                        const remaining = MAX_FAILED_ATTEMPTS - nextFailed;
                        setError(`${result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'} (เหลือโอกาสลองอีก ${remaining} ครั้ง)`);
                    }
                    refreshCaptcha();
                }
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const confirmRegistration = async () => {
        if (!username || !password || !name || !email) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            setShowRegisterConfirm(false);
            return;
        }

        const resultReal = await registerUser({
            username: username.trim(),
            password,
            name: name.trim(),
            email: email.trim(),
            role: 'USER',
            departmentId: deptId || undefined,
            status: 'PENDING'
        });

        if (resultReal) {
            setSuccess('ส่งคำขอลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน');
            addAuditLog({
                recordId: `reg_${username}`,
                action: 'CREATE',
                userName: name,
                userId: username,
                details: `ส่งคำขอเปิดบัญชีผู้ใช้ใหม่ (${name})`
            });
            setAuthMethod('PASSWORD');
            setUsername('');
            setPassword('');
            setName('');
            setEmail('');
            setWorkGroupId('');
            setDeptId('');
        } else {
            setError('ชื่อผู้ใช้งานนี้ถูกใช้ไปแล้วในระบบ');
        }
        setShowRegisterConfirm(false);
    };

    const getWorkGroupName = (id: string) => settings.workGroups?.find(g => g.id === id)?.name || '-';
    const getDeptName = (id: string) => settings.departments?.find(d => d.id === id)?.name || '-';
    const pwStrength = getPasswordStrength(password);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-slate-200/80 relative z-10">
                
                {/* ========================================================
                    LEFT PANEL: Hospital Identity & MOPH Digital Health Vision
                   ======================================================== */}
                <div className="lg:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
                    <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                    <div>
                        {/* Hospital & MOPH Badge */}
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/30 text-white flex-shrink-0">
                                <Building size={26} className="text-white" />
                            </div>
                            <div>
                                <span className="inline-block text-[10px] tracking-wider uppercase font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                                    กระทรวงสาธารณสุข
                                </span>
                                <h2 className="text-lg font-bold text-white tracking-wide">
                                    โรงพยาบาลสามชุก
                                </h2>
                                <p className="text-xs text-slate-400">
                                    รหัสหน่วยบริการ 10738 • สสจ.สุพรรณบุรี
                                </p>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="mt-6 mb-6">
                            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-300 mb-2 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800/50">
                                <ShieldCheck size={13} className="text-blue-400" />
                                <span>Hospital Intranet Secure Gateway v2.5</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                                ระบบบริหารงานพัสดุ<br />และจัดซื้อจัดจ้างภาครัฐ
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
                                เข้าสู่ระบบด้วยบัญชีบุคลากรโรงพยาบาลสามชุก เพื่อบริหารจัดการทะเบียนคุมพัสดุตาม พ.ร.บ. จัดซื้อจัดจ้าง พ.ศ. ๒๕๖๐
                            </p>
                        </div>

                        {/* Security Highlights */}
                        <div className="space-y-3 mt-4">
                            <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                                <Lock size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-semibold text-slate-200">ระบบรักษาความปลอดภัยเครือข่ายภายใน</p>
                                    <p className="text-slate-400 text-[11px]">การเชื่อมต่อเข้ารหัสระดับโรงพยาบาล ตรวจสอบสิทธิ์รายบุคคลตามกลุ่มงาน</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                                <ShieldAlert size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-semibold text-slate-200">ระบบป้องกัน Brute-Force & CAPTCHA</p>
                                    <p className="text-slate-400 text-[11px]">จำกัดการพิมพ์รหัสผ่านผิดสูงสุด 5 ครั้ง พร้อมระงับชั่วคราวอัตโนมัติ</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                                <Activity size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-semibold text-slate-200">Audit Trail ตรวจสอบย้อนหลัง</p>
                                    <p className="text-slate-400 text-[11px]">บันทึกข้อมูลและลายมือชื่อดิจิทัล ไม่สามารถแก้ไขหรือลบย้อนหลังได้</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status */}
                    <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                        <div className="flex items-center space-x-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] text-slate-300 font-medium">
                                ระบบเครือข่ายภายใน รพ.สามชุก (10738)
                            </span>
                        </div>
                        <span className="text-[10px] text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/80 font-mono">
                            TLS 1.3 / 256-Bit
                        </span>
                    </div>
                </div>

                {/* ========================================================
                    RIGHT PANEL: Dual Authentication Portal
                   ======================================================== */}
                <div className="lg:w-7/12 p-8 lg:p-12 flex flex-col justify-between bg-white">
                    <div>
                        {/* Header for Login */}
                        <div className="mb-6 pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                                    <Lock size={18} className="mr-2 text-blue-600" />
                                    {authMethod === 'REGISTER' ? 'ลงทะเบียนขอเปิดสิทธิ์ใช้งาน' : 'เข้าสู่ระบบงานพัสดุ'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {authMethod === 'REGISTER' ? 'กรอกข้อมูลเพื่อส่งให้ผู้ดูแลระบบอนุมัติ' : 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าสู่ระบบ'}
                                </p>
                            </div>
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                                บัญชีบุคลากร รพ.
                            </span>
                        </div>

                        {/* Error and Success Notices */}
                        {error && (
                            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs sm:text-sm flex items-start border border-red-200 mb-4 animate-fade-in">
                                <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs sm:text-sm flex items-start border border-emerald-200 mb-4 animate-fade-in">
                                <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5 text-emerald-600" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Lockout Warning */}
                        {lockoutTimer > 0 && (
                            <div className="bg-red-50 text-red-800 p-4 rounded-2xl border-2 border-red-300 mb-4 flex items-center space-x-3 animate-pulse">
                                <Clock size={28} className="text-red-600 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold">ระงับการเข้าสู่ระบบชั่วคราว (Lockout Active)</h4>
                                    <p className="text-xs text-red-700 mt-0.5">
                                        เนื่องจากรหัสผ่านผิดเกินกำหนด กรุณารออีก <span className="font-bold text-red-900 font-mono text-sm">{lockoutTimer}</span> วินาที
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ==============================================================
                            VIEW B: TRADITIONAL HOSPITAL ACCOUNT LOGIN
                           ============================================================== */}
                        {authMethod === 'PASSWORD' && (
                            <form onSubmit={handleFormSubmit} className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        ชื่อผู้ใช้งาน (Username) *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" required autoFocus
                                            disabled={lockoutTimer > 0}
                                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 focus:bg-white transition-all disabled:opacity-50"
                                            placeholder="เช่น admin, user หรือชื่อผู้ใช้งานของท่าน"
                                            value={username} onChange={e => setUsername(e.target.value)}
                                        />
                                        <div className="absolute left-3 top-3 text-slate-400"><User size={16} /></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            รหัสผ่าน (Password) *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelpModal(true)}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            ลืมรหัสผ่าน?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? 'text' : 'password'} required
                                            disabled={lockoutTimer > 0}
                                            className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 focus:bg-white transition-all font-mono disabled:opacity-50"
                                            placeholder="••••••••"
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)}
                                            onKeyUp={handleKeyUp}
                                        />
                                        <div className="absolute left-3 top-3 text-slate-400"><Lock size={16} /></div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                                            title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Anti-Bot Security CAPTCHA */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            รหัสยืนยันความปลอดภัย (Anti-Bot CAPTCHA) *
                                        </label>
                                        <span className="text-[10px] text-slate-400">ป้องกันโปรแกรมสุ่มรหัส</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type="text" required
                                                disabled={lockoutTimer > 0}
                                                maxLength={4}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-widest text-slate-900 bg-slate-50/50 disabled:opacity-50"
                                                placeholder="กรอก 4 ตัวอักษร"
                                                value={captchaInput}
                                                onChange={e => setCaptchaInput(e.target.value)}
                                            />
                                            <div className="absolute left-3 top-2.5 text-slate-400"><ShieldCheck size={16} /></div>
                                        </div>

                                        <div 
                                            className="px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-teal-300 font-mono font-black text-lg tracking-widest rounded-xl border border-slate-700 shadow-inner select-none cursor-pointer flex items-center space-x-1"
                                            onClick={refreshCaptcha}
                                            title="คลิกเพื่อสุ่มรหัสภาพใหม่"
                                        >
                                            <span className="italic transform -rotate-3 inline-block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                {captchaCode}
                                            </span>
                                            <RefreshCw size={13} className="text-slate-400 hover:text-white ml-1 transition-transform active:rotate-180" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="ml-2 text-xs text-slate-600">จดจำชื่อผู้ใช้งานบนอุปกรณ์นี้</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMethod('REGISTER'); setError(''); }}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        ลงทะเบียนใหม่
                                    </button>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || lockoutTimer > 0}
                                    className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
                                >
                                    <LogIn size={18} />
                                    <span>{isSubmitting ? 'กำลังตรวจสอบสิทธิ์...' : 'ยืนยันตัวตนเข้าสู่ระบบ'}</span>
                                    <ChevronRight size={16} />
                                </button>
                            </form>
                        )}

                        {/* ==============================================================
                            VIEW C: REGISTRATION FORM WITH PROVIDER ID OPTION
                           ============================================================== */}
                        {authMethod === 'REGISTER' && (
                            <form onSubmit={handleFormSubmit} className="space-y-3.5 animate-fade-in">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                                    <h4 className="text-sm font-bold text-slate-800">กรอกข้อมูลขอเปิดสิทธิ์ใช้งานระบบ</h4>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMethod('PASSWORD')}
                                        className="text-xs text-blue-600 hover:underline flex items-center"
                                    >
                                        <ArrowLeft size={13} className="mr-1" />
                                        กลับหน้าเข้าสู่ระบบ
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                                        <div className="relative">
                                            <input 
                                                type="text" required
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 focus:bg-white transition-all"
                                                placeholder="เช่น นายสมชาย ใจดี"
                                                value={name} onChange={e => setName(e.target.value)}
                                            />
                                            <div className="absolute left-3 top-2.5 text-slate-400"><User size={16} /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลราชการ/ติดต่อ *</label>
                                        <div className="relative">
                                            <input 
                                                type="email" required
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 focus:bg-white transition-all"
                                                placeholder="user@samchuk.go.th"
                                                value={email} onChange={e => setEmail(e.target.value)}
                                            />
                                            <div className="absolute left-3 top-2.5 text-slate-400"><Mail size={16} /></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มงาน</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900"
                                                value={workGroupId} 
                                                onChange={e => {
                                                    setWorkGroupId(e.target.value);
                                                    setDeptId('');
                                                }}
                                            >
                                                <option value="">-- เลือกกลุ่มงาน --</option>
                                                {settings.workGroups?.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute left-3 top-2.5 text-slate-400"><Briefcase size={16} /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย / หน่วยงานย่อย</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 disabled:bg-slate-100"
                                                value={deptId} 
                                                onChange={e => setDeptId(e.target.value)}
                                                disabled={!workGroupId}
                                            >
                                                <option value="">-- เลือกฝ่าย/งาน --</option>
                                                {settings.departments
                                                    ?.filter(d => d.workGroupId === workGroupId && d.isActive)
                                                    .map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))
                                                }
                                            </select>
                                            <div className="absolute left-3 top-2.5 text-slate-400"><Building size={16} /></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ใช้งาน *</label>
                                        <input 
                                            type="text" required
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900"
                                            placeholder="ภาษาอังกฤษหรือตัวเลข"
                                            value={username} onChange={e => setUsername(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">กำหนดรหัสผ่าน *</label>
                                        <input 
                                            type="password" required
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-900 font-mono"
                                            placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {password && (
                                    <div className="text-[11px]">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-slate-500">ระดับความปลอดภัย:</span>
                                            <span className={`font-semibold ${pwStrength.score === 3 ? 'text-emerald-600' : pwStrength.score === 2 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {pwStrength.text}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                            <div className={`h-full ${pwStrength.color} transition-all duration-300`} style={{ width: `${(pwStrength.score / 3) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
                                >
                                    <UserPlus size={16} />
                                    <span>ส่งคำขอลงทะเบียนใช้งาน</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Bottom Legal Notice */}
                    <div className="mt-6 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(true)}
                                className="inline-flex items-center text-slate-600 hover:text-blue-600 font-medium"
                            >
                                <PhoneCall size={13} className="mr-1.5 text-blue-500" />
                                <span>ติดต่อฝ่ายพัสดุ / ไอที รพ.สามชุก</span>
                            </button>
                            <span className="text-[11px] text-slate-400">
                                พ.ร.บ. ไซเบอร์ & PDPA ๒๕๖๒
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Confirmation Modal */}
            {showRegisterConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
                        <div className="text-center mb-4">
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-50 text-blue-600 mb-3">
                                <HelpCircle size={30} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">ยืนยันการส่งข้อมูลลงทะเบียน?</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                บัญชีของท่านจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบและอนุมัติเปิดสิทธิ์
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 border border-slate-200/70 mb-5">
                            <div className="flex justify-between">
                                <span className="text-slate-500">ชื่อผู้ใช้งาน:</span>
                                <span className="font-bold text-slate-800 font-mono">{username}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                                <span className="font-semibold text-slate-800">{name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">กลุ่มงาน:</span>
                                <span className="font-medium text-slate-800">{getWorkGroupName(workGroupId)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">ฝ่าย/งาน:</span>
                                <span className="font-medium text-slate-800">{getDeptName(deptId)}</span>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button 
                                onClick={() => setShowRegisterConfirm(false)} 
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                                กลับไปแก้ไข
                            </button>
                            <button 
                                onClick={confirmRegistration} 
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                            >
                                ยืนยันส่งข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IT Helpdesk Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <PhoneCall size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">ศูนย์ประสานงานสารสนเทศและพัสดุ</h3>
                                <p className="text-xs text-slate-500">โรงพยาบาลสามชุก จ.สุพรรณบุรี</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                <p className="font-bold text-slate-800 mb-1">🏢 เจ้าหน้างานงานพัสดุ</p>
                                <p className="text-slate-600">โทรศัพท์ภายใน: <strong className="text-blue-600 font-mono text-sm">115</strong></p>
                                <p className="text-slate-500 text-[11px] mt-0.5">รับแจ้งปัญหาการออกเลขที่คำขอ, การตรวจรับ, และเลขที่รายงานขอซื้อ/จ้าง</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                <p className="font-bold text-slate-800 mb-1">💻 กลุ่มงานสุขภาพดิจิทัล (งานไอที/เซิร์ฟเวอร์)</p>
                                <p className="text-slate-600">โทรศัพท์ภายใน: <strong className="text-blue-600 font-mono text-sm">149</strong></p>
                                <p className="text-slate-500 text-[11px] mt-0.5">รับแจ้งปลดล็อคบัญชี, รีเซ็ตรหัสผ่าน, ปัญหาการเข้าสู่ระบบ</p>
                            </div>

                            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] text-blue-900">
                                <p className="font-semibold mb-0.5">💡 หมายเหตุสำหรับผู้ดูแลระบบ:</p>
                                <p>หากต้องการปลดล็อคผู้ใช้งานหรือจัดการสิทธิ์ ให้เข้าสู่ระบบด้วยบัญชี <strong className="font-mono">admin</strong> เพื่อเข้าสู่เมนู "จัดการผู้ใช้งาน"</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                ปิดหน้าต่างนี้
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
