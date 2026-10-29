import React, { useState, useMemo } from 'react';
import { useApp } from '../services/store';
import { RecordType } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { ShoppingCart, Briefcase, Archive, Wallet, ArrowUpRight, Clock, Filter, Calendar, Activity, TrendingUp } from 'lucide-react';

const getFiscalYear = (dateStr: string) => {
    if (!dateStr) return new Date().getFullYear() + 543;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().getFullYear() + 543;
    const month = date.getMonth(); 
    const year = date.getFullYear();
    return month >= 9 ? year + 1 + 543 : year + 543;
};

const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Dashboard: React.FC = () => {
    const { procurements, currentUser, settings } = useApp();

    const isAdminOrExec = currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE';

    // Role-based visibility
    const roleProcurements = useMemo(() => {
        if (isAdminOrExec || !currentUser) return procurements;
        const userDept = settings.departments.find(d => d.id === currentUser.departmentId);
        const userWgId = userDept?.workGroupId;
        return procurements.filter(item => {
            if (item.createdBy === currentUser.id) return true;
            if (item.departmentId && item.departmentId === currentUser.departmentId) return true;
            if (userWgId && item.departmentId) {
                const itemDept = settings.departments.find(d => d.id === item.departmentId);
                if (itemDept?.workGroupId === userWgId) return true;
            }
            return false;
        });
    }, [procurements, currentUser, settings.departments, isAdminOrExec]);

    const currentFiscalYear = useMemo(() => {
        const now = new Date();
        return now.getMonth() >= 9 ? now.getFullYear() + 1 + 543 : now.getFullYear() + 543;
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set<number>(roleProcurements.map(p => getFiscalYear(p.requestDate)));
        years.add(currentFiscalYear);
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [roleProcurements, currentFiscalYear]);

    const [selectedYear, setSelectedYear] = useState<number>(currentFiscalYear);

    const yearData = useMemo(() => {
        return roleProcurements.filter(p => getFiscalYear(p.requestDate) === selectedYear);
    }, [roleProcurements, selectedYear]);

    const purchase = yearData.filter(p => p.type === RecordType.PURCHASE);
    const hiring = yearData.filter(p => p.type === RecordType.HIRING);
    const other = yearData.filter(p => p.type === RecordType.OTHER);

    const totalPurchase = purchase.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalHiring = hiring.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalOther = other.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const grandTotal = totalPurchase + totalHiring + totalOther;

    const fiscalMonths = [
        { name: 'ต.ค.', monthIndex: 9 }, 
        { name: 'พ.ย.', monthIndex: 10 },
        { name: 'ธ.ค.', monthIndex: 11 },
        { name: 'ม.ค.', monthIndex: 0 },
        { name: 'ก.พ.', monthIndex: 1 },
        { name: 'มี.ค.', monthIndex: 2 },
        { name: 'เม.ย.', monthIndex: 3 },
        { name: 'พ.ค.', monthIndex: 4 },
        { name: 'มิ.ย.', monthIndex: 5 },
        { name: 'ก.ค.', monthIndex: 6 },
        { name: 'ส.ค.', monthIndex: 7 },
        { name: 'ก.ย.', monthIndex: 8 },
    ];

    const chartData = fiscalMonths.map((m) => {
        const filterByMonth = (items: typeof procurements) => 
            items.filter(item => {
                const date = new Date(item.requestDate);
                return date.getMonth() === m.monthIndex;
            }).reduce((acc, curr) => acc + Number(curr.amount), 0);

        return {
            name: m.name,
            จัดซื้อ: filterByMonth(purchase),
            จัดจ้าง: filterByMonth(hiring),
            อื่นๆ: filterByMonth(other),
        };
    });

    const categoryMap = new Map<string, number>();
    yearData.forEach(p => {
        const current = categoryMap.get(p.category) || 0;
        categoryMap.set(p.category, current + Number(p.amount));
    });

    const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const pieData = [
        { name: 'จัดซื้อ (PO)', value: totalPurchase },
        { name: 'จัดจ้าง (HO)', value: totalHiring },
        { name: 'อื่นๆ', value: totalOther }
    ].filter(d => d.value > 0);

    const COLORS = {
        purchase: '#0d9488', // Teal
        hiring: '#0f172a',   // Deep Navy
        other: '#f59e0b',    // Warm Amber
    };

    const PIE_COLORS = ['#0d9488', '#1e293b', '#f59e0b'];

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto animate-fade-in">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center space-x-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                            <Activity className="mr-2 text-teal-600 inline" size={24} />
                            Dashboard ภาพรวมระบบ
                        </h2>
                        {isAdminOrExec ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                👑 สิทธิ์ Admin: ข้อมูลทั้งโรงพยาบาล
                            </span>
                        ) : (
                            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                                👤 สิทธิ์เจ้าหน้าที่: {settings.departments.find(d => d.id === currentUser?.departmentId)?.name || 'กลุ่มงานของคุณ'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {isAdminOrExec 
                            ? 'สรุปภาพรวมงบประมาณและการจัดซื้อจัดจ้าง โรงพยาบาลสามชุก (ทุกหน่วยงาน)' 
                            : `สรุปภาพรวมเฉพาะหน่วยงานสังกัด ${settings.departments.find(d => d.id === currentUser?.departmentId)?.name || 'ของคุณ'}`}
                    </p>
                </div>
                
                {/* Fiscal Year Selector */}
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="flex items-center space-x-2 bg-white rounded-2xl border border-slate-200/80 px-3.5 py-2 shadow-sm hover:border-teal-300 transition-all w-full sm:w-auto">
                        <div className="bg-teal-50 p-1.5 rounded-lg text-teal-700">
                            <Filter size={15} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">ปีงบประมาณ</span>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer hover:text-teal-700 pr-3 mt-0.5"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>พ.ศ. {y} {y === currentFiscalYear ? '(ปัจจุบัน)' : ''}</option>
                                ))}
                            </select>
                        </div>
                        <Calendar size={15} className="text-slate-400" />
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Grand Total - Deep Navy Card */}
                <div className="bg-gradient-to-br from-[#0f172a] to-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-900/10 flex flex-col justify-between relative overflow-hidden border border-slate-800">
                    <div className="z-10">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">งบประมาณรวมทั้งสิ้น</span>
                        <h3 className="text-2xl font-bold mt-1 font-mono tracking-tight">{formatCurrency(grandTotal)} <span className="text-xs font-normal text-slate-300">บาท</span></h3>
                    </div>
                    <div className="z-10 mt-4 flex items-center text-xs text-teal-300 bg-teal-500/20 w-fit px-2.5 py-1 rounded-lg border border-teal-500/30">
                        <ArrowUpRight size={14} className="mr-1 stroke-[2.5]" />
                        <span className="font-semibold">{yearData.length} รายการทั้งหมด</span>
                    </div>
                    <Wallet className="absolute right-[-12px] bottom-[-12px] text-white/5 w-28 h-28 rotate-12 pointer-events-none" />
                </div>

                {/* Purchase Stats (Teal) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                                <ShoppingCart size={20} />
                            </div>
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-lg">{purchase.length} รายการ</span>
                        </div>
                        <span className="text-slate-500 text-xs font-medium">ยอดรวมจัดซื้อ (PO)</span>
                        <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalPurchase)} <span className="text-xs font-normal text-slate-400">บาท</span></h3>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: grandTotal > 0 ? `${(totalPurchase/grandTotal * 100)}%` : '0%' }}></div>
                    </div>
                </div>

                {/* Hiring Stats (Deep Slate) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                                <Briefcase size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">{hiring.length} รายการ</span>
                        </div>
                        <span className="text-slate-500 text-xs font-medium">ยอดรวมจัดจ้าง (HO)</span>
                        <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalHiring)} <span className="text-xs font-normal text-slate-400">บาท</span></h3>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-slate-800 h-full rounded-full transition-all" style={{ width: grandTotal > 0 ? `${(totalHiring/grandTotal * 100)}%` : '0%' }}></div>
                    </div>
                </div>

                {/* Other Stats (Warm Amber) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                                <Archive size={20} />
                            </div>
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">{other.length} รายการ</span>
                        </div>
                        <span className="text-slate-500 text-xs font-medium">ยอดรวมอื่นๆ</span>
                        <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalOther)} <span className="text-xs font-normal text-slate-400">บาท</span></h3>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full transition-all" style={{ width: grandTotal > 0 ? `${(totalOther/grandTotal * 100)}%` : '0%' }}></div>
                    </div>
                </div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Monthly Trend BarChart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-bold text-slate-900 flex items-center">
                            <Clock size={18} className="mr-2 text-teal-600"/> 
                            สถิติการใช้งบประมาณรายเดือน (ปี {selectedYear})
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis 
                                    fontSize={11} 
                                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toLocaleString()}k` : val} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{ fill: '#64748b' }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                                    formatter={(value: number) => [`${formatCurrency(value)} บาท`]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                                <Bar dataKey="จัดซื้อ" stackId="a" fill={COLORS.purchase} radius={[0, 0, 4, 4]} />
                                <Bar dataKey="จัดจ้าง" stackId="a" fill={COLORS.hiring} />
                                <Bar dataKey="อื่นๆ" stackId="a" fill={COLORS.other} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart & Top Categories */}
                <div className="flex flex-col gap-6">
                    {/* Ratio Donut */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">สัดส่วนงบประมาณตามประเภท</h3>
                        <div className="h-[210px] w-full relative">
                            {pieData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-xs">ยังไม่มีข้อมูล</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => [`${formatCurrency(value)} บาท`]}
                                            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex justify-center gap-4 text-xs mt-1">
                            <span className="flex items-center text-teal-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-teal-600 mr-1.5" />จัดซื้อ</span>
                            <span className="flex items-center text-slate-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-1.5" />จัดจ้าง</span>
                            <span className="flex items-center text-amber-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" />อื่นๆ</span>
                        </div>
                    </div>

                    {/* Top 5 Categories */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex-1">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                            <TrendingUp size={16} className="mr-1.5 text-teal-600" />
                            หมวดพัสดุยอดนิยม (Top 5)
                        </h3>
                        <div className="space-y-3">
                            {topCategories.length === 0 ? (
                                <p className="text-xs text-slate-400 py-4 text-center">ไม่มีข้อมูล</p>
                            ) : (
                                topCategories.map((cat, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-slate-700 truncate max-w-[180px]">{cat.name || 'ไม่ระบุ'}</span>
                                            <span className="text-slate-900 font-bold font-mono">{formatCurrency(cat.value)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-teal-600 h-full rounded-full" 
                                                style={{ width: `${(cat.value / (topCategories[0]?.value || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
