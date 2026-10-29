import React, { useState } from 'react';
import { useApp } from '../services/store';
import { 
    Shield, Search, Filter, Calendar, User as UserIcon, 
    ArrowLeft, History, FileText, CheckCircle2, Lock, Unlock, 
    Trash2, RefreshCw, PlusCircle, Edit3, X, Download
} from 'lucide-react';
import { AuditLog } from '../types';

interface Props {
    onBack?: () => void;
}

const AuditLogPage: React.FC<Props> = ({ onBack }) => {
    const { auditLogs } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('ALL');

    const filteredLogs = auditLogs.filter(log => {
        if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
            (log.requestId && log.requestId.toLowerCase().includes(q)) ||
            (log.userName && log.userName.toLowerCase().includes(q)) ||
            (log.details && log.details.toLowerCase().includes(q))
        );
    });

    const getActionBadge = (action: AuditLog['action']) => {
        switch (action) {
            case 'CREATE':
                return {
                    label: 'สร้างรายการใหม่',
                    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    icon: PlusCircle
                };
            case 'UPDATE':
                return {
                    label: 'แก้ไขข้อมูล',
                    color: 'bg-blue-50 text-blue-800 border-blue-200',
                    icon: Edit3
                };
            case 'SOFT_DELETE':
                return {
                    label: 'ย้ายลงถังขยะ',
                    color: 'bg-rose-50 text-rose-800 border-rose-200',
                    icon: Trash2
                };
            case 'RESTORE':
                return {
                    label: 'กู้คืนจากถังขยะ',
                    color: 'bg-teal-50 text-teal-800 border-teal-200',
                    icon: RefreshCw
                };
            case 'PERMANENT_DELETE':
                return {
                    label: 'ลบถาวร',
                    color: 'bg-slate-900 text-white border-slate-700',
                    icon: Trash2
                };
            case 'LOCK':
                return {
                    label: 'ล็อคข้อมูล',
                    color: 'bg-amber-50 text-amber-900 border-amber-200',
                    icon: Lock
                };
            case 'UNLOCK':
                return {
                    label: 'ปลดล็อค',
                    color: 'bg-purple-50 text-purple-900 border-purple-200',
                    icon: Unlock
                };
            default:
                return {
                    label: action,
                    color: 'bg-slate-100 text-slate-800 border-slate-200',
                    icon: FileText
                };
        }
    };

    const exportLogsToCsv = () => {
        const headers = ["ลำดับ", "วันเวลา", "การกระทำ", "เลขที่เอกสาร", "ผู้ทำรายการ", "รายละเอียด"];
        const rows = filteredLogs.map((log, idx) => [
            idx + 1,
            new Date(log.timestamp).toLocaleString('th-TH'),
            `"${log.action}"`,
            `"${log.requestId || '-'}"`,
            `"${log.userName}"`,
            `"${log.details.replace(/"/g, '""')}"`
        ].join(','));

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `บันทึกประวัติการใช้งาน_AuditLog_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 w-full max-w-[1400px] mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="ย้อนกลับ"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ประวัติการแก้ไขและกิจกรรมระบบ (Audit Trail)</h2>
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                {auditLogs.length} รายการ
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            บันทึกการกระทำทุกครั้งภายใน Intranet เพื่อความโปร่งใส ป้องกันการโต้แย้ง และรองรับการตรวจสอบของ สตง.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                        onClick={exportLogsToCsv}
                        className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
                        title="ดาวน์โหลดประวัติเป็นไฟล์ CSV"
                    >
                        <Download size={14} className="text-teal-600" />
                        <span>ส่งออก CSV</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1 flex items-center">
                        <Filter size={13} className="mr-1 text-teal-600" /> ประเภท:
                    </span>
                    {[
                        { id: 'ALL', label: 'ทั้งหมด' },
                        { id: 'CREATE', label: 'สร้างใหม่' },
                        { id: 'UPDATE', label: 'แก้ไข' },
                        { id: 'SOFT_DELETE', label: 'ลงถังขยะ' },
                        { id: 'RESTORE', label: 'กู้คืน' },
                        { id: 'LOCK', label: 'ล็อคข้อมูล' },
                        { id: 'UNLOCK', label: 'ปลดล็อค' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActionFilter(f.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                actionFilter === f.id
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาเลขที่, ผู้ทำ, รายละเอียด..."
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-8 pr-7 py-1.5 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Audit Log Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <History size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                        <h4 className="text-base font-bold text-slate-700 mb-1">ไม่พบประวัติการใช้งานที่ตรงกับเงื่อนไข</h4>
                        <p className="text-xs text-slate-500">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.map(log => {
                            const badge = getActionBadge(log.action);
                            const Icon = badge.icon;
                            return (
                                <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start space-x-3.5">
                                        <div className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${badge.color}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                {log.requestId && (
                                                    <span className="font-bold font-mono text-slate-900 text-xs sm:text-sm bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {log.requestId}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 flex items-center">
                                                    <Calendar size={11} className="mr-1 inline text-slate-400" />
                                                    {new Date(log.timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-800 font-medium">
                                                {log.details}
                                            </p>
                                            
                                            {/* Changes preview */}
                                            {log.changes && log.changes.length > 0 && (
                                                <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1 text-xs font-mono">
                                                    {log.changes.map((c, idx) => (
                                                        <div key={idx} className="flex items-center space-x-2 text-slate-600">
                                                            <span className="font-bold text-slate-800">{c.label}:</span>
                                                            <span className="text-rose-600 line-through">{String(c.oldValue || '-')}</span>
                                                            <span className="text-slate-400">➔</span>
                                                            <span className="text-emerald-700 font-bold">{String(c.newValue || '-')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* User metadata */}
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        <span className="font-semibold text-slate-700 flex items-center">
                                            <UserIcon size={12} className="mr-1 text-slate-400" />
                                            {log.userName}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.id.slice(-8)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogPage;
