
import React, { useState } from 'react';
import { useApp } from '../services/store';
import { ReceivingReport } from '../types';
import { Plus, Trash2, X, Check, Search } from 'lucide-react';

const ReceivingPage: React.FC = () => {
    const { receivings, procurements, upsertReceiving, deleteReceiving, considerations } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        receiveDate: '',
        deliveryNoteNo: '',
        requestId: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await upsertReceiving(formData.requestId, formData.deliveryNoteNo, formData.receiveDate);
        setIsModalOpen(false);
        setFormData({ receiveDate: '', deliveryNoteNo: '', requestId: '' });
    };

    // Helper to find linked procurement info
    const getLinkedInfo = (item: ReceivingReport) => {
        const parseFy = (dStr?: string) => {
            if (!dStr) return null;
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return null;
            return d.getMonth() >= 9 ? d.getFullYear() + 1 + 543 : d.getFullYear() + 543;
        };
        const itemFy = parseFy(item.receiveDate);
        const proc = item.procurementId 
            ? procurements.find(p => p.id === item.procurementId)
            : procurements.find(p => p.requestId === item.requestId && (itemFy ? parseFy(p.requestDate) === itemFy : true)) || procurements.find(p => p.requestId === item.requestId);
        const cons = item.procurementId 
            ? considerations.find(c => c.procurementId === item.procurementId)
            : considerations.find(c => c.requestId === item.requestId && (itemFy ? parseFy(c.considerationDate) === itemFy : true)) || considerations.find(c => c.requestId === item.requestId);
        return { proc, cons };
    };

    // Sort by createdAt descending (Newest first)
    const sortedReceivings = [...receivings].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ทะเบียนใบรับของ</h2>
                    <p className="text-sm text-slate-500">จัดการข้อมูลการตรวจรับพัสดุและเลขที่ใบส่งของ</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                    <Plus size={18} />
                    <span>บันทึกใบรับของ</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">วันที่รับของ</th>
                                <th className="px-4 py-3">เลขที่ใบส่งของ</th>
                                <th className="px-4 py-3">เลขที่ใบขอ</th>
                                <th className="px-4 py-3 bg-blue-50">เลขสั่งซื้อ/จ้าง</th>
                                <th className="px-4 py-3">หมวดพัสดุ</th>
                                <th className="px-4 py-3 text-right">จำนวนเงิน</th>
                                <th className="px-4 py-3 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedReceivings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                        ยังไม่มีรายการใบรับของ
                                    </td>
                                </tr>
                            ) : (
                                sortedReceivings.map((item) => {
                                    const { proc } = getLinkedInfo(item);
                                    return (
                                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">{item.receiveDate}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{item.deliveryNoteNo}</td>
                                            <td className="px-4 py-3 text-blue-600 font-mono">{item.requestId}</td>
                                            <td className="px-4 py-3 bg-blue-50 font-bold text-blue-800">
                                                {proc?.officialNumber || '-'}
                                            </td>
                                            {/* เปลี่ยนมาใช้ proc.category แทน item.category */}
                                            <td className="px-4 py-3 font-medium text-slate-700">
                                                {proc?.category || <span className="text-slate-300 italic">ไม่พบข้อมูลหมวด</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {proc?.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => deleteReceiving(item.id)} 
                                                    className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                                                    title="ลบรายการ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-800">บันทึกใบรับของ</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่ใบขอ (เพื่อดึงข้อมูล) *</label>
                                <div className="relative">
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        value={formData.requestId}
                                        onChange={e => setFormData({...formData, requestId: e.target.value})}
                                        placeholder="เช่น REQ-XXXXX"
                                    />
                                    <Search size={18} className="absolute right-3 top-2.5 text-slate-400" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">ระบบจะดึงหมวดพัสดุและราคามารวมอัตโนมัติ</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ใบรับของ *</label>
                                    <input 
                                        required
                                        type="date" 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.receiveDate}
                                        onChange={e => setFormData({...formData, receiveDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่ใบส่งของ *</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.deliveryNoteNo}
                                        onChange={e => setFormData({...formData, deliveryNoteNo: e.target.value})}
                                        placeholder="เช่น INV-001"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md flex items-center transition-all">
                                    <Check size={18} className="mr-2" />
                                    บันทึกข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivingPage;
