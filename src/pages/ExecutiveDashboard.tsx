import React, { useState, useMemo } from 'react';
import { useApp } from '../services/store';
import { RecordType } from '../types';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, 
    BarChart, Bar, Cell, PieChart as RePieChart, Pie
} from 'recharts';
import { 
    Wallet, TrendingUp, Clock, AlertCircle, Calendar, Filter, 
    ArrowUpRight, Award, Package, FileText, ListOrdered, Briefcase, 
    Layers, ChevronDown, Printer, CheckCircle2, ShieldCheck, 
    Building2, Users, AlertTriangle, CheckSquare2
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

const getFiscalYear = (dateStr: string): number => {
    if (!dateStr) return 2570;
    const clean = dateStr.split('T')[0].trim();
    const parts = clean.split(/[-\/]/);
    if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month)) {
            const fiscalYear = month >= 10 ? year + 1 : year;
            return fiscalYear + 543;
        }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 2570;
    return date.getMonth() >= 9 ? date.getFullYear() + 1 + 543 : date.getFullYear() + 543;
};

const formatCompactNumber = (number: number) => {
    return Intl.NumberFormat('th-TH', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
};

// Reusable Limit Selector Component
const LimitSelector = ({ value, onChange, label = "แสดง" }: { value: number, onChange: (v: number) => void, label?: string }) => (
    <div className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 transition-all hover:border-teal-300">
        <span className="text-slate-500 font-medium">{label}:</span>
        <select 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-right appearance-none pr-1"
        >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={9999}>ทั้งหมด</option>
        </select>
        <ChevronDown size={12} className="text-slate-400" />
    </div>
);

type QuarterKey = 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

const ExecutiveDashboard: React.FC = () => {
    const { procurements, receivings, settings, users } = useApp();

    const currentFiscalYear = useMemo(() => {
        const now = new Date();
        return now.getMonth() >= 9 ? now.getFullYear() + 1 + 543 : now.getFullYear() + 543;
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set<number>(procurements.map(p => getFiscalYear(p.requestDate)));
        years.add(currentFiscalYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [procurements, currentFiscalYear]);

    const [selectedYear, setSelectedYear] = useState<number>(currentFiscalYear);
    const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>('ALL');

    // --- Limit States ---
    const [wgLimit, setWgLimit] = useState<number>(10);
    const [deptLimit, setDeptLimit] = useState<number>(10);
    const [highValueLimit, setHighValueLimit] = useState<number>(10);

    // Filter by fiscal year first (exclude soft deleted items)
    const baseYearData = useMemo(() => {
        return procurements.filter(p => !p.isDeleted && getFiscalYear(p.requestDate) === selectedYear);
    }, [procurements, selectedYear]);

    // Helper: Determine Quarter of a date string (Fiscal months: Oct-Dec=Q1, Jan-Mar=Q2, Apr-Jun=Q3, Jul-Sep=Q4)
    const getQuarterOfDate = (dateStr: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' => {
        if (!dateStr) return 'Q1';
        const d = new Date(dateStr);
        const m = isNaN(d.getTime()) ? 0 : d.getMonth();
        if (m >= 9 && m <= 11) return 'Q1';
        if (m >= 0 && m <= 2) return 'Q2';
        if (m >= 3 && m <= 5) return 'Q3';
        return 'Q4';
    };

    // Filter by selected quarter
    const yearData = useMemo(() => {
        if (selectedQuarter === 'ALL') return baseYearData;
        return baseYearData.filter(p => getQuarterOfDate(p.requestDate) === selectedQuarter);
    }, [baseYearData, selectedQuarter]);

    // Optimize Receivings Lookup
    const receivedRequestIds = useMemo(() => {
        return new Set(receivings.map(r => r.requestId));
    }, [receivings]);

    // Separate Pending/Completed efficiently
    const { pendingProjects, completedProjects } = useMemo(() => {
        const pending = [];
        const completed = [];
        for (const p of yearData) {
            if (receivedRequestIds.has(p.requestId)) {
                completed.push(p);
            } else {
                pending.push(p);
            }
        }
        return { pendingProjects: pending, completedProjects: completed };
    }, [yearData, receivedRequestIds]);

    // --- KPIs Calculation ---
    const totalBudget = useMemo(() => yearData.reduce((acc, curr) => acc + Number(curr.amount), 0), [yearData]);
    const totalProjects = yearData.length;
    const pendingAmount = useMemo(() => pendingProjects.reduce((acc, curr) => acc + Number(curr.amount), 0), [pendingProjects]);
    const completedAmount = useMemo(() => completedProjects.reduce((acc, curr) => acc + Number(curr.amount), 0), [completedProjects]);

    const completionRate = totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 0;
    const pendingRate = totalProjects > 0 ? (pendingProjects.length / totalProjects) * 100 : 0;

    // PO vs HO Breakdown
    const poItems = useMemo(() => yearData.filter(p => p.type === RecordType.PURCHASE), [yearData]);
    const hoItems = useMemo(() => yearData.filter(p => p.type === RecordType.HIRING), [yearData]);
    const poTotal = useMemo(() => poItems.reduce((acc, curr) => acc + Number(curr.amount), 0), [poItems]);
    const hoTotal = useMemo(() => hoItems.reduce((acc, curr) => acc + Number(curr.amount), 0), [hoItems]);

    // High Value Items (>= 500,000 Baht)
    const highValueItems = useMemo(() => yearData.filter(p => Number(p.amount) >= 500000), [yearData]);
    const highValueTotal = useMemo(() => highValueItems.reduce((acc, curr) => acc + Number(curr.amount), 0), [highValueItems]);

    // --- Quarterly Performance Matrix Data (Q1 - Q4 of the selected fiscal year) ---
    const quarterlyStats = useMemo(() => {
        const qData: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { label: string; months: string; amount: number; count: number; completedCount: number }> = {
            Q1: { label: 'ไตรมาส 1', months: 'ต.ค. - ธ.ค.', amount: 0, count: 0, completedCount: 0 },
            Q2: { label: 'ไตรมาส 2', months: 'ม.ค. - มี.ค.', amount: 0, count: 0, completedCount: 0 },
            Q3: { label: 'ไตรมาส 3', months: 'เม.ย. - มิ.ย.', amount: 0, count: 0, completedCount: 0 },
            Q4: { label: 'ไตรมาส 4', months: 'ก.ค. - ก.ย.', amount: 0, count: 0, completedCount: 0 }
        };

        baseYearData.forEach(p => {
            const q = getQuarterOfDate(p.requestDate);
            qData[q].amount += Number(p.amount);
            qData[q].count++;
            if (receivedRequestIds.has(p.requestId)) {
                qData[q].completedCount++;
            }
        });

        const fullYearTotal = baseYearData.reduce((acc, curr) => acc + Number(curr.amount), 0) || 1;

        return (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(key => ({
            key,
            ...qData[key],
            percentOfAnnual: (qData[key].amount / fullYearTotal) * 100,
            completionRate: qData[key].count > 0 ? (qData[key].completedCount / qData[key].count) * 100 : 0
        }));
    }, [baseYearData, receivedRequestIds]);

    // --- Procurement Legal Methods Breakdown ---
    const methodStats = useMemo(() => {
        let smallCount = 0;  // <= 5,000 (ใบเสร็จ)
        let smallTotal = 0;
        let mediumCount = 0; // 5,001 - 500,000 (ใบสั่ง PO/HO)
        let mediumTotal = 0;
        let largeCount = 0;  // > 500,000 (e-Bidding / ประกวดราคา)
        let largeTotal = 0;

        yearData.forEach(p => {
            const amt = Number(p.amount);
            if (amt <= 5000) {
                smallCount++;
                smallTotal += amt;
            } else if (amt <= 500000) {
                mediumCount++;
                mediumTotal += amt;
            } else {
                largeCount++;
                largeTotal += amt;
            }
        });

        const totalAmt = totalBudget || 1;
        return [
            {
                name: 'เฉพาะเจาะจง (ไม่เกิน 5,000 บ.)',
                desc: 'ซื้อตรงตามใบเสร็จรับเงิน',
                count: smallCount,
                amount: smallTotal,
                percent: (smallTotal / totalAmt) * 100,
                color: 'from-blue-500 to-cyan-500',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
            },
            {
                name: 'เฉพาะเจาะจง (5,001 - 500,000 บ.)',
                desc: 'ออกใบสั่งซื้อ/สั่งจ้าง (PO/HO)',
                count: mediumCount,
                amount: mediumTotal,
                percent: (mediumTotal / totalAmt) * 100,
                color: 'from-teal-500 to-emerald-500',
                badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
            },
            {
                name: 'ประกวดราคา / e-Bidding (> 500,000 บ.)',
                desc: 'ประกวดราคาอิเล็กทรอนิกส์หรือคัดเลือก',
                count: largeCount,
                amount: largeTotal,
                percent: (largeTotal / totalAmt) * 100,
                color: 'from-amber-500 to-rose-500',
                badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
            }
        ];
    }, [yearData, totalBudget]);

    // --- Chart 1: Monthly Spending Trend ---
    const trendData = useMemo(() => {
        const fiscalMonths = [
            { name: 'ต.ค.', monthIndex: 9 }, { name: 'พ.ย.', monthIndex: 10 }, { name: 'ธ.ค.', monthIndex: 11 },
            { name: 'ม.ค.', monthIndex: 0 }, { name: 'ก.พ.', monthIndex: 1 }, { name: 'มี.ค.', monthIndex: 2 },
            { name: 'เม.ย.', monthIndex: 3 }, { name: 'พ.ค.', monthIndex: 4 }, { name: 'มิ.ย.', monthIndex: 5 },
            { name: 'ก.ค.', monthIndex: 6 }, { name: 'ส.ค.', monthIndex: 7 }, { name: 'ก.ย.', monthIndex: 8 },
        ];
        
        return fiscalMonths.map(m => {
            const monthlyTotal = baseYearData
                .filter(p => new Date(p.requestDate).getMonth() === m.monthIndex)
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { name: m.name, amount: monthlyTotal };
        });
    }, [baseYearData]);

    // --- Top 5 Spending Categories ---
    const topCategories = useMemo(() => {
        const catMap = new Map<string, number>();
        yearData.forEach(p => {
            const cat = p.category || 'ทั่วไป';
            catMap.set(cat, (catMap.get(cat) || 0) + Number(p.amount));
        });

        const total = totalBudget || 1;
        return Array.from(catMap.entries())
            .map(([name, value]) => ({ 
                name, 
                value, 
                percent: (value / total) * 100 
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [yearData, totalBudget]);

    // --- Top 5 Suppliers / Vendors ---
    const topVendors = useMemo(() => {
        const vendorMap = new Map<string, { total: number; count: number }>();
        yearData.forEach(p => {
            if (!p.company || !p.company.trim()) return;
            const comp = p.company.trim();
            const curr = vendorMap.get(comp) || { total: 0, count: 0 };
            vendorMap.set(comp, {
                total: curr.total + Number(p.amount),
                count: curr.count + 1
            });
        });

        const total = totalBudget || 1;
        return Array.from(vendorMap.entries())
            .map(([name, stat]) => ({
                name,
                total: stat.total,
                count: stat.count,
                percent: (stat.total / total) * 100
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [yearData, totalBudget]);

    // --- Work Group Breakdown List ---
    const { workGroupStats, maxWgTotal } = useMemo(() => {
        const deptToWgMap = new Map<string, string>();
        settings.departments.forEach(d => {
            if (d.workGroupId) deptToWgMap.set(d.id, d.workGroupId);
        });

        const wgNameMap = new Map<string, string>();
        settings.workGroups.forEach(g => wgNameMap.set(g.id, g.name));

        const stats = new Map<string, { id: string, name: string, purchase: number, hiring: number, other: number, total: number }>();

        settings.workGroups.filter(g => g.isActive).forEach(g => {
            stats.set(g.id, { id: g.id, name: g.name, purchase: 0, hiring: 0, other: 0, total: 0 });
        });

        const unknownKey = 'unknown';
        if (!stats.has(unknownKey)) {
            stats.set(unknownKey, { id: unknownKey, name: 'ไม่ระบุกลุ่มงาน', purchase: 0, hiring: 0, other: 0, total: 0 });
        }

        yearData.forEach(p => {
            const deptId = p.departmentId;
            let wgId = unknownKey;
            
            if (deptId && deptToWgMap.has(deptId)) {
                wgId = deptToWgMap.get(deptId)!;
            }

            if (!stats.has(wgId)) {
                const name = wgNameMap.get(wgId) || 'ไม่ระบุกลุ่มงาน';
                stats.set(wgId, { id: wgId, name, purchase: 0, hiring: 0, other: 0, total: 0 });
            }

            const entry = stats.get(wgId)!;
            const amount = Number(p.amount);

            if (p.type === RecordType.PURCHASE) entry.purchase += amount;
            else if (p.type === RecordType.HIRING) entry.hiring += amount;
            else entry.other += amount;
            
            entry.total += amount;
        });

        const list = Array.from(stats.values())
            .filter(item => item.total > 0)
            .sort((a, b) => b.total - a.total);
        
        const max = list.length > 0 ? list[0].total : 0;

        return { workGroupStats: list, maxWgTotal: max };
    }, [yearData, settings.departments, settings.workGroups]);

    const visibleWorkGroups = workGroupStats.slice(0, wgLimit);

    // --- Department Running Number Status ---
    const deptRunningStats = useMemo(() => {
        const userDeptMap = new Map<string, string>();
        users.forEach(u => {
            if (u.departmentId) userDeptMap.set(u.id, u.departmentId);
        });

        const statsMap = new Map<string, { count: number, maxNum: number, latestStr: string }>();

        yearData.forEach(p => {
            if (!p.officialNumber) return;
            let deptId = p.departmentId;
            if (!deptId) deptId = userDeptMap.get(p.createdBy);
            if (!deptId) return;

            if (!statsMap.has(deptId)) {
                statsMap.set(deptId, { count: 0, maxNum: 0, latestStr: '-' });
            }
            const stat = statsMap.get(deptId)!;
            stat.count++;
            const parts = p.officialNumber.split('/');
            const numPart = parts[0]?.match(/(\d+)$/); 
            if (numPart) {
                const val = parseInt(numPart[1], 10);
                if (val > stat.maxNum) {
                    stat.maxNum = val;
                    stat.latestStr = p.officialNumber;
                }
            }
        });

        const results = settings.departments.map(dept => {
            const stat = statsMap.get(dept.id);
            return {
                id: dept.id,
                name: dept.name,
                prefix: dept.prefix,
                count: stat ? stat.count : 0,
                latestNumber: stat ? stat.latestStr : '-'
            };
        });
        return results.sort((a, b) => b.count - a.count);
    }, [settings.departments, yearData, users]);

    const visibleDeptStats = deptRunningStats.slice(0, deptLimit);

    // --- High Value Items (All, sorted) ---
    const allHighValueItems = useMemo(() => {
        return [...yearData]
            .sort((a, b) => Number(b.amount) - Number(a.amount));
    }, [yearData]);

    const visibleHighValueItems = allHighValueItems.slice(0, highValueLimit);

    const CHART_COLORS = ['#0d9488', '#0284c7', '#6366f1', '#f59e0b', '#ec4899'];

    return (
        <div className="p-4 sm:p-8 space-y-8 animate-fade-in pb-24 bg-slate-50/70 font-sans max-w-[1600px] mx-auto">
            {/* Executive Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100/80 text-teal-800 border border-teal-200 uppercase tracking-wide">
                            🏥 รพ.สามชุก สุพรรณบุรี
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Executive Intelligence Suite</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                        Executive Dashboard
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        ระบบสารสนเทศติดตามการบริหารงบประมาณและการจัดซื้อจัดจ้างสำหรับผู้บริหารระดับสูง
                    </p>
                </div>
                
                {/* Year, Quarter & Print Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto no-print">
                    {/* Fiscal Year Dropdown */}
                    <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1 shadow-inner">
                        <div className="px-2.5 py-1 flex items-center space-x-1.5 border-r border-slate-200 text-slate-500">
                            <Calendar size={14} className="text-teal-600" />
                            <span className="text-[11px] font-bold uppercase">ปีงบประมาณ</span>
                        </div>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-1.5 text-xs font-bold text-teal-900 bg-transparent outline-none cursor-pointer hover:bg-white rounded-xl transition-colors font-mono"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>พ.ศ. {y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Quarter Filter Pills */}
                    <div className="inline-flex rounded-2xl p-1 bg-slate-100 border border-slate-200 shadow-inner text-xs font-bold">
                        {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
                            <button
                                key={q}
                                onClick={() => setSelectedQuarter(q)}
                                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                    selectedQuarter === q
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {q === 'ALL' ? 'ทั้งปี' : q}
                            </button>
                        ))}
                    </div>

                    {/* Print Executive Report */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer ml-auto sm:ml-0"
                        title="พิมพ์รายงานสรุปผู้บริหาร (One-Page Executive Summary)"
                    >
                        <Printer size={14} />
                        <span>พิมพ์สรุป</span>
                    </button>
                </div>
            </div>

            {/* 4 High-Impact KPI Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* 1. Total Budget */}
                <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-teal-950 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden group border border-slate-800">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                        <Wallet size={80} />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-teal-300 text-xs font-bold uppercase tracking-wider flex items-center">
                            <TrendingUp size={13} className="mr-1.5" /> งบประมาณรวม
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                            {selectedQuarter === 'ALL' ? 'ทั้งปี' : selectedQuarter}
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight font-mono text-white">
                        {formatCompactNumber(totalBudget)} <span className="text-sm font-normal text-slate-300">บาท</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                        ยอดเต็ม: {formatCurrency(totalBudget)}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 font-medium">
                        <span>PO จัดซื้อ: <strong className="text-teal-300 font-mono">{formatCompactNumber(poTotal)}</strong></span>
                        <span>HO จัดจ้าง: <strong className="text-amber-300 font-mono">{formatCompactNumber(hoTotal)}</strong></span>
                    </div>
                </div>

                {/* 2. Disbursed & Completed */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center">
                                <CheckSquare2 size={13} className="mr-1.5" /> ตรวจรับแล้ว (Disbursed)
                            </span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                                {formatCompactNumber(completedAmount)} <span className="text-sm font-normal text-slate-400">บาท</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <Award size={22} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                            <span>อัตราสำเร็จ (Execution Rate)</span>
                            <span className="text-emerald-700 font-bold">{completionRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(completionRate, 100)}%` }}></div>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
                        <span>ตรวจรับเสร็จสิ้น:</span>
                        <strong className="text-slate-800 font-mono">{completedProjects.length} / {totalProjects} รายการ</strong>
                    </p>
                </div>

                {/* 3. Pending Commitments */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center">
                                <Clock size={13} className="mr-1.5" /> ภาระผูกพัน / รอตรวจรับ
                            </span>
                            <h3 className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">
                                {formatCompactNumber(pendingAmount)} <span className="text-sm font-normal text-slate-400">บาท</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <Clock size={22} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                            <span>สัดส่วนคงค้าง</span>
                            <span className="text-amber-700 font-bold">{pendingRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pendingRate, 100)}%` }}></div>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
                        <span>รายการค้างตรวจรับ:</span>
                        <strong className="text-amber-800 font-mono">{pendingProjects.length} รายการ</strong>
                    </p>
                </div>

                {/* 4. High Value Threshold (>= 500,000 Baht) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-rose-700 text-xs font-bold uppercase tracking-wider flex items-center">
                                <ShieldCheck size={13} className="mr-1.5" /> สัญญา $\ge$ 500,000 บ.
                            </span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                                {highValueItems.length} <span className="text-sm font-normal text-slate-400">โครงการ</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                            <Package size={22} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        มูลค่ารวม: <strong className="text-slate-900 font-mono">{formatCurrency(highValueTotal)}</strong>
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>สัดส่วนในงบรวม:</span>
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 font-mono">
                            {totalBudget > 0 ? ((highValueTotal / totalBudget) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>

            </div>

            {/* Quarterly Spending Matrix (ผลงาน 4 ไตรมาสของปีงบประมาณ) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                            <Layers size={18} className="mr-2 text-teal-600" />
                            ผลงานการใช้จ่ายงบประมาณแยก 4 ไตรมาส (Quarterly Performance Matrix)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            ข้อมูลสำหรับรายงานต่อ สสจ. / เขตสุขภาพ / กรมสนับสนุนบริการสุขภาพ
                        </p>
                    </div>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                        ปีงบประมาณ พ.ศ. {selectedYear}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quarterlyStats.map(q => {
                        const isSelected = selectedQuarter === q.key;
                        return (
                            <div 
                                key={q.key}
                                onClick={() => setSelectedQuarter(isSelected ? 'ALL' : q.key)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative ${
                                    isSelected 
                                    ? 'bg-teal-50/80 border-teal-400 shadow-md ring-2 ring-teal-500/20' 
                                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">{q.label}</h4>
                                        <p className="text-[11px] text-slate-400 font-medium">{q.months}</p>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-mono">
                                        {q.percentOfAnnual.toFixed(1)}% ของปี
                                    </span>
                                </div>

                                <div className="pt-1">
                                    <span className="text-xs text-slate-500">มูลค่าที่ขอซื้อ/จ้าง</span>
                                    <div className="text-xl font-bold font-mono text-slate-900">
                                        {formatCompactNumber(q.amount)} <span className="text-xs font-normal text-slate-500">บาท</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                    <span>{q.count} โครงการ</span>
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                        ตรวจรับแล้ว {q.completionRate.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Procurement Legal Method Breakdown (สัดส่วนวิธีจัดหาตามระเบียบ พ.ร.บ. 2560) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                            <ShieldCheck size={18} className="mr-2 text-teal-600" />
                            การกระจายตัวตามวิธีจัดซื้อจัดจ้าง (พ.ร.บ. การจัดซื้อจัดจ้างฯ 2560)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            ตรวจสอบเกณฑ์วงเงินเพื่อป้องกันความเสี่ยงการแบ่งซื้อแบ่งจ้าง
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {methodStats.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                    {idx + 1}. วิธีจัดหา
                                </span>
                                <span className="text-xs font-bold font-mono text-slate-700">
                                    {item.percent.toFixed(1)}%
                                </span>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.name}</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${Math.min(item.percent, 100)}%` }}></div>
                            </div>
                            <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between text-xs">
                                <span className="text-slate-500 font-medium">{item.count} รายการ</span>
                                <span className="font-bold text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Section: Monthly Trend & Top Categories / Top Vendors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Monthly Spending Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                                <TrendingUp size={18} className="mr-2 text-teal-600" />
                                แนวโน้มการใช้จ่ายงบประมาณรายเดือน (12 เดือน)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">รอบปีงบประมาณ พ.ศ. {selectedYear} (เริ่ม ต.ค. - ก.ย.)</p>
                        </div>
                    </div>
                    <div className="h-[280px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="execColorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => formatCompactNumber(val)} />
                                <ReTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                                    formatter={(value: number) => [formatCurrency(value), 'ยอดรวมเดือนนี้']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#execColorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Top 5 Spending Categories */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-base font-bold text-slate-900 flex items-center">
                            <Award size={18} className="mr-2 text-teal-600" />
                            5 หมวดพัสดุที่ใช้จ่ายสูงสุด
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">สัดส่วนในงวดเวลาที่เลือก</p>
                    </div>

                    <div className="space-y-3 pt-1">
                        {topCategories.length > 0 ? (
                            topCategories.map((cat, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                            {idx + 1}. {cat.name}
                                        </span>
                                        <span className="font-mono font-bold text-slate-900">
                                            {formatCompactNumber(cat.value)} <span className="text-[10px] text-slate-400">({cat.percent.toFixed(1)}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500" 
                                            style={{ 
                                                width: `${Math.min(cat.percent, 100)}%`,
                                                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic py-6 text-center">ไม่มีข้อมูลพัสดุ</p>
                        )}
                    </div>
                </div>

            </div>

            {/* Bottom Row: Work Group Breakdown & Top Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Work Group Analysis */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                                <Briefcase size={18} className="mr-2 text-teal-600" />
                                งบประมาณแยกตามกลุ่มงาน
                            </h3>
                            <LimitSelector value={wgLimit} onChange={setWgLimit} />
                        </div>
                        <div className="flex space-x-3 text-[11px] font-medium text-slate-600">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />PO ซื้อ</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />HO จ้าง</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />อื่นๆ</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {visibleWorkGroups.length > 0 ? visibleWorkGroups.map((wg, index) => {
                            const totalPercent = maxWgTotal > 0 ? (wg.total / maxWgTotal) * 100 : 0;
                            const poPercent = wg.total > 0 ? (wg.purchase / wg.total) * 100 : 0;
                            const hoPercent = wg.total > 0 ? (wg.hiring / wg.total) * 100 : 0;
                            const otherPercent = wg.total > 0 ? (wg.other / wg.total) * 100 : 0;

                            return (
                                <div key={wg.id} className="group">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <div className="flex items-center">
                                            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-2.5 ${index < 3 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {index + 1}
                                            </span>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800">{wg.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{formatCurrency(wg.total)}</span>
                                        </div>
                                    </div>

                                    <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                                        <div className="h-full flex rounded-full overflow-hidden transition-all duration-500 ease-out" style={{ width: `${Math.max(totalPercent, 1)}%` }}>
                                            {poPercent > 0 && <div className="h-full bg-blue-500 hover:bg-blue-400" style={{ width: `${poPercent}%` }} title={`จัดซื้อ: ${formatCurrency(wg.purchase)}`}></div>}
                                            {hoPercent > 0 && <div className="h-full bg-purple-500 hover:bg-purple-400" style={{ width: `${hoPercent}%` }} title={`จัดจ้าง: ${formatCurrency(wg.hiring)}`}></div>}
                                            {otherPercent > 0 && <div className="h-full bg-amber-500 hover:bg-amber-400" style={{ width: `${otherPercent}%` }} title={`อื่นๆ: ${formatCurrency(wg.other)}`}></div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-8 text-center text-slate-400 italic">ไม่มีข้อมูลการใช้จ่าย</div>
                        )}
                    </div>
                </div>

                {/* 2. Top Suppliers / Vendors */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                                <Building2 size={18} className="mr-2 text-teal-600" />
                                5 บริษัทคู่สัญญาที่สั่งซื้อสูงสุด (Top Vendors)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">วิเคราะห์ความคุ้มค่าและการกระจายการจัดซื้อ</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-2.5">ชื่อบริษัท/ร้านค้า</th>
                                    <th className="px-3 py-2.5 text-center">จำนวนสัญญา</th>
                                    <th className="px-3 py-2.5 text-right">ยอดรวม (บาท)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topVendors.length > 0 ? (
                                    topVendors.map((vendor, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-3 font-semibold text-slate-800">
                                                <div className="flex items-center space-x-2">
                                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="truncate max-w-[200px]">{vendor.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-mono font-medium">
                                                {vendor.count} สัญญา
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-slate-900 font-mono">
                                                {formatCurrency(vendor.total)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูลคู่สัญญา</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Department Running Status & High Value Items Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Department Running Numbers */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-slate-900 flex items-center">
                                <ListOrdered size={18} className="mr-2 text-teal-600" />
                                สถานะการออกเลขรายฝ่าย/งาน
                            </h3>
                            <LimitSelector value={deptLimit} onChange={setDeptLimit} />
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">หน่วยงาน</th>
                                    <th className="px-4 py-3 text-center">ตัวย่อ</th>
                                    <th className="px-4 py-3 text-center">ออกแล้ว</th>
                                    <th className="px-4 py-3 text-right">เลขที่ล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleDeptStats.map((dept, idx) => (
                                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2.5 font-medium text-slate-800">
                                            {idx + 1}. {dept.name}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-slate-500 font-mono">
                                            {dept.prefix || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${dept.count > 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {dept.count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 font-mono">
                                            {dept.latestNumber !== '-' ? dept.latestNumber : <span className="text-slate-300">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Top High Value Projects */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-slate-900 flex items-center">
                                <AlertCircle size={18} className="mr-2 text-rose-500" />
                                รายการจัดซื้อ/จ้างวงเงินสูงสุด
                            </h3>
                            <LimitSelector value={highValueLimit} onChange={setHighValueLimit} />
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">วันที่</th>
                                    <th className="px-4 py-3">รายการ / คู่สัญญา</th>
                                    <th className="px-4 py-3 text-right">วงเงิน (บาท)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleHighValueItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                                            {item.requestDate}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-slate-900 truncate max-w-[200px]">{item.company || item.category}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{item.requestId}</div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExecutiveDashboard;
