import React, { useState } from 'react';
import { useApp } from '../services/store';
import { 
    Trash2, RefreshCw, AlertTriangle, ShieldAlert, Calendar, 
    User as UserIcon, Search, ArrowLeft, CheckCircle2, FileText,
    DollarSign, X
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface Props {
    onBack?: () => void;
}

const RecycleBinPage: React.FC<Props> = ({ onBack }) => {
    const { procurements, restoreProcurement, permanentDeleteProcurement, currentUser, users } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

    // Filter only deleted items
    const deletedItems = procurements.filter(p => p.isDeleted);

    const filteredItems = deletedItems.filter(item => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return true;
        return (
            item.requestId.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            (item.company && item.company.toLowerCase().includes(q)) ||
            (item.remarks && item.remarks.toLowerCase().includes(q))
        );
    });

    const handleRestore = async (id: string, requestId: string) => {
        const success = await restoreProcurement(id);
        if (success) {
            setActionMessage({ text: `กู้คืนรายการ ${requestId} กลับสู่ระบบสำเร็จ` });
            setTimeout(() => setActionMessage(null), 4000);
        } else {
            setActionMessage({ text: `ไม่สามารถกู้คืนรายการได้`, isError: true });
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handlePermanentDelete = async (id: string, requestId: string) => {
        const success = await permanentDeleteProcurement(id);
        setConfirmPermanentId(null);
        if (success) {
            setActionMessage({ text: `ลบรายการ ${requestId} ออกจากระบบถาวรเรียบร้อยแล้ว` });
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleRestoreAll = async () => {
        let count = 0;
        for (const item of deletedItems) {
            await restoreProcurement(item.id);
            count++;
        }
        setActionMessage({ text: `กู้คืนรายการทั้งหมด ${count} รายการกลับสู่ระบบปกติเรียบร้อยแล้ว` });
        setTimeout(() => setActionMessage(null), 4000);
    };

    const isAdmin = currentUser?.role === 'ADMIN';

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
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ถังขยะกู้คืนข้อมูล (Recycle Bin)</h2>
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                {deletedItems.length} รายการ
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            รายการที่ถูกลบออกจากทะเบียนคุมจะถูกเก็บไว้ที่นี่ เพื่อความปลอดภัยของข้อมูลราชการ (เฉพาะ Admin ที่สามารถกู้คืนหรือลบถาวรได้)
                        </p>
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    {deletedItems.length > 0 && (
                        <button
                            onClick={handleRestoreAll}
                            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <RefreshCw size={13} />
                            <span>กู้คืนทั้งหมด ({deletedItems.length})</span>
                        </button>
                    )}
                    <div className="relative w-full sm:w-72">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาเลขที่, หมวด, บริษัท..."
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification alert */}
            {actionMessage && (
                <div className={`p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-fade-in ${
                    actionMessage.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                    <CheckCircle2 size={18} />
                    <span>{actionMessage.text}</span>
                </div>
            )}

            {/* Content Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Trash2 size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                        <h4 className="text-base font-bold text-slate-700 mb-1">
                            {searchTerm ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ถังขยะว่างเปล่า'}
                        </h4>
                        <p className="text-xs text-slate-500">
                            ไม่มีรายการข้อมูลราชการที่ถูกลบอยู่ในระบบขณะนี้
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600 border-collapse">
                            <thead className="text-[11px] text-slate-700 uppercase bg-slate-100/90 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">เลขที่เอกสาร</th>
                                    <th className="px-4 py-3 whitespace-nowrap">หมวดพัสดุ / บริษัท</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">จำนวนเงิน (บาท)</th>
                                    <th className="px-4 py-3 whitespace-nowrap">วันที่ลบ / ผู้ลบ</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map(item => {
                                    const creator = users.find(u => u.id === item.createdBy)?.name || item.createdBy;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 align-top whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 font-mono">{item.requestId}</span>
                                                    <span className="text-[11px] text-slate-400 flex items-center mt-0.5">
                                                        <Calendar size={11} className="mr-1 inline" />
                                                        วันที่ขอ: {item.requestDate}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-semibold text-slate-800">{item.category}</div>
                                                {item.company && (
                                                    <div className="text-xs text-slate-500 mt-0.5">🏢 {item.company}</div>
                                                )}
                                                {item.remarks && (
                                                    <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.remarks}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-4 py-3 align-top text-xs text-slate-500 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-rose-700 font-semibold">
                                                        {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 mt-0.5">
                                                        โดย: {item.deletedBy || 'ไม่ระบุ'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleRestore(item.id, item.requestId)}
                                                        className="inline-flex items-center space-x-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                                        title="กู้คืนรายการนี้กลับสู่ทะเบียนคุม"
                                                    >
                                                        <RefreshCw size={13} className="text-teal-600" />
                                                        <span>กู้คืน</span>
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setConfirmPermanentId(item.id)}
                                                            className="inline-flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                                            title="ลบออกจากระบบถาวร"
                                                        >
                                                            <Trash2 size={13} className="text-rose-600" />
                                                            <span>ลบถาวร</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Permanent Delete Confirmation Dialog */}
            {confirmPermanentId && (() => {
                const target = filteredItems.find(i => i.id === confirmPermanentId);
                return (
                    <div className="fixed inset-0 bg-slate-950/60 z-[150] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-rose-100 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบถาวร</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    คุณกำลังจะลบรายการ <strong className="text-slate-800 font-mono">{target?.requestId}</strong> ออกจากระบบโรงพยาบาลอย่างถาวร ข้อมูลนี้จะไม่สามารถกู้คืนได้อีก
                                </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setConfirmPermanentId(null)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => target && handlePermanentDelete(target.id, target.requestId)}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-rose-600/20 cursor-pointer"
                                >
                                    ยืนยันลบถาวร
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default RecycleBinPage;
