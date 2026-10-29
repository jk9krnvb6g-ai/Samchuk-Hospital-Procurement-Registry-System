
import React, { useState } from 'react';
import { useApp } from '../services/store';
import { Plus, Trash2 } from 'lucide-react';

const ConsiderationPage: React.FC = () => {
    // Fix: Replaced addConsideration with upsertConsideration as per the updated store service
    const { considerations, upsertConsideration } = useApp();
    const [formData, setFormData] = useState({
        requestId: '',
        considerationNumber: '',
        considerationDate: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Fix: Call upsertConsideration with specific parameters
        await upsertConsideration(formData.requestId, formData.considerationNumber, formData.considerationDate);
        setFormData({ requestId: '', considerationNumber: '', considerationDate: '' });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">ทะเบียนคุมเลขพิจารณา</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="text-lg font-semibold mb-4 text-orange-600 flex items-center">
                        <Plus size={20} className="mr-2" /> ออกเลขพิจารณา
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่ใบขอ (อ้างอิง) *</label>
                            <input 
                                required
                                type="text"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="REQ-XXX"
                                value={formData.requestId}
                                onChange={e => setFormData({...formData, requestId: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เลขพิจารณา *</label>
                            <input 
                                required
                                type="text"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="CONS-XXX"
                                value={formData.considerationNumber}
                                onChange={e => setFormData({...formData, considerationNumber: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ออกเลข *</label>
                            <input 
                                required
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                value={formData.considerationDate}
                                onChange={e => setFormData({...formData, considerationDate: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-sm">
                            บันทึกข้อมูล
                        </button>
                    </form>
                </div>

                {/* Table List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-700">
                                <tr>
                                    <th className="px-6 py-3">เลขที่ใบขอ</th>
                                    <th className="px-6 py-3">เลขพิจารณา</th>
                                    <th className="px-6 py-3">วันที่</th>
                                </tr>
                            </thead>
                            <tbody>
                                {considerations.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูล</td></tr>
                                ) : (
                                    considerations.map(c => (
                                        <tr key={c.id} className="border-b border-slate-100">
                                            <td className="px-6 py-4 font-medium">{c.requestId}</td>
                                            <td className="px-6 py-4 text-orange-600 font-bold">{c.considerationNumber}</td>
                                            <td className="px-6 py-4">{c.considerationDate}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsiderationPage;
