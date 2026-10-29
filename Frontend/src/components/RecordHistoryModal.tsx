import React from 'react';
import { useApp } from '../services/store';
import { AuditLog, ProcurementRecord } from '../types';
import { 
    History, X, Clock, PlusCircle, Edit3, Trash2, 
    RefreshCw, Lock, Unlock, FileText, User as UserIcon,
    Shield
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface RecordHistoryModalProps {
    record: ProcurementRecord | null;
    onClose: () => void;
}

export const RecordHistoryModal: React.FC<RecordHistoryModalProps> = ({ record, onClose }) => {
    const { auditLogs } = useApp();

    if (!record) return null;

    // Filter audit logs belonging to this record
    const relatedLogs = auditLogs.filter(log => 
        log.recordId === record.id || 
        (log.requestId && record.requestId && log.requestId === record.requestId)
    );

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
                    label: 'ล็อคข้อมูล (ตรวจรับแล้ว)',
                    color: 'bg-amber-50 text-amber-900 border-amber-200',
                    icon: Lock
                };
            case 'UNLOCK':
                return {
                    label: 'ปลดล็อคข้อมูล',
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

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                            <History size={20} />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-base font-bold text-slate-900">ประวัติการแก้ไขรายการ (Audit Trail)</h3>
                                {record.isLocked && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                        <Lock size={10} />
                                        <span>ล็อค</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                เลขที่: <span className="font-bold text-slate-800">{record.requestId}</span> | {record.category}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Record Quick Summary */}
                <div className="px-5 py-3 bg-slate-100/60 border-b border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <div>
                        วงเงิน: <strong className="text-slate-900 font-mono">{formatCurrency(record.amount)}</strong>
                    </div>
                    <div>
                        บริษัท: <strong className="text-slate-900">{record.company || '-'}</strong>
                    </div>
                    <div>
                        วันที่ขอ: <strong className="text-slate-900">{record.requestDate}</strong>
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {relatedLogs.length === 0 ? (
                        <div className="text-center py-10 space-y-2 text-slate-400">
                            <Clock size={32} className="mx-auto opacity-30" />
                            <p className="text-sm font-medium text-slate-500">ยังไม่มีบันทึกประวัติการเปลี่ยนแปลงในระบบ</p>
                            <p className="text-xs text-slate-400">รายการนี้อาจถูกนำเข้าจากข้อมูลเดิมก่อนเปิดระบบ Audit Trail</p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                            {relatedLogs.map((log) => {
                                const badge = getActionBadge(log.action);
                                const Icon = badge.icon;
                                const dateStr = new Date(log.timestamp).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });

                                return (
                                    <div key={log.id} className="relative group">
                                        {/* Dot Indicator */}
                                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center text-teal-600 shadow-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                    <Icon size={12} />
                                                    <span>{badge.label}</span>
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                                                    <Clock size={11} className="inline mr-0.5" />
                                                    {dateStr}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                {log.details}
                                            </p>

                                            {/* Field Changes Table if available */}
                                            {log.changes && log.changes.length > 0 && (
                                                <div className="mt-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 space-y-1.5 text-xs">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">รายละเอียดฟิลด์ที่เปลี่ยน:</div>
                                                    {log.changes.map((ch, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-100">
                                                            <span className="font-semibold text-slate-600">{ch.label}:</span>
                                                            <div className="flex items-center space-x-1.5 font-mono">
                                                                <span className="text-rose-600 line-through bg-rose-50 px-1 rounded">{String(ch.oldValue ?? '-')}</span>
                                                                <span className="text-slate-400">→</span>
                                                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">{String(ch.newValue ?? '-')}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                                                <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                                                    <UserIcon size={12} className="text-slate-400" />
                                                    <span>{log.userName}</span>
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    ID: {log.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                        <Shield size={13} className="text-teal-600" />
                        <span>บันทึกความปลอดภัยตาม พ.ร.บ. จัดซื้อจัดจ้างฯ</span>
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
};
