
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/store';
import { 
    Plus, Edit2, X, Check, Building, Briefcase, Power, Layers, 
    ChevronRight, FolderTree, AlertTriangle, HelpCircle, Trash2,
    Database, Download, Upload, ShieldCheck, CheckCircle2, HardDrive
} from 'lucide-react';
import { SystemBackupData } from '../types';

const SettingsPage: React.FC = () => {
    const { 
        settings, addDepartment, updateDepartment, addWorkGroup, updateWorkGroup, 
        addCategory, updateCategory, deleteCategory, procurements, users,
        exportBackupData, restoreBackupData, auditLogs 
    } = useApp();
    
    // ================= Settings Top Tab =================
    const [activeSection, setActiveSection] = useState<'ORG' | 'BACKUP'>('ORG');
    const [backupMessage, setBackupMessage] = useState<{ text: string; isError?: boolean } | null>(null);
    const [pendingRestore, setPendingRestore] = useState<SystemBackupData | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    // ================= Selection State =================
    const [selectedWgId, setSelectedWgId] = useState<string | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

    // ================= Edit State =================
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editExtra, setEditExtra] = useState(''); // Prefix (For WG or Dept)
    const [editExtra2, setEditExtra2] = useState(''); // Request Prefix

    // ================= New Item State =================
    const [newWgName, setNewWgName] = useState('');
    const [newWgPrefix, setNewWgPrefix] = useState(''); // NEW: Work Group Prefix
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptPrefix, setNewDeptPrefix] = useState('');
    const [newDeptReqPrefix, setNewDeptReqPrefix] = useState('');
    const [newCatName, setNewCatName] = useState('');

    // ================= Confirmation State =================
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'ADD' | 'EDIT' | 'DELETE';
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    // Filter Logic
    useEffect(() => { setSelectedDeptId(null); }, [selectedWgId]);

    const visibleDepartments = selectedWgId 
        ? settings.departments.filter(d => d.workGroupId === selectedWgId) 
        : []; 

    const visibleCategories = selectedDeptId
        ? settings.categories.filter(c => c.departmentId === selectedDeptId)
        : [];

    // --- Work Groups ---
    const requestAddWg = () => {
        if(!newWgName.trim()) return;
        setConfirmDialog({
            isOpen: true,
            type: 'ADD',
            title: 'ยืนยันการเพิ่มกลุ่มงาน',
            message: `คุณต้องการเพิ่มกลุ่มงาน "${newWgName.trim()}" พร้อมตัวย่อรันเลข "${newWgPrefix.trim() || '-'}" ใช่หรือไม่?`,
            onConfirm: () => {
                addWorkGroup({ id: `g_${Date.now()}`, name: newWgName.trim(), prefix: newWgPrefix.trim(), isActive: true });
                setNewWgName(''); setNewWgPrefix('');
                setConfirmDialog(null);
            }
        });
    };
    const requestUpdateWg = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'EDIT',
            title: 'ยืนยันการแก้ไข',
            message: `คุณต้องการบันทึกการแก้ไขกลุ่มงานและตัวย่อรันเลขใช่หรือไม่?`,
            onConfirm: () => {
                updateWorkGroup(id, { name: editValue, prefix: editExtra });
                setEditingId(null);
                setConfirmDialog(null);
            }
        });
    };

    // --- Departments ---
    const requestAddDept = () => {
        if(!newDeptName.trim() || !selectedWgId) return;
        setConfirmDialog({
            isOpen: true,
            type: 'ADD',
            title: 'ยืนยันการเพิ่มฝ่าย/งาน',
            message: `คุณต้องการเพิ่มฝ่าย "${newDeptName.trim()}" ใช่หรือไม่?`,
            onConfirm: () => {
                addDepartment({ 
                    id: `d_${Date.now()}`, 
                    name: newDeptName.trim(), 
                    prefix: newDeptPrefix.trim(),
                    requestPrefix: newDeptReqPrefix.trim(),
                    workGroupId: selectedWgId, 
                    isActive: true 
                });
                setNewDeptName(''); setNewDeptPrefix(''); setNewDeptReqPrefix('');
                setConfirmDialog(null);
            }
        });
    };
    const requestUpdateDept = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'EDIT',
            title: 'ยืนยันการแก้ไข',
            message: `คุณต้องการบันทึกการแก้ไขข้อมูลฝ่าย/งานใช่หรือไม่?`,
            onConfirm: () => {
                updateDepartment(id, { name: editValue, prefix: editExtra, requestPrefix: editExtra2 });
                setEditingId(null);
                setConfirmDialog(null);
            }
        });
    };

    // --- Categories ---
    const requestAddCat = () => {
        if(!newCatName.trim() || !selectedDeptId) return;
        setConfirmDialog({
            isOpen: true,
            type: 'ADD',
            title: 'ยืนยันการเพิ่มหมวดพัสดุ',
            message: `คุณต้องการเพิ่มหมวด "${newCatName.trim()}" ใช่หรือไม่?`,
            onConfirm: () => {
                addCategory({ id: `c_${Date.now()}`, name: newCatName.trim(), departmentId: selectedDeptId, isActive: true });
                setNewCatName('');
                setConfirmDialog(null);
            }
        });
    };

    const requestUpdateCat = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'EDIT',
            title: 'ยืนยันการแก้ไข',
            message: `คุณต้องการเปลี่ยนชื่อเป็น "${editValue}" ใช่หรือไม่?`,
            onConfirm: () => {
                updateCategory(id, { name: editValue });
                setEditingId(null);
                setConfirmDialog(null);
            }
        });
    };

    const requestDeleteCat = (id: string, name: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'DELETE',
            title: 'ยืนยันการลบ',
            message: `คุณต้องการลบหมวด "${name}" ใช่หรือไม่?`,
            onConfirm: () => {
                deleteCategory(id);
                setConfirmDialog(null);
            }
        });
    };

    const requestToggleActive = (type: 'WG'|'DEPT'|'CAT', item: any) => {
        setConfirmDialog({
            isOpen: true,
            type: item.isActive ? 'DELETE' : 'ADD',
            title: `ยืนยันการ${item.isActive ? 'ปิด' : 'เปิด'}การใช้งาน`,
            message: `คุณต้องการ${item.isActive ? 'ปิด' : 'เปิด'} "${item.name}" ใช่หรือไม่?`,
            onConfirm: () => {
                if(type === 'WG') updateWorkGroup(item.id, { isActive: !item.isActive });
                if(type === 'DEPT') updateDepartment(item.id, { isActive: !item.isActive });
                if(type === 'CAT') updateCategory(item.id, { isActive: !item.isActive });
                setConfirmDialog(null);
            }
        });
    };

    const handleDownloadBackup = () => {
        const backup = exportBackupData();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `Samchuk_Hospital_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setBackupMessage({ text: 'ดาวน์โหลดไฟล์สำรองฐานข้อมูลสำเร็จ สามารถนำไปเก็บใน Flash Drive หรือเครื่องสำรองได้' });
        setTimeout(() => setBackupMessage(null), 5000);
    };

    const handleDownloadSql = () => {
        const lines: string[] = [
            `-- ==============================================================`,
            `-- โรงพยาบาลสามชุก สุพรรณบุรี - SQL Database Backup Export`,
            `-- ส่งออกเมื่อ: ${new Date().toISOString()}`,
            `-- จำนวนรายการพัสดุ: ${procurements.length}`,
            `-- ==============================================================`,
            `BEGIN TRANSACTION;`,
            ``
        ];

        procurements.forEach(p => {
            const esc = (s?: string | null) => s ? `'${s.replace(/'/g, "''")}'` : 'NULL';
            lines.push(`INSERT INTO procurements (id, requestId, requestDate, category, itemCount, amount, company, remarks, officialNumber, type, isDeleted, isLocked) VALUES (${esc(p.id)}, ${esc(p.requestId)}, ${esc(p.requestDate)}, ${esc(p.category)}, ${p.itemCount || 1}, ${p.amount || 0}, ${esc(p.company)}, ${esc(p.remarks)}, ${esc(p.officialNumber)}, '${p.type}', ${p.isDeleted ? 'TRUE' : 'FALSE'}, ${p.isLocked ? 'TRUE' : 'FALSE'});`);
        });

        lines.push(`COMMIT;`);

        const sqlContent = lines.join('\n');
        const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Samchuk_Procurement_${new Date().toISOString().slice(0, 10)}.sql`;
        link.click();
        setBackupMessage({ text: 'ดาวน์โหลดไฟล์ SQL Script สำเร็จ สำหรับนำเข้าฐานข้อมูล PostgreSQL / MySQL ในเครือข่าย รพ.' });
        setTimeout(() => setBackupMessage(null), 5000);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (!parsed || !parsed.procurements) {
                    setBackupMessage({ text: 'รูปแบบไฟล์ไม่ถูกต้อง ไม่พบข้อมูลพัสดุ', isError: true });
                    return;
                }
                setPendingRestore(parsed);
            } catch (err) {
                setBackupMessage({ text: 'ไฟล์ JSON เสียหายหรือไม่ถูกต้อง', isError: true });
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmRestore = async () => {
        if (!pendingRestore) return;
        setIsRestoring(true);
        const result = await restoreBackupData(pendingRestore);
        setIsRestoring(false);
        setPendingRestore(null);
        setBackupMessage({ text: result.message, isError: !result.success });
        setTimeout(() => setBackupMessage(null), 5000);
    };

    return (
        <div className="p-4 sm:p-6 h-[calc(100vh-60px)] flex flex-col bg-slate-50 overflow-hidden font-sans relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 flex-shrink-0 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <FolderTree className="mr-3 text-teal-600" />
                        การตั้งค่าระบบ & ความปลอดภัย
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        จัดการโครงสร้างองค์กร และสำรองข้อมูลฐานข้อมูลภายใน Intranet
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="inline-flex rounded-xl p-1 bg-slate-200/80 border border-slate-300/80 shadow-inner">
                    <button
                        onClick={() => setActiveSection('ORG')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeSection === 'ORG'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Building size={14} className="text-teal-600" />
                        <span>โครงสร้างองค์กร & หมวดพัสดุ</span>
                    </button>
                    <button
                        onClick={() => setActiveSection('BACKUP')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeSection === 'BACKUP'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Database size={14} className="text-teal-600" />
                        <span>สำรอง & กู้คืนฐานข้อมูล (Intranet)</span>
                    </button>
                </div>
            </div>

            {backupMessage && (
                <div className={`p-3.5 mb-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 animate-fade-in ${
                    backupMessage.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                    <CheckCircle2 size={16} />
                    <span>{backupMessage.text}</span>
                </div>
            )}

            {activeSection === 'BACKUP' ? (
                <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl">
                    {/* Backup Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 border border-teal-100">
                                <HardDrive size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-slate-900">สำรองฐานข้อมูลฉุกเฉิน (Export Backup JSON)</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    ดาวน์โหลดไฟล์ข้อมูลทั้งหมดของโรงพยาบาล (ทะเบียนคุม {procurements.length} รายการ, ประวัติ Audit Log {auditLogs.length} รายการ, บัญชีผู้ใช้ {users.length} รายการ) เพื่อนำไปเก็บไว้ใน Flash Drive หรือเครื่องคอมพิวเตอร์สำรอง
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-wrap gap-2.5">
                            <button
                                onClick={handleDownloadBackup}
                                className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-teal-900/10 transition-all cursor-pointer"
                            >
                                <Download size={16} />
                                <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.json)</span>
                            </button>
                            <button
                                onClick={handleDownloadSql}
                                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                                title="ส่งออกคำสั่ง SQL INSERT สำหรับฐานข้อมูล PostgreSQL/MySQL"
                            >
                                <Database size={16} className="text-teal-400" />
                                <span>ดาวน์โหลด SQL Script (.sql)</span>
                            </button>
                        </div>
                    </div>

                    {/* Restore Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100">
                                <Upload size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-slate-900">กู้คืนฐานข้อมูลจากไฟล์สำรอง (Restore Database)</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    กรณีเครื่องเซิร์ฟเวอร์หลักมีปัญหาหรือต้องการย้ายเครื่อง สามารถเลือกไฟล์สำรอง (.json) เพื่อกู้คืนข้อมูลกลับมาได้ทันที
                                </p>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl p-6 text-center transition-colors">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                id="backup-file-input"
                                className="hidden"
                            />
                            <label
                                htmlFor="backup-file-input"
                                className="cursor-pointer flex flex-col items-center space-y-2 text-slate-600 hover:text-teal-700"
                            >
                                <Upload size={28} className="text-slate-400" />
                                <span className="text-xs font-bold">คลิกเพื่อเลือกไฟล์สำรอง (.json)</span>
                                <span className="text-[11px] text-slate-400">รองรับไฟล์ JSON ที่ส่งออกจากระบบพัสดุ รพ.สามชุก</span>
                            </label>
                        </div>
                    </div>

                    {/* Guidelines Card */}
                    <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-5 text-teal-950 text-xs space-y-2">
                        <h4 className="font-bold text-sm flex items-center text-teal-900">
                            <ShieldCheck size={16} className="mr-2 text-teal-700" />
                            แนวทางปฏิบัติการสำรองข้อมูลสำหรับระบบ Intranet โรงพยาบาล
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-700">
                            <li>แนะนำให้เจ้าหน้าที่ Admin กดส่งออกไฟล์สำรองข้อมูลอย่างน้อย <strong>สัปดาห์ละ 1 ครั้ง</strong> (ทุกวันศุกร์)</li>
                            <li>ให้นำไฟล์สำรองไปบันทึกไว้ในอุปกรณ์ภายนอก (Flash Drive หรือ External HDD) ที่ปลอดภัย</li>
                            <li>ระบบนี้ทำงานแบบ Offline ภายใน LAN/Intranet โดยสมบูรณ์ ไม่มีการส่งข้อมูลออกนอกเครือข่ายโรงพยาบาล</li>
                        </ul>
                    </div>

                    {/* Restore Confirmation Dialog */}
                    {pendingRestore && (
                        <div className="fixed inset-0 bg-slate-950/60 z-[150] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-200 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-900">ยืนยันการกู้คืนฐานข้อมูล</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        ระบบตรวจพบไฟล์สำรองของ <strong>{pendingRestore.hospital || 'รพ.สามชุก'}</strong>
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
                                    <div>📦 รายการพัสดุ: <strong>{pendingRestore.procurements?.length || 0}</strong> รายการ</div>
                                    <div>👤 บัญชีผู้ใช้: <strong>{pendingRestore.users?.length || 0}</strong> รายการ</div>
                                    <div>🕒 วันที่สำรอง: {new Date(pendingRestore.exportedAt).toLocaleDateString('th-TH')}</div>
                                    <div>✍️ ผู้สำรอง: {pendingRestore.exportedBy || '-'}</div>
                                </div>

                                <p className="text-[11px] text-rose-600 font-semibold text-center">
                                    ⚠️ คำเตือน: การกู้คืนจะเขียนทับข้อมูลปัจจุบัน กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                                </p>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setPendingRestore(null)}
                                        disabled={isRestoring}
                                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleConfirmRestore}
                                        disabled={isRestoring}
                                        className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-teal-900/10 cursor-pointer"
                                    >
                                        {isRestoring ? 'กำลังกู้คืน...' : 'ยืนยันกู้คืน'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-hidden">
                {/* 1. WORK GROUPS */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
                    <div className="p-3 bg-orange-50 border-b border-orange-100 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-orange-800 flex items-center text-sm"><Briefcase size={16} className="mr-2"/> 1. กลุ่มงาน</h3>
                    </div>
                    <div className="p-3 border-b border-slate-100 bg-white space-y-2">
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="ชื่อกลุ่มงานใหม่..." value={newWgName} onChange={e => setNewWgName(e.target.value)} />
                        <div className="flex space-x-2">
                            <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="ตัวย่อรันเลข (เช่น บห.)" value={newWgPrefix} onChange={e => setNewWgPrefix(e.target.value)} />
                            <button onClick={requestAddWg} disabled={!newWgName.trim()} className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {settings.workGroups.map(g => (
                            <div key={g.id} onClick={() => { if(editingId !== g.id) setSelectedWgId(g.id); }} className={`group flex items-center p-2.5 rounded-lg cursor-pointer border transition-all duration-200 ${selectedWgId === g.id ? 'bg-orange-50 border-orange-300 shadow-sm' : !g.isActive ? 'bg-red-50 border-red-100 opacity-60' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                {editingId === g.id ? (
                                    <div className="flex-1 space-y-1" onClick={e=>e.stopPropagation()}>
                                        <input className="w-full border rounded px-2 py-1 text-sm" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="ชื่อกลุ่มงาน" />
                                        <div className="flex space-x-1">
                                            <input className="flex-1 border rounded px-2 py-1 text-xs" value={editExtra} onChange={e => setEditExtra(e.target.value)} placeholder="ตัวย่อกลุ่มงาน" />
                                            <button onClick={() => requestUpdateWg(g.id)} className="p-1 bg-green-100 text-green-700 rounded"><Check size={14}/></button>
                                            <button onClick={() => setEditingId(null)} className="p-1 bg-slate-100 text-slate-500 rounded"><X size={14}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium truncate ${selectedWgId === g.id ? 'text-orange-900' : 'text-slate-700'}`}>{g.name}</div>
                                            <div className="text-[10px] text-slate-400">ตัวย่อกลุ่มงาน: <span className="font-bold text-orange-600">{g.prefix || '-'}</span></div>
                                        </div>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingId(g.id); setEditValue(g.name); setEditExtra(g.prefix || ''); }} className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-orange-600"><Edit2 size={12}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); requestToggleActive('WG', g); }} className={`p-1.5 hover:bg-white rounded ${g.isActive ? 'text-slate-400 hover:text-red-500' : 'text-red-500'}`}><Power size={12}/></button>
                                        </div>
                                        <ChevronRight size={16} className={`ml-1 transition-transform ${selectedWgId === g.id ? 'text-orange-500' : 'text-transparent'}`}/>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. DEPARTMENTS */}
                <div className={`flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden h-full transition-colors ${selectedWgId ? 'border-indigo-200' : 'border-slate-200 opacity-60'}`}>
                    <div className={`p-3 border-b flex justify-between items-center sticky top-0 z-10 ${selectedWgId ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-100 border-slate-200'}`}>
                        <h3 className={`font-bold flex items-center text-sm ${selectedWgId ? 'text-indigo-800' : 'text-slate-500'}`}><Building size={16} className="mr-2"/> 2. ฝ่าย/งาน</h3>
                    </div>
                    <div className="p-3 border-b border-slate-100 bg-white space-y-2">
                        {selectedWgId ? (
                            <>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ชื่อฝ่าย..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                                <div className="flex space-x-2">
                                    <input className="w-1/3 bg-slate-50 border border-slate-200 rounded-l-lg px-2 py-2 text-xs text-center outline-none" placeholder="ตัวย่อฝ่าย" value={newDeptPrefix} onChange={e => setNewDeptPrefix(e.target.value)}/>
                                    <input className="flex-1 bg-slate-50 border border-slate-200 px-2 py-2 text-xs font-mono outline-none" placeholder="สพ.๐๐๓๓..." value={newDeptReqPrefix} onChange={e => setNewDeptReqPrefix(e.target.value)}/>
                                    <button onClick={requestAddDept} className="bg-indigo-500 text-white px-3 rounded-r-lg"><Plus size={18}/></button>
                                </div>
                            </>
                        ) : <div className="text-center py-4 text-sm text-slate-400 italic">กรุณาเลือกกลุ่มงานก่อน</div>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {visibleDepartments.map(dept => (
                            <div key={dept.id} onClick={() => { if(editingId !== dept.id) setSelectedDeptId(dept.id); }} className={`group p-2.5 rounded-lg cursor-pointer border transition-all duration-200 ${selectedDeptId === dept.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : !dept.isActive ? 'bg-red-50 border-red-100 opacity-60' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                {editingId === dept.id ? (
                                    <div className="space-y-2" onClick={e=>e.stopPropagation()}>
                                        <input className="w-full border rounded px-2 py-1 text-sm" value={editValue} onChange={e => setEditValue(e.target.value)} />
                                        <div className="flex space-x-1">
                                            <input className="w-16 border rounded px-1 py-1 text-xs" value={editExtra} onChange={e => setEditExtra(e.target.value)} />
                                            <input className="flex-1 border rounded px-1 py-1 text-xs" value={editExtra2} onChange={e => setEditExtra2(e.target.value)} />
                                            <button onClick={() => requestUpdateDept(dept.id)} className="p-1 bg-green-100 text-green-700 rounded"><Check size={14}/></button>
                                            <button onClick={() => setEditingId(null)} className="p-1 bg-slate-100 text-slate-500 rounded"><X size={14}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center text-sm font-medium truncate">{dept.name} {dept.prefix && <span className="ml-2 text-[10px] bg-slate-100 px-1 rounded">{dept.prefix}</span>}</div>
                                            <div className="text-[10px] text-slate-400 font-mono truncate">{dept.requestPrefix || '-'}</div>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(dept.id); setEditValue(dept.name); setEditExtra(dept.prefix||''); setEditExtra2(dept.requestPrefix||''); }} className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-indigo-600"><Edit2 size={12}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); requestToggleActive('DEPT', dept); }} className={`p-1.5 hover:bg-white rounded ${dept.isActive ? 'text-slate-400 hover:text-red-500' : 'text-red-500'}`}><Power size={12}/></button>
                                            </div>
                                            <ChevronRight size={16} className={`transition-transform ${selectedDeptId === dept.id ? 'text-indigo-500' : 'text-transparent'}`}/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. CATEGORIES */}
                <div className={`flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden h-full transition-colors ${selectedDeptId ? 'border-green-200' : 'border-slate-200 opacity-60'}`}>
                    <div className={`p-3 border-b flex justify-between items-center sticky top-0 z-10 ${selectedDeptId ? 'bg-green-50 border-green-100' : 'bg-slate-100 border-slate-200'}`}>
                        <h3 className={`font-bold flex items-center text-sm ${selectedDeptId ? 'text-green-800' : 'text-slate-500'}`}><Layers size={16} className="mr-2"/> 3. หมวดพัสดุ</h3>
                    </div>
                    <div className="p-3 border-b border-slate-100 bg-white">
                        {selectedDeptId ? (
                            <div className="flex relative">
                                <input className="flex-1 bg-slate-50 border border-slate-200 rounded-l-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="ชื่อหมวดหมู่..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                                <button onClick={requestAddCat} className="bg-green-500 text-white px-3 rounded-r-lg"><Plus size={18}/></button>
                            </div>
                        ) : <div className="text-center py-4 text-sm text-slate-400 italic">กรุณาเลือกฝ่าย/งานก่อน</div>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {visibleCategories.map(cat => (
                            <div key={cat.id} className={`group flex items-center p-2.5 rounded-lg border transition-all ${!cat.isActive ? 'bg-red-50 border-red-100 opacity-60' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                                {editingId === cat.id ? (
                                    <div className="flex-1 flex items-center space-x-1" onClick={e=>e.stopPropagation()}>
                                        <input className="flex-1 border rounded px-2 py-1 text-sm" value={editValue} onChange={e => setEditValue(e.target.value)} />
                                        <button onClick={() => requestUpdateCat(cat.id)} className="p-1 bg-green-100 text-green-700 rounded"><Check size={14}/></button>
                                        <button onClick={() => setEditingId(null)} className="p-1 bg-slate-100 text-slate-500 rounded"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 text-sm font-medium text-slate-700">{cat.name}</div>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={12}/></button>
                                            <button onClick={() => requestToggleActive('CAT', cat)} className={`p-1.5 rounded hover:bg-slate-100 ${cat.isActive ? 'text-slate-400 hover:text-orange-500' : 'text-orange-500'}`}><Power size={12}/></button>
                                            <button onClick={() => requestDeleteCat(cat.id, cat.name)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"><Trash2 size={12}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}

            {confirmDialog && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center border border-slate-200">
                        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${confirmDialog.type === 'DELETE' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><HelpCircle size={24} /></div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
                        <p className="text-sm text-slate-500 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
                        <div className="flex space-x-3">
                            <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold">ยกเลิก</button>
                            <button onClick={confirmDialog.onConfirm} className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold shadow-md ${confirmDialog.type === 'DELETE' ? 'bg-red-600' : 'bg-blue-600'}`}>ยืนยัน</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
