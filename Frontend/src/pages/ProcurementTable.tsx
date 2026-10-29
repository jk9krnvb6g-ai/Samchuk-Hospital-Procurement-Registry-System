import React, { useState, useMemo } from 'react';
import { useApp } from '../services/store';
import { ProcurementRecord, RecordType } from '../types';
import { 
    Search, Plus, Trash2, Edit2, Check, AlertCircle, FileSpreadsheet, 
    Printer, X, Loader2, Calendar, User as UserIcon,
    LayoutList, AlignJustify, CheckCircle2, Clock, DollarSign,
    ChevronRight, Eye, Building2, FileText, ArrowRight,
    Filter, Sparkles, Tag, ShieldCheck, SlidersHorizontal,
    CheckSquare, Square, Layers, Info, Lock, Unlock, History
} from 'lucide-react';
import { thaiBahtText } from '../utils/thaiBaht';
import { getProcurementMethod } from '../utils/thaiBahtText';
import { highlightMatch } from '../utils/highlightMatch';
import { RecordHistoryModal } from '../components/RecordHistoryModal';

interface Props {
    type: RecordType;
    title: string;
}

const getFiscalYear = (dateStr: string): string => {
    if (!dateStr) return '-';
    const clean = dateStr.split('T')[0].trim();
    const parts = clean.split(/[-\/]/);
    if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month)) {
            const fiscalYear = month >= 10 ? year + 1 : year;
            return String(fiscalYear + 543);
        }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const month = date.getMonth(); 
    const year = date.getFullYear();
    const fiscalYear = month >= 9 ? year + 1 : year;
    return String(fiscalYear + 543);
};

const getCurrentFiscalYear = (): number => {
    const now = new Date();
    const month = now.getMonth(); 
    const year = now.getFullYear();
    const fiscalYear = month >= 9 ? year + 1 : year;
    return fiscalYear + 543;
};

const extractRequestNumber = (requestId: string) => {
    if (!requestId) return 0;
    const normalized = requestId.replace(/[๐-๙]/g, d => "๐๑๒๓๔๕๖๗๘๙".indexOf(d).toString());
    const match = normalized.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
};

type FilterChipType = 'ALL' | 'WAITING_CONSIDERATION' | 'WAITING_RECEIVING' | 'COMPLETED' | 'MY_ITEMS' | 'HIGH_VALUE';

const ProcurementTable: React.FC<Props> = ({ type, title }) => {
    const { procurements, addProcurement, updateProcurement, deleteProcurement, getLinkedData, upsertConsideration, upsertReceiving, settings, currentUser, users, auditLogs, toggleLockProcurement } = useApp();
    
    // --- Fiscal Year Filter State ---
    const currentFiscalYear = useMemo(() => getCurrentFiscalYear(), []);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(() => String(getCurrentFiscalYear()));
    
    // --- Data Density State ---
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

    // --- WorkGroup Filter (สำหรับ Admin / Executive เลือกดูรายกลุ่มงาน หรือดูภาพรวมทั้งหมด) ---
    const [selectedWorkGroupId, setSelectedWorkGroupId] = useState<string>('ALL');

    // --- Smart Filter Chip State ---
    const [activeFilterChip, setActiveFilterChip] = useState<FilterChipType>('ALL');

    // --- Slide-over Drawer State ---
    const [drawerRecord, setDrawerRecord] = useState<ProcurementRecord | null>(null);

    // Dynamically calculate available fiscal years
    const availableFiscalYears = useMemo(() => {
        const yearsSet = new Set<string>();
        yearsSet.add(String(currentFiscalYear));
        
        procurements.filter(p => p.type === type).forEach(p => {
            const fy = getFiscalYear(p.requestDate);
            if (fy && fy !== '-') yearsSet.add(String(fy));
        });

        return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    }, [procurements, type, currentFiscalYear]);

    // --- Modals State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [alertModal, setAlertModal] = useState<{ show: boolean, message: string, isWarning: boolean } | null>(null);
    
    // Quick Date Modal States
    const [quickDateTarget, setQuickDateTarget] = useState<ProcurementRecord | null>(null);
    const [quickDateValue, setQuickDateValue] = useState('');
    const [quickDateType, setQuickDateType] = useState<'CONSIDERATION' | 'RECEIVING' | null>(null);
    const [existingDocNumber, setExistingDocNumber] = useState<string | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);

    // --- Search & Pagination State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // --- Multi-Row Selection State ---
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // --- Column Visibility State ---
    const [visibleColumns, setVisibleColumns] = useState({
        year: true,
        category: true,
        requestId: true,
        officialNumber: true,
        consideration: true,
        receiving: true,
        status: true,
        itemCount: true,
        amount: true,
        remarks: true,
        createdBy: true,
    });
    const [isColMenuOpen, setIsColMenuOpen] = useState(false);
    const [historyRecord, setHistoryRecord] = useState<ProcurementRecord | null>(null);

    const toggleColumn = (key: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [formData, setFormData] = useState({
        requestId: '',
        requestDate: '',
        category: '',
        itemCount: 0,
        amount: 0,
        company: '',
        remarks: '',
        considerationNumber: '',
        considerationDate: '',
        officialNumber: ''
    });

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'ไม่ระบุ';

    const hasValue = (val: string | null | undefined) => {
        return !!(val && val.trim() !== '' && val.trim() !== '-');
    };

    // Unique Vendor List for Autocomplete
    const uniqueVendors = useMemo(() => {
        const set = new Set<string>();
        procurements.forEach(p => {
            if (p.company && p.company.trim()) set.add(p.company.trim());
        });
        return Array.from(set).sort();
    }, [procurements]);

    // Base records after applying Role-based visibility and Year / WorkGroup filters
    const yearFilteredData = useMemo(() => {
        let data = procurements.filter(p => p.type === type && !p.isDeleted);

        // 1. Role-based Visibility:
        // Admin and Executive can see ALL records of the hospital!
        const isAdminOrExec = currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE';
        
        if (!isAdminOrExec && currentUser) {
            // Regular user: can see records of their department, workgroup, or created by themselves
            const userDept = settings.departments.find(d => d.id === currentUser.departmentId);
            const userWgId = userDept?.workGroupId;
            
            data = data.filter(item => {
                // If created by this user
                if (item.createdBy === currentUser.id) return true;
                // If same department
                if (item.departmentId && item.departmentId === currentUser.departmentId) return true;
                // If same work group
                if (userWgId && item.departmentId) {
                    const itemDept = settings.departments.find(d => d.id === item.departmentId);
                    if (itemDept?.workGroupId === userWgId) return true;
                }
                return false;
            });
        }

        // 2. Fiscal Year filter
        if (selectedFiscalYear !== 'ALL') {
            data = data.filter(item => String(getFiscalYear(item.requestDate)) === String(selectedFiscalYear));
        }

        // 3. Workgroup filter (for Admin / Executive)
        if (isAdminOrExec && selectedWorkGroupId !== 'ALL') {
            data = data.filter(item => {
                const itemDept = settings.departments.find(d => d.id === item.departmentId);
                return itemDept?.workGroupId === selectedWorkGroupId;
            });
        }

        return data;
    }, [procurements, type, currentUser, settings.departments, selectedFiscalYear, selectedWorkGroupId]);

    // Calculate Chip Counts
    const chipCounts = useMemo(() => {
        let waitingCons = 0;
        let waitingRecv = 0;
        let completed = 0;
        let myItems = 0;
        let highValue = 0;

        yearFilteredData.forEach(item => {
            const linked = getLinkedData(item.requestId, item.requestDate, item.id);
            const hasCons = hasValue(linked.consideration?.considerationNumber);
            const hasRecv = hasValue(linked.receiving?.deliveryNoteNo);

            if (!hasCons) waitingCons++;
            else if (!hasRecv) waitingRecv++;
            else completed++;

            if (item.createdBy === currentUser?.id) myItems++;
            if (Number(item.amount) >= 500000) highValue++;
        });

        return {
            all: yearFilteredData.length,
            waitingCons,
            waitingRecv,
            completed,
            myItems,
            highValue
        };
    }, [yearFilteredData, getLinkedData, currentUser]);

    // Data Processing with Smart Filter Chips & Search
    const processedData = useMemo(() => {
        let data = [...yearFilteredData];

        // 1. Smart Filter Chip
        if (activeFilterChip === 'WAITING_CONSIDERATION') {
            data = data.filter(item => {
                const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                return !hasValue(linked.consideration?.considerationNumber);
            });
        } else if (activeFilterChip === 'WAITING_RECEIVING') {
            data = data.filter(item => {
                const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                return hasValue(linked.consideration?.considerationNumber) && !hasValue(linked.receiving?.deliveryNoteNo);
            });
        } else if (activeFilterChip === 'COMPLETED') {
            data = data.filter(item => {
                const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                return hasValue(linked.consideration?.considerationNumber) && hasValue(linked.receiving?.deliveryNoteNo);
            });
        } else if (activeFilterChip === 'MY_ITEMS') {
            data = data.filter(item => item.createdBy === currentUser?.id);
        } else if (activeFilterChip === 'HIGH_VALUE') {
            data = data.filter(item => Number(item.amount) >= 500000);
        }

        // 2. Search Filter
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(item => {
                const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                const userName = getUserName(item.createdBy).toLowerCase();
                const fiscalYear = getFiscalYear(item.requestDate);

                return (
                    (item.requestId && item.requestId.toLowerCase().includes(lowerTerm)) ||
                    (item.requestDate && item.requestDate.includes(lowerTerm)) ||
                    (item.category && item.category.toLowerCase().includes(lowerTerm)) ||
                    (item.company && item.company.toLowerCase().includes(lowerTerm)) ||
                    (item.remarks && item.remarks.toLowerCase().includes(lowerTerm)) ||
                    (item.officialNumber && item.officialNumber.toLowerCase().includes(lowerTerm)) ||
                    (String(item.amount).includes(lowerTerm)) ||
                    (userName.includes(lowerTerm)) ||
                    (String(fiscalYear).includes(lowerTerm)) ||
                    (linked.consideration?.considerationNumber && linked.consideration.considerationNumber.toLowerCase().includes(lowerTerm)) ||
                    (linked.consideration?.considerationDate && linked.consideration.considerationDate.includes(lowerTerm)) ||
                    (linked.receiving?.deliveryNoteNo && linked.receiving.deliveryNoteNo.toLowerCase().includes(lowerTerm)) ||
                    (linked.receiving?.receiveDate && linked.receiving.receiveDate.includes(lowerTerm))
                );
            });
        }

        // 3. Sort Logic
        return data.sort((a, b) => {
            const numA = extractRequestNumber(a.requestId);
            const numB = extractRequestNumber(b.requestId);
            if (numB !== numA) return numB - numA;
            return b.createdAt - a.createdAt;
        });
    }, [yearFilteredData, activeFilterChip, searchTerm, getLinkedData, currentUser, users]);

    // Summary Statistics for current filtered view
    const summaryStats = useMemo(() => {
        let totalAmount = 0;
        let completedCount = 0;
        let pendingCount = 0;

        processedData.forEach(item => {
            totalAmount += Number(item.amount) || 0;
            const linked = getLinkedData(item.requestId, item.requestDate, item.id);
            const hasCons = hasValue(linked.consideration?.considerationNumber);
            const hasRecv = hasValue(linked.receiving?.deliveryNoteNo);
            if (hasCons && hasRecv) {
                completedCount++;
            } else {
                pendingCount++;
            }
        });

        return {
            totalCount: processedData.length,
            totalAmount,
            completedCount,
            pendingCount
        };
    }, [processedData, getLinkedData]);

    // Pagination calculations
    const totalPages = Math.ceil(processedData.length / (itemsPerPage === -1 ? processedData.length || 1 : itemsPerPage));
    const paginatedData = useMemo(() => {
        if (itemsPerPage === -1) return processedData;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedData.slice(startIndex, startIndex + itemsPerPage);
    }, [processedData, currentPage, itemsPerPage]);

    // Dynamic Labels
    let fieldLabels = {
        requestId: "กำหนดขอบเขตงานขอซื้อ / วันที่",
        officialNumber: "เลขสั่งซื้อ",
        considerationLabel: "รายงานขอซื้อ / วันที่",
        receivingLabel: "ผลพิจารณาขอซื้อ / วันที่"
    };

    if (type === RecordType.HIRING) {
        fieldLabels = {
            requestId: "กำหนดขอบเขตงานขอจ้าง / วันที่",
            officialNumber: "เลขสั่งจ้าง",
            considerationLabel: "รายงานขอจ้าง / วันที่",
            receivingLabel: "ผลพิจารณาขอจ้าง / วันที่"
        };
    } else if (type === RecordType.OTHER) {
        fieldLabels = {
            requestId: "กำหนดขอบเขตงาน / วันที่",
            officialNumber: "เลขสั่งซื้อ/จ้าง",
            considerationLabel: "รายงานขอ / วันที่",
            receivingLabel: "ผลพิจารณา / วันที่"
        };
    }

    // Professional Medical Theme Palette
    const theme = (() => {
        switch (type) {
            case RecordType.HIRING:
                return { 
                    name: 'navy', 
                    bgSoft: 'bg-slate-100/70', 
                    bgDeep: 'bg-[#0f172a]', 
                    bgHover: 'hover:bg-slate-800', 
                    text: 'text-slate-800', 
                    border: 'border-slate-300', 
                    ring: 'focus:ring-slate-700', 
                    accent: 'from-slate-800 to-slate-950',
                    pill: 'bg-slate-100 text-slate-800' 
                };
            case RecordType.OTHER:
                return { 
                    name: 'amber', 
                    bgSoft: 'bg-amber-50/60', 
                    bgDeep: 'bg-amber-700', 
                    bgHover: 'hover:bg-amber-800', 
                    text: 'text-amber-800', 
                    border: 'border-amber-200', 
                    ring: 'focus:ring-amber-600', 
                    accent: 'from-amber-600 to-amber-800',
                    pill: 'bg-amber-50 text-amber-900 border border-amber-200' 
                };
            default:
                return { 
                    name: 'teal', 
                    bgSoft: 'bg-teal-50/60', 
                    bgDeep: 'bg-teal-700', 
                    bgHover: 'hover:bg-teal-800', 
                    text: 'text-teal-900', 
                    border: 'border-teal-200', 
                    ring: 'focus:ring-teal-600', 
                    accent: 'from-teal-600 to-emerald-700',
                    pill: 'bg-teal-50 text-teal-900 border border-teal-200' 
                };
        }
    })();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirmSave = async () => {
        if (editingId) {
            updateProcurement(editingId, { ...formData });
            setShowConfirm(false);
            closeModal();
        } else {
            const result = await addProcurement({ ...formData, requestId: '', type: type });
            if (result.success) {
                setShowConfirm(false);
                closeModal();
            } else {
                setShowConfirm(false);
                setAlertModal({
                    show: true,
                    message: result.message || 'เกิดข้อผิดพลาดในการบันทึก',
                    isWarning: !!result.isWarning
                });
            }
        }
    };

    const handleForceSave = async () => {
        const result = await addProcurement({ ...formData, requestId: '', type: type }, true);
        if (result.success) {
            setAlertModal(null);
            closeModal();
        } else {
            setAlertModal({
                show: true,
                message: result.message || 'เกิดข้อผิดพลาดในการบันทึก',
                isWarning: !!result.isWarning
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        const record = procurements.find(p => p.id === id);
        if (!record) return;
        if (record.isLocked && currentUser?.role !== 'ADMIN') {
            setAlertModal({ 
                show: true, 
                message: '🔒 เอกสารนี้ถูกล็อคข้อมูล (ตรวจรับสมบูรณ์แล้ว)\nเพื่อความถูกต้องตามระเบียบพัสดุและการเงิน จึงไม่อนุญาตให้ลบ ยกเว้นผู้ดูแลระบบ (Admin) จะปลดล็อค', 
                isWarning: false 
            });
            return;
        }
        if (record.createdBy !== currentUser?.id && currentUser?.role !== 'ADMIN') {
            setAlertModal({ show: true, message: 'คุณไม่มีสิทธิ์ลบรายการนี้ (เฉพาะผู้บันทึกข้อมูลหรือ Admin เท่านั้น)', isWarning: false });
            return;
        }
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteProcurement(deleteId);
            setDeleteId(null);
            if (drawerRecord?.id === deleteId) {
                setDrawerRecord(null);
            }
        }
    };

    const openNew = () => {
        setEditingId(null);
        setFormData({ 
            requestId: '', 
            requestDate: new Date().toISOString().split('T')[0], 
            category: '', 
            itemCount: 1, 
            amount: 0, 
            company: '', 
            remarks: '', 
            considerationNumber: '', 
            considerationDate: '',
            officialNumber: ''
        });
        setIsModalOpen(true);
    };

    const openEdit = (record: ProcurementRecord) => {
        if (record.isLocked && currentUser?.role !== 'ADMIN') {
            setAlertModal({ 
                show: true, 
                message: '🔒 เอกสารนี้ถูกล็อคข้อมูล (ตรวจรับสมบูรณ์แล้ว)\nเพื่อความถูกต้องตามระเบียบพัสดุและการเงิน จึงไม่อนุญาตให้แก้ไขตัวเลข ยกเว้นผู้ดูแลระบบ (Admin) จะปลดล็อค', 
                isWarning: false 
            });
            return;
        }
        if (record.createdBy !== currentUser?.id && currentUser?.role !== 'ADMIN') {
            setAlertModal({ show: true, message: 'คุณไม่มีสิทธิ์แก้ไขรายการนี้ (เฉพาะผู้บันทึกข้อมูลหรือ Admin เท่านั้น)', isWarning: false });
            return;
        }
        const linked = getLinkedData(record.requestId, record.requestDate, record.id);
        setEditingId(record.id);
        setFormData({
            requestId: record.requestId,
            requestDate: record.requestDate,
            category: record.category,
            itemCount: record.itemCount,
            amount: record.amount,
            company: record.company,
            remarks: record.remarks,
            considerationNumber: linked.consideration?.considerationNumber || '',
            considerationDate: linked.consideration?.considerationDate || '',
            officialNumber: record.officialNumber || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setShowConfirm(false);
    };

    const handleSaveQuickDate = async () => {
        if (quickDateTarget && quickDateValue && quickDateType) {
            setIsSaving(true);
            let success = false;
            if (quickDateType === 'CONSIDERATION') {
                success = await upsertConsideration(
                    quickDateTarget.requestId, 
                    existingDocNumber, 
                    quickDateValue, 
                    quickDateTarget.id, 
                    quickDateTarget.requestDate
                );
            } else if (quickDateType === 'RECEIVING') {
                success = await upsertReceiving(
                    quickDateTarget.requestId, 
                    existingDocNumber, 
                    quickDateValue, 
                    quickDateTarget.id, 
                    quickDateTarget.requestDate
                );
            }
            
            setIsSaving(false);
            if (success) {
                // If drawer is currently showing this item, keep it updated
                if (drawerRecord && drawerRecord.id === quickDateTarget.id) {
                    // Update trigger handled by re-render
                }
                setQuickDateTarget(null);
                setQuickDateValue('');
                setQuickDateType(null);
                setExistingDocNumber(null);
            } else {
                setAlertModal({ show: true, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', isWarning: false });
            }
        }
    };

    const exportToExcel = () => {
        const headers = [
            "ปีงบประมาณ", "หมวดพัสดุ", fieldLabels.requestId, "วันที่ใบขอ",
            fieldLabels.officialNumber, fieldLabels.considerationLabel, "วันที่รายงานขอ",
            fieldLabels.receivingLabel, "วันที่ผลพิจารณา", "รายการ", "จำนวนเงิน",
            "บริษัท/ร้านค้า", "หมายเหตุ", "ผู้บันทึก", "กลุ่มงาน", "ฝ่าย"
        ];

        const rows = processedData.map(item => {
            const linked = getLinkedData(item.requestId, item.requestDate, item.id);
            const user = users.find(u => u.id === item.createdBy);
            const dept = settings.departments.find(d => d.id === user?.departmentId);
            const wg = settings.workGroups.find(g => g.id === dept?.workGroupId);
            return [
                getFiscalYear(item.requestDate),
                `"${(item.category || '').replace(/"/g, '""')}"`,
                `"${(item.requestId || '').replace(/"/g, '""')}"`,
                `"${item.requestDate || ''}"`,
                `"${(item.officialNumber || '').replace(/"/g, '""')}"`,
                `"${(linked.consideration?.considerationNumber || '').replace(/"/g, '""')}"`,
                `"${linked.consideration?.considerationDate || ''}"`,
                `"${(linked.receiving?.deliveryNoteNo || '').replace(/"/g, '""')}"`,
                `"${linked.receiving?.receiveDate || ''}"`,
                item.itemCount || 0,
                item.amount || 0,
                `"${(item.company || '').replace(/"/g, '""')}"`,
                `"${(item.remarks || '').replace(/"/g, '""')}"`,
                `"${(user?.name || '').replace(/"/g, '""')}"`,
                `"${(wg?.name || '').replace(/"/g, '""')}"`,
                `"${(dept?.name || '').replace(/"/g, '""')}"`
            ].join(',');
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${title}_${selectedFiscalYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Multi-select batch handlers
    const isAllCurrentSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item.id));
    
    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isAllCurrentSelected) {
                paginatedData.forEach(item => next.delete(item.id));
            } else {
                paginatedData.forEach(item => next.add(item.id));
            }
            return next;
        });
    };

    const toggleSelectOne = (id: string, e: React.SyntheticEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBatchExportExcel = () => {
        const selectedRecords = yearFilteredData.filter(i => selectedIds.has(i.id));
        if (selectedRecords.length === 0) return;
        
        const headers = [
            "ปีงบประมาณ", "หมวดพัสดุ", fieldLabels.requestId, "วันที่ใบขอ",
            fieldLabels.officialNumber, fieldLabels.considerationLabel, "วันที่รายงานขอ",
            fieldLabels.receivingLabel, "วันที่ผลพิจารณา", "รายการ", "จำนวนเงิน",
            "บริษัท/ร้านค้า", "หมายเหตุ", "ผู้บันทึก"
        ];

        const rows = selectedRecords.map(item => {
            const linked = getLinkedData(item.requestId, item.requestDate, item.id);
            const user = users.find(u => u.id === item.createdBy);
            return [
                getFiscalYear(item.requestDate),
                `"${item.category || ''}"`,
                `"${item.requestId}"`,
                item.requestDate,
                `"${item.officialNumber || ''}"`,
                `"${linked.consideration?.considerationNumber || ''}"`,
                linked.consideration?.considerationDate || '',
                `"${linked.receiving?.deliveryNoteNo || ''}"`,
                linked.receiving?.receiveDate || '',
                item.itemCount || 1,
                item.amount,
                `"${(item.company || '').replace(/"/g, '""')}"`,
                `"${(item.remarks || '').replace(/"/g, '""')}"`,
                `"${user?.name || ''}"`
            ].join(',');
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ทะเบียนคุม_เฉพาะที่เลือก_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 w-full max-w-[1700px] mx-auto animate-fade-in space-y-4">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 5mm; }
                    body { font-size: 9pt !important; background: white !important; }
                    .no-print { display: none !important; }
                    table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt !important; table-layout: auto !important; }
                    th, td { border: 1px solid #ccc !important; padding: 3px 5px !important; }
                }
            `}</style>

            {/* Official Print Header */}
            <div className="hidden print:block text-center pb-4 border-b border-slate-300 mb-4">
                <h1 className="text-lg font-bold text-slate-900">โรงพยาบาลสามชุก สำนักงานสาธารณสุขจังหวัดสุพรรณบุรี</h1>
                <h2 className="text-base font-bold text-slate-800">{title} ประจำปีงบประมาณ {selectedFiscalYear}</h2>
                <p className="text-xs text-slate-600">ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Page Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {selectedFiscalYear === 'ALL' ? 'แสดงทุกปีงบประมาณ' : `ปีงบประมาณ ${selectedFiscalYear}`}
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Data Density Toggle */}
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setDensity('comfortable')}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                density === 'comfortable' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="มุมมองโปร่งสบาย"
                        >
                            <AlignJustify size={14} />
                            <span className="hidden md:inline">โปร่งตา</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDensity('compact')}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                density === 'compact' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="มุมมองกะทัดรัด"
                        >
                            <LayoutList size={14} />
                            <span className="hidden md:inline">กะทัดรัด</span>
                        </button>
                    </div>

                    {/* Column Visibility Toggle */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                            title="เลือกคอลัมน์ที่ต้องการแสดง"
                        >
                            <SlidersHorizontal size={14} className="text-teal-600" />
                            <span className="hidden sm:inline">คอลัมน์</span>
                        </button>
                        {isColMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-fade-in text-xs space-y-1">
                                <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100 font-bold text-slate-800">
                                    <span className="flex items-center">
                                        <Layers size={13} className="mr-1.5 text-teal-600" />
                                        เลือกคอลัมน์ที่แสดง
                                    </span>
                                    <button onClick={() => setIsColMenuOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5">✕</button>
                                </div>
                                {[
                                    { key: 'year', label: 'ปีงบประมาณ' },
                                    { key: 'category', label: 'หมวดพัสดุ' },
                                    { key: 'requestId', label: fieldLabels.requestId },
                                    { key: 'officialNumber', label: fieldLabels.officialNumber },
                                    { key: 'consideration', label: fieldLabels.considerationLabel },
                                    { key: 'receiving', label: fieldLabels.receivingLabel },
                                    { key: 'status', label: 'สถานะงาน' },
                                    { key: 'itemCount', label: 'จำนวนรายการ' },
                                    { key: 'amount', label: 'จำนวนเงิน' },
                                    { key: 'remarks', label: 'หมายเหตุ / ผู้ขาย' },
                                    { key: 'createdBy', label: 'ผู้บันทึก' },
                                ].map(col => (
                                    <label key={col.key} className="flex items-center space-x-2 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={visibleColumns[col.key as keyof typeof visibleColumns]} 
                                            onChange={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                                            className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                        />
                                        <span className="text-slate-700 truncate">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={exportToExcel} className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all">
                        <FileSpreadsheet size={15} />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button onClick={() => window.print()} className="flex items-center justify-center space-x-1.5 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all">
                        <Printer size={15} />
                        <span className="hidden sm:inline">พิมพ์ PDF</span>
                    </button>
                    <button onClick={openNew} className={`flex items-center justify-center space-x-1.5 ${theme.bgDeep} ${theme.bgHover} text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-slate-900/10 transition-all`}>
                        <Plus size={16} className="stroke-[2.5]" />
                        <span>บันทึกใหม่</span>
                    </button>
                </div>
            </div>

            {/* --- Mini Summary Cards Strip --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 border border-teal-100">
                        <LayoutList size={18} />
                    </div>
                    <div>
                        <span className="text-[11px] font-medium text-slate-500">จำนวนเรื่องในมุมมองนี้</span>
                        <p className="text-base font-bold text-slate-900 font-mono">{summaryStats.totalCount} <span className="text-[11px] font-normal text-slate-400">เรื่อง</span></p>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200">
                        <DollarSign size={18} />
                    </div>
                    <div className="overflow-hidden">
                        <span className="text-[11px] font-medium text-slate-500">วงเงินรวม</span>
                        <p className="text-base font-bold text-slate-900 font-mono truncate">{Number(summaryStats.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-[11px] font-normal text-slate-400">บ.</span></p>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <span className="text-[11px] font-medium text-slate-500">ดำเนินการครบถ้วน</span>
                        <p className="text-base font-bold text-emerald-700 font-mono">{summaryStats.completedCount} <span className="text-[11px] font-normal text-slate-400">เรื่อง</span></p>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <Clock size={18} />
                    </div>
                    <div>
                        <span className="text-[11px] font-medium text-slate-500">รอดำเนินการต่อ</span>
                        <p className="text-base font-bold text-amber-700 font-mono">{summaryStats.pendingCount} <span className="text-[11px] font-normal text-slate-400">เรื่อง</span></p>
                    </div>
                </div>
            </div>

            {/* --- 🌟 Smart Filter Chips (แถบปุ่มกรองด่วนอัจฉริยะ) --- */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center whitespace-nowrap pl-1">
                    <Filter size={13} className="mr-1 text-teal-600" /> ตัวกรองด่วน:
                </span>

                <button
                    onClick={() => { setActiveFilterChip('ALL'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'ALL'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <span>ทั้งหมด</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {chipCounts.all}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveFilterChip('WAITING_CONSIDERATION'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'WAITING_CONSIDERATION'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                    }`}
                >
                    <Clock size={12} className="stroke-[2.5]" />
                    <span>รอรายงานขอ</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'WAITING_CONSIDERATION' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        {chipCounts.waitingCons}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveFilterChip('WAITING_RECEIVING'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'WAITING_RECEIVING'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white text-teal-800 hover:bg-teal-50 border border-teal-200'
                    }`}
                >
                    <Clock size={12} className="stroke-[2.5]" />
                    <span>รอผลพิจารณา</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'WAITING_RECEIVING' ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'}`}>
                        {chipCounts.waitingRecv}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveFilterChip('COMPLETED'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                >
                    <CheckCircle2 size={12} className="stroke-[2.5]" />
                    <span>เสร็จสมบูรณ์</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        {chipCounts.completed}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveFilterChip('MY_ITEMS'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'MY_ITEMS'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
                    }`}
                >
                    <UserIcon size={12} />
                    <span>เฉพาะของฉัน</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'MY_ITEMS' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                        {chipCounts.myItems}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveFilterChip('HIGH_VALUE'); setCurrentPage(1); }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeFilterChip === 'HIGH_VALUE'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
                    }`}
                >
                    <Sparkles size={12} />
                    <span>เกิน 5 แสน</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeFilterChip === 'HIGH_VALUE' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'}`}>
                        {chipCounts.highValue}
                    </span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 no-print">
                <div className="flex items-center flex-wrap gap-2.5">
                    {/* Fiscal Year Filter Selector */}
                    <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-sm">
                        <Calendar size={17} className="text-teal-600 flex-shrink-0" />
                        <span className="whitespace-nowrap">ปีงบประมาณ:</span>
                    </div>
                    <select 
                        value={selectedFiscalYear} 
                        onChange={(e) => { setSelectedFiscalYear(e.target.value); setCurrentPage(1); }}
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer transition-all hover:bg-slate-100 shadow-sm"
                    >
                        {availableFiscalYears.map(fy => {
                            const isCurrent = Number(fy) === currentFiscalYear;
                            return (
                                <option key={fy} value={fy}>
                                    ปีงบ {fy} {isCurrent ? '(ปีปัจจุบัน)' : ''}
                                </option>
                            );
                        })}
                        <option value="ALL">ทุกปีงบประมาณ (แสดงทั้งหมด)</option>
                    </select>

                    {/* WorkGroup Filter for Admin & Executive */}
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE') ? (
                        <div className="flex items-center space-x-2 pl-1">
                            <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-sm">
                                <Building2 size={16} className="text-teal-600 flex-shrink-0" />
                                <span className="whitespace-nowrap">กลุ่มงาน:</span>
                            </div>
                            <select
                                value={selectedWorkGroupId}
                                onChange={(e) => { setSelectedWorkGroupId(e.target.value); setCurrentPage(1); }}
                                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer transition-all hover:bg-slate-100 shadow-sm"
                            >
                                <option value="ALL">ทุกกลุ่มงานใน รพ. (เห็นทั้งหมด)</option>
                                {settings.workGroups.filter(wg => wg.isActive).map(wg => (
                                    <option key={wg.id} value={wg.id}>
                                        {wg.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                            <ShieldCheck size={13} className="text-teal-600 mr-1" />
                            <span>ขอบเขต: {settings.departments.find(d => d.id === currentUser?.departmentId)?.name || 'กลุ่มงานของคุณ'}</span>
                        </div>
                    )}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white block w-full pl-10 pr-8 py-2 outline-none transition-all placeholder:text-slate-400" 
                        placeholder="ค้นหาเลขที่, หมวด, บริษัท..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Container with Sticky Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden w-full flex flex-col">
                <div className="w-full overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto hidden md:block">
                    <table className={`w-full ${density === 'compact' ? 'text-xs' : 'text-sm'} text-left text-slate-600 table-auto border-collapse`}>
                        <thead className="text-[11px] text-slate-700 uppercase bg-slate-100/95 sticky top-0 z-10 backdrop-blur-md border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-2 py-3 text-center whitespace-nowrap w-[32px] no-print">
                                    <input 
                                        type="checkbox" 
                                        checked={isAllCurrentSelected} 
                                        onChange={toggleSelectAll}
                                        className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                                        title="เลือกทั้งหมดในหน้านี้"
                                    />
                                </th>
                                {visibleColumns.year && <th className="px-2.5 py-3 text-center whitespace-nowrap w-[4%]">ปีงบฯ</th>}
                                {visibleColumns.category && <th className="px-3 py-3 whitespace-nowrap w-[9%]">หมวดพัสดุ</th>}
                                {visibleColumns.requestId && <th className="px-3 py-3 whitespace-nowrap w-[11%]">{fieldLabels.requestId}</th>}
                                {visibleColumns.officialNumber && <th className={`px-3 py-3 ${theme.bgSoft} whitespace-nowrap w-[9%]`}>{fieldLabels.officialNumber}</th>}
                                {visibleColumns.consideration && <th className="px-3 py-3 bg-amber-50/70 whitespace-nowrap text-amber-900 font-bold w-[11%]">{fieldLabels.considerationLabel}</th>}
                                {visibleColumns.receiving && <th className="px-3 py-3 bg-teal-50/70 whitespace-nowrap text-teal-900 font-bold w-[11%]">{fieldLabels.receivingLabel}</th>}
                                {visibleColumns.status && <th className="px-2.5 py-3 text-center whitespace-nowrap w-[7%]">สถานะงาน</th>}
                                {visibleColumns.itemCount && <th className="px-2 py-3 text-center whitespace-nowrap w-[3%]">รายการ</th>}
                                {visibleColumns.amount && <th className="px-3 py-3 text-right whitespace-nowrap w-[9%]">จำนวนเงิน (บาท)</th>}
                                {visibleColumns.remarks && <th className="px-3 py-3 w-[15%]">หมายเหตุ / คู่สัญญา</th>}
                                {visibleColumns.createdBy && <th className="px-3 py-3 w-[11%]">ผู้บันทึก</th>}
                                <th className="px-3 py-3 text-center no-print w-[6%]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Calendar size={32} className="opacity-30 text-slate-400" />
                                            <p className="font-medium text-slate-500">ไม่พบรายการข้อมูลในเงื่อนไขที่เลือก</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item) => {
                                    const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                                    const isOwner = item.createdBy === currentUser?.id || currentUser?.role === 'ADMIN';
                                    const user = users.find(u => u.id === item.createdBy);
                                    const dept = settings.departments.find(d => d.id === user?.departmentId);
                                    const wg = settings.workGroups.find(g => g.id === dept?.workGroupId);
                                    const rowPadding = density === 'compact' ? 'py-1.5 px-2.5' : 'py-3 px-3';
                                    const isSelected = selectedIds.has(item.id);

                                    const hasCons = hasValue(linked.consideration?.considerationNumber);
                                    const hasRecv = hasValue(linked.receiving?.deliveryNoteNo);
                                    const stepCount = 1 + (hasCons ? 1 : 0) + (hasRecv ? 1 : 0);

                                    return (
                                        <tr 
                                            key={item.id} 
                                            className={`transition-colors group cursor-pointer ${
                                                isSelected ? 'bg-teal-50/70 hover:bg-teal-100/60' : 'hover:bg-slate-50/80'
                                            }`}
                                            onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.closest('button') || target.closest('input')) return;
                                                setDrawerRecord(item);
                                            }}
                                        >
                                            {/* Row Checkbox */}
                                            <td className={`${rowPadding} text-center align-top whitespace-nowrap no-print`} onClick={e => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={e => toggleSelectOne(item.id, e)}
                                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                                                />
                                            </td>

                                            {visibleColumns.year && (
                                                <td className={`${rowPadding} text-center align-top whitespace-nowrap font-bold text-slate-700`}>
                                                    {getFiscalYear(item.requestDate)}
                                                </td>
                                            )}

                                            {visibleColumns.category && (
                                                <td className={`${rowPadding} align-top`}>
                                                    <div className="font-medium text-slate-800 leading-tight">{item.category || '-'}</div>
                                                </td>
                                            )}

                                            {visibleColumns.requestId && (
                                                <td className={`${rowPadding} whitespace-nowrap align-top`}>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className="font-bold text-slate-900 leading-tight font-mono hover:text-teal-600 transition-colors">
                                                                {highlightMatch(item.requestId, searchTerm)}
                                                            </span>
                                                            {item.isLocked && (
                                                                <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded" title="รายการนี้ถูกล็อคแล้ว (ตรวจรับสมบูรณ์)">
                                                                    <Lock size={9} />
                                                                    <span>ล็อค</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[12px] font-medium text-slate-500 mt-0.5 flex items-center">
                                                            <Calendar size={11} className="mr-1 inline text-slate-400" />
                                                            {item.requestDate}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.officialNumber && (
                                                <td className={`${rowPadding} ${theme.bgSoft} font-bold ${theme.text} align-top whitespace-nowrap font-mono`}>
                                                    {highlightMatch(item.officialNumber, searchTerm) || '-'}
                                                </td>
                                            )}

                                            {/* Consideration Column */}
                                            {visibleColumns.consideration && (
                                                <td className={`${rowPadding} bg-amber-50/20 align-top group/cell`}>
                                                    {hasValue(linked.consideration?.considerationNumber) ? (
                                                        <div className="flex flex-col bg-amber-50/80 border border-amber-200/70 rounded-lg p-1.5 text-amber-950">
                                                            <span className="font-bold leading-tight font-mono text-[13px]">
                                                                {highlightMatch(linked.consideration?.considerationNumber, searchTerm)}
                                                            </span>
                                                            <div className="flex items-center justify-between mt-0.5">
                                                                <span className="text-[11px] font-medium text-amber-700 flex items-center">
                                                                    <Calendar size={10} className="mr-1 inline text-amber-600" />
                                                                    {linked.consideration?.considerationDate || '-'}
                                                                </span>
                                                                {isOwner && (
                                                                    <button 
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation();
                                                                            setQuickDateTarget(item); 
                                                                            setQuickDateType('CONSIDERATION'); 
                                                                            setQuickDateValue(linked.consideration?.considerationDate || item.requestDate || ''); 
                                                                            setExistingDocNumber(linked.consideration?.considerationNumber || null);
                                                                        }}
                                                                        className="ml-1 p-0.5 text-amber-500 hover:text-amber-800 no-print opacity-0 group-hover/cell:opacity-100 transition-all rounded cursor-pointer"
                                                                        title="แก้ไขวันที่"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        isOwner && (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation();
                                                                    setQuickDateTarget(item); 
                                                                    setQuickDateType('CONSIDERATION'); 
                                                                    setQuickDateValue(item.requestDate || new Date().toISOString().split('T')[0]); 
                                                                    setExistingDocNumber(null); 
                                                                }} 
                                                                className="inline-flex items-center text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-1 rounded-lg no-print text-[11px] font-semibold transition-all hover:shadow-sm cursor-pointer"
                                                            >
                                                                <Plus size={12} className="mr-1 stroke-[2.5]" /> เพิ่มข้อมูล
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            )}
                                            
                                            {/* Receiving Column */}
                                            {visibleColumns.receiving && (
                                                <td className={`${rowPadding} bg-teal-50/20 align-top group/cell`}>
                                                    {hasValue(linked.receiving?.deliveryNoteNo) ? (
                                                        <div className="flex flex-col bg-teal-50/80 border border-teal-200/70 rounded-lg p-1.5 text-teal-950">
                                                            <span className="font-bold leading-tight font-mono text-[13px]">
                                                                {highlightMatch(linked.receiving?.deliveryNoteNo, searchTerm)}
                                                            </span>
                                                            <div className="flex items-center justify-between mt-0.5">
                                                                <span className="text-[11px] font-medium text-teal-700 flex items-center">
                                                                    <Calendar size={10} className="mr-1 inline text-teal-600" />
                                                                    {linked.receiving?.receiveDate || '-'}
                                                                </span>
                                                                {isOwner && (
                                                                    <button 
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation();
                                                                            setQuickDateTarget(item); 
                                                                            setQuickDateType('RECEIVING'); 
                                                                            setQuickDateValue(linked.receiving?.receiveDate || item.requestDate || ''); 
                                                                            setExistingDocNumber(linked.receiving?.deliveryNoteNo || null);
                                                                        }}
                                                                        className="ml-1 p-0.5 text-teal-500 hover:text-teal-800 no-print opacity-0 group-hover/cell:opacity-100 transition-all rounded cursor-pointer"
                                                                        title="แก้ไขวันที่"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        isOwner && (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation();
                                                                    setQuickDateTarget(item); 
                                                                    setQuickDateType('RECEIVING'); 
                                                                    setQuickDateValue(item.requestDate || new Date().toISOString().split('T')[0]); 
                                                                    setExistingDocNumber(null); 
                                                                }} 
                                                                className="inline-flex items-center text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2 py-1 rounded-lg no-print text-[11px] font-semibold transition-all hover:shadow-sm cursor-pointer"
                                                            >
                                                                <Plus size={12} className="mr-1 stroke-[2.5]" /> เพิ่มข้อมูล
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            )}

                                            {/* Micro Workflow Pipeline Status Badge */}
                                            {visibleColumns.status && (
                                                <td className={`${rowPadding} text-center align-top whitespace-nowrap`}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center space-x-1 mb-1">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" title="1. กำหนดขอบเขตงาน (เสร็จ)" />
                                                            <ChevronRight size={10} className="text-slate-300" />
                                                            <span className={`w-2.5 h-2.5 rounded-full ${hasCons ? 'bg-teal-500' : 'bg-amber-400 animate-pulse'}`} title="2. รายงานขอ" />
                                                            <ChevronRight size={10} className="text-slate-300" />
                                                            <span className={`w-2.5 h-2.5 rounded-full ${hasRecv ? 'bg-teal-500' : 'bg-slate-200'}`} title="3. ผลพิจารณา" />
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                            stepCount === 3 
                                                            ? 'bg-emerald-100 text-emerald-800' 
                                                            : stepCount === 2 
                                                                ? 'bg-teal-100 text-teal-800' 
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {stepCount === 3 ? 'ครบ 3 ขั้น' : stepCount === 2 ? 'รอผลพิจารณา' : 'รอรายงานขอ'}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.itemCount && (
                                                <td className={`${rowPadding} text-center align-top font-semibold text-slate-700`}>{item.itemCount || '0'}</td>
                                            )}

                                            {visibleColumns.amount && (
                                                <td className={`${rowPadding} text-right align-top font-bold text-slate-900 whitespace-nowrap font-mono`}>
                                                    {Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                            )}

                                            {visibleColumns.remarks && (
                                                <td className={`${rowPadding} align-top`}>
                                                    {item.company && (
                                                        <span className="font-bold text-teal-900 text-xs block mb-0.5">
                                                            🏢 {highlightMatch(item.company, searchTerm)}
                                                        </span>
                                                    )}
                                                    <div className="text-slate-600 text-xs leading-relaxed break-words whitespace-normal" style={{ wordBreak: 'break-word' }}>
                                                        {highlightMatch(item.remarks, searchTerm) || '-'}
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.createdBy && (
                                                <td className={`${rowPadding} align-top border-l border-slate-100`}>
                                                    <div className="flex flex-col text-[11px] leading-tight text-slate-500 whitespace-normal">
                                                        <span className="font-semibold text-slate-800 mb-0.5 flex items-center">
                                                            <UserIcon size={11} className="mr-1 text-slate-400 flex-shrink-0" />
                                                            {user?.name || 'ไม่ระบุ'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">{wg?.name || '-'}</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5">{dept?.name || '-'}</span>
                                                    </div>
                                                </td>
                                            )}

                                            <td className={`${rowPadding} text-center no-print align-top`}>
                                                <div className="flex justify-center items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => setDrawerRecord(item)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer" title="ดูรายละเอียด">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => setHistoryRecord(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="ประวัติการแก้ไข (Audit Trail)">
                                                        <History size={14} />
                                                    </button>
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE') && (
                                                        <button 
                                                            onClick={async () => {
                                                                await toggleLockProcurement(item.id);
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                item.isLocked 
                                                                ? 'text-amber-600 hover:bg-amber-100/70 bg-amber-50' 
                                                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                            }`}
                                                            title={item.isLocked ? "ปลดล็อคข้อมูล" : "ล็อคข้อมูล (ตรวจรับแล้ว)"}
                                                        >
                                                            {item.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                                        </button>
                                                    )}
                                                    {isOwner && (
                                                        <>
                                                            <button 
                                                                onClick={() => openEdit(item)} 
                                                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                    item.isLocked && currentUser?.role !== 'ADMIN'
                                                                    ? 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'
                                                                    : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                                                                }`} 
                                                                title={item.isLocked && currentUser?.role !== 'ADMIN' ? "รายการถูกล็อค (ไม่อนุญาตให้แก้ไข)" : "แก้ไข"}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteClick(item.id)} 
                                                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                    item.isLocked && currentUser?.role !== 'ADMIN'
                                                                    ? 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'
                                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                                }`} 
                                                                title={item.isLocked && currentUser?.role !== 'ADMIN' ? "รายการถูกล็อค (ไม่อนุญาตให้ลบ)" : "ลบ (ย้ายลงถังขยะ)"}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Responsive Cards View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Calendar size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                            <p className="text-sm font-medium text-slate-500">ไม่พบรายการข้อมูล</p>
                        </div>
                    ) : (
                        paginatedData.map((item) => {
                            const linked = getLinkedData(item.requestId, item.requestDate, item.id);
                            const isOwner = item.createdBy === currentUser?.id || currentUser?.role === 'ADMIN';
                            const hasCons = hasValue(linked.consideration?.considerationNumber);
                            const hasRecv = hasValue(linked.receiving?.deliveryNoteNo);
                            const isSelected = selectedIds.has(item.id);

                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => setDrawerRecord(item)}
                                    className={`p-4 transition-colors cursor-pointer space-y-2.5 ${
                                        isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => toggleSelectOne(item.id, e)}
                                                onClick={e => e.stopPropagation()}
                                                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="font-bold text-slate-900 font-mono text-sm">
                                                {highlightMatch(item.requestId, searchTerm)}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                            ปีงบ {getFiscalYear(item.requestDate)}
                                        </span>
                                    </div>

                                    {item.company && (
                                        <p className="text-xs font-semibold text-teal-900 truncate">
                                            🏢 {highlightMatch(item.company, searchTerm)}
                                        </p>
                                    )}

                                    <div className="flex items-baseline justify-between pt-1">
                                        <span className="text-xs text-slate-500">{item.category}</span>
                                        <span className="text-base font-bold font-mono text-slate-900">
                                            {Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
                                        </span>
                                    </div>

                                    {/* Mobile Flow Steps */}
                                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                                        <span className={`font-semibold ${hasCons ? 'text-teal-700' : 'text-amber-700'}`}>
                                            {hasCons ? '✓ รายงานขอแล้ว' : '○ รอรายงานขอ'}
                                        </span>
                                        <span className={`font-semibold ${hasRecv ? 'text-emerald-700' : 'text-slate-400'}`}>
                                            {hasRecv ? '✓ ตรวจรับแล้ว' : '○ รอตรวจรับ'}
                                        </span>
                                        <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setDrawerRecord(item)} className="p-1 text-slate-400 hover:text-teal-600">
                                                <Eye size={15} />
                                            </button>
                                            {isOwner && (
                                                <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-teal-600">
                                                    <Edit2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600 no-print">
                    <div className="flex items-center space-x-2">
                        <span>แสดง</span>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={-1}>ทั้งหมด</option>
                        </select>
                        <span>รายการ (ทั้งหมด {processedData.length} รายการ)</span>
                    </div>

                    {itemsPerPage !== -1 && totalPages > 1 && (
                        <div className="flex items-center space-x-1.5">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-medium"
                            >
                                ก่อนหน้า
                            </button>
                            <span className="px-2 font-semibold text-slate-700">หน้า {currentPage} จาก {totalPages}</span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-medium"
                            >
                                ถัดไป
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Batch Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-3.5 backdrop-blur-md animate-fade-in no-print">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-teal-400">
                        <CheckCircle2 size={16} />
                        <span>เลือก {selectedIds.size} รายการ</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                    >
                        <Printer size={13} />
                        <span>พิมพ์ที่เลือก</span>
                    </button>
                    <button
                        onClick={handleBatchExportExcel}
                        className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                    >
                        <FileSpreadsheet size={13} />
                        <span>ส่งออก Excel ({selectedIds.size})</span>
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        ✕ ล้าง
                    </button>
                </div>
            )}

            {/* --- 🌟 3. Interactive Slide-over Drawer (แถบรายละเอียดด้านข้าง) --- */}
            {drawerRecord && (() => {
                const linked = getLinkedData(drawerRecord.requestId, drawerRecord.requestDate, drawerRecord.id);
                const isOwner = drawerRecord.createdBy === currentUser?.id || currentUser?.role === 'ADMIN';
                const user = users.find(u => u.id === drawerRecord.createdBy);
                const dept = settings.departments.find(d => d.id === user?.departmentId);
                const wg = settings.workGroups.find(g => g.id === dept?.workGroupId);

                const hasCons = hasValue(linked.consideration?.considerationNumber);
                const hasRecv = hasValue(linked.receiving?.deliveryNoteNo);

                return (
                    <>
                        <div 
                            className="fixed inset-0 bg-slate-950/40 z-[110] backdrop-blur-xs transition-opacity animate-fade-in"
                            onClick={() => setDrawerRecord(null)}
                        />
                        <div className="fixed inset-y-0 right-0 w-full sm:max-w-md md:max-w-lg bg-white shadow-2xl z-[120] border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out">
                            {/* Drawer Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                            ปีงบประมาณ {getFiscalYear(drawerRecord.requestDate)}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">#{drawerRecord.category || 'ทั่วไป'}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mt-2 font-mono">{drawerRecord.requestId}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                                        <Calendar size={13} className="mr-1 text-slate-400" /> 
                                        วันที่กำหนดขอบเขตงาน: {drawerRecord.requestDate}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setDrawerRecord(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                
                                {/* Security & Lock Status Banner */}
                                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                                    drawerRecord.isLocked 
                                    ? 'bg-amber-50/90 border-amber-200 text-amber-950' 
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                    <div className="flex items-center space-x-2.5">
                                        <div className={`p-2 rounded-xl ${drawerRecord.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                                            {drawerRecord.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">
                                                {drawerRecord.isLocked ? '🔒 เอกสารนี้ถูกล็อคข้อมูล (Freeze)' : '🔓 สถานะปกติ (ยังไม่ล็อค)'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {drawerRecord.isLocked 
                                                    ? `ล็อคโดย ${drawerRecord.lockedBy || 'Admin'} เพื่อป้องกันยอดคลาดเคลื่อนกับฝ่ายการเงิน`
                                                    : 'สามารถแก้ไขยอดเงินและวันที่ได้ตามสิทธิ์'}
                                            </p>
                                        </div>
                                    </div>
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE') && (
                                        <button
                                            onClick={async () => {
                                                const res = await toggleLockProcurement(drawerRecord.id);
                                                setDrawerRecord(prev => prev ? { ...prev, isLocked: !prev.isLocked } : null);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                                                drawerRecord.isLocked
                                                ? 'bg-white hover:bg-amber-100 text-amber-800 border-amber-300'
                                                : 'bg-slate-800 hover:bg-slate-900 text-white border-transparent'
                                            }`}
                                        >
                                            {drawerRecord.isLocked ? 'ปลดล็อค' : 'ล็อคข้อมูล'}
                                        </button>
                                    )}
                                </div>
                                
                                {/* 1. Workflow Pipeline Timeline */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center">
                                        <ShieldCheck size={16} className="mr-1.5 text-teal-600" />
                                        ไทม์ไลน์ความคืบหน้าเอกสาร
                                    </h4>

                                    <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                        
                                        {/* Step 1: Request */}
                                        <div className="relative">
                                            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                                                ✓
                                            </span>
                                            <div className="text-xs">
                                                <p className="font-bold text-slate-900">1. กำหนดขอบเขตงาน / ขอซื้อขอจ้าง</p>
                                                <p className="text-slate-600 font-mono mt-0.5">{drawerRecord.requestId}</p>
                                                <p className="text-[11px] text-slate-400">วันที่: {drawerRecord.requestDate}</p>
                                            </div>
                                        </div>

                                        {/* Step 2: Consideration */}
                                        <div className="relative">
                                            <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                                hasCons ? 'bg-teal-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                                            }`}>
                                                {hasCons ? '✓' : '2'}
                                            </span>
                                            <div className="text-xs">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-slate-900">2. รายงานขอซื้อ / ขอจ้าง</p>
                                                    {!hasCons && isOwner && (
                                                        <button 
                                                            onClick={() => {
                                                                setQuickDateTarget(drawerRecord);
                                                                setQuickDateType('CONSIDERATION');
                                                                setQuickDateValue(drawerRecord.requestDate || new Date().toISOString().split('T')[0]);
                                                                setExistingDocNumber(null);
                                                            }}
                                                            className="text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md"
                                                        >
                                                            + ออกเลขทันที
                                                        </button>
                                                    )}
                                                </div>
                                                {hasCons ? (
                                                    <>
                                                        <p className="text-amber-900 font-bold font-mono mt-0.5">{linked.consideration?.considerationNumber}</p>
                                                        <p className="text-[11px] text-slate-400">วันที่: {linked.consideration?.considerationDate}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-[11px] text-amber-600 mt-0.5 font-medium italic">ยังไม่ได้ออกเลขรายงานขอ</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 3: Receiving */}
                                        <div className="relative">
                                            <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                                hasRecv ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-700'
                                            }`}>
                                                {hasRecv ? '✓' : '3'}
                                            </span>
                                            <div className="text-xs">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-slate-900">3. ผลพิจารณา / ตรวจรับ</p>
                                                    {!hasRecv && hasCons && isOwner && (
                                                        <button 
                                                            onClick={() => {
                                                                setQuickDateTarget(drawerRecord);
                                                                setQuickDateType('RECEIVING');
                                                                setQuickDateValue(drawerRecord.requestDate || new Date().toISOString().split('T')[0]);
                                                                setExistingDocNumber(null);
                                                            }}
                                                            className="text-[11px] font-bold text-teal-700 bg-teal-100 hover:bg-teal-200 px-2 py-0.5 rounded-md"
                                                        >
                                                            + ออกเลขตรวจรับ
                                                        </button>
                                                    )}
                                                </div>
                                                {hasRecv ? (
                                                    <>
                                                        <p className="text-teal-900 font-bold font-mono mt-0.5">{linked.receiving?.deliveryNoteNo}</p>
                                                        <p className="text-[11px] text-slate-400">วันที่: {linked.receiving?.receiveDate}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400 mt-0.5 italic">รอตรวจรับหรือผลพิจารณา</p>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* 2. Financial & Items Card */}
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md">
                                    <span className="text-[11px] text-slate-400 font-medium">วงเงินงบประมาณ</span>
                                    <h4 className="text-2xl font-bold font-mono mt-1 text-teal-300">
                                        {Number(drawerRecord.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-white">บาท</span>
                                    </h4>
                                    <p className="text-xs text-slate-300 font-medium mt-1">
                                        {thaiBahtText(drawerRecord.amount)}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-slate-700/80 flex justify-between text-xs text-slate-300">
                                        <span>จำนวนรายการ: <strong className="text-white">{drawerRecord.itemCount || 1}</strong> รายการ</span>
                                        <span>เลขสั่งซื้อ/จ้าง: <strong className="text-white font-mono">{drawerRecord.officialNumber || '-'}</strong></span>
                                    </div>
                                </div>

                                {/* 3. Vendor Card */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                                        <Building2 size={14} className="mr-1.5 text-teal-600" />
                                        คู่สัญญา / บริษัทร้านค้า
                                    </span>
                                    <p className="text-sm font-bold text-slate-900">{drawerRecord.company || 'ไม่ระบุคู่สัญญา'}</p>
                                </div>

                                {/* 4. Remarks & Requester */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                                    <div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                                            <FileText size={14} className="mr-1.5 text-teal-600" />
                                            หมายเหตุ / ขอบเขตงาน
                                        </span>
                                        <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line">{drawerRecord.remarks || '-'}</p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <div className="flex items-center">
                                            <UserIcon size={14} className="mr-1.5 text-slate-400" />
                                            <span>ผู้บันทึก: <strong className="text-slate-800">{user?.name || 'ไม่ระบุ'}</strong></span>
                                        </div>
                                        <span>{dept?.name || '-'}</span>
                                    </div>
                                </div>

                                {/* Record Audit Trail */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                                            <History size={15} className="mr-1.5 text-teal-600" />
                                            ประวัติการแก้ไขรายการนี้ (Audit Log)
                                        </h4>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {auditLogs.filter(l => l.recordId === drawerRecord.id || l.requestId === drawerRecord.requestId).length} บันทึก
                                        </span>
                                    </div>

                                    {(() => {
                                        const itemLogs = auditLogs.filter(l => l.recordId === drawerRecord.id || l.requestId === drawerRecord.requestId);
                                        if (itemLogs.length === 0) {
                                            return (
                                                <p className="text-xs text-slate-400 italic py-1">
                                                    ยังไม่มีบันทึกการแก้ไขเพิ่มเติม
                                                </p>
                                            );
                                        }
                                        return (
                                            <div className="space-y-2">
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                    {itemLogs.map(log => (
                                                        <div key={log.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-slate-800">
                                                                    {log.action === 'CREATE' ? '✨ สร้างรายการ' : 
                                                                     log.action === 'UPDATE' ? '✏️ แก้ไขข้อมูล' : 
                                                                     log.action === 'LOCK' ? '🔒 ล็อคข้อมูล' : 
                                                                     log.action === 'UNLOCK' ? '🔓 ปลดล็อค' : log.action}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    {new Date(log.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-600 text-[11px] leading-tight">{log.details}</p>
                                                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                                                                <span>โดย: {log.userName}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setHistoryRecord(drawerRecord)}
                                                    className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                                                >
                                                    <History size={13} />
                                                    <span>เปิดดูประวัติ Timeline & ค่าเดิม-ใหม่แบบละเอียด</span>
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                                {drawerRecord.isLocked && currentUser?.role !== 'ADMIN' ? (
                                    <div className="flex-1 py-2 px-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center">
                                        <Lock size={13} className="mr-1.5 flex-shrink-0 text-amber-700" />
                                        <span>รายการนี้ถูกล็อคแล้ว (ตรวจรับสมบูรณ์) ติดต่อ Admin เพื่อปลดล็อค</span>
                                    </div>
                                ) : isOwner ? (
                                    <>
                                        <button 
                                            onClick={() => {
                                                openEdit(drawerRecord);
                                                setDrawerRecord(null);
                                            }}
                                            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                        >
                                            <Edit2 size={14} className="mr-1.5" /> แก้ไขรายการนี้
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(drawerRecord.id)}
                                            className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                            title="ย้ายลงถังขยะ"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">มุมมองอ่านอย่างเดียว</span>
                                )}
                                <button 
                                    onClick={() => setDrawerRecord(null)}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Quick Date Modal */}
            {quickDateTarget && (
                <div className="fixed inset-0 bg-slate-950/60 z-[130] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center">
                                <Calendar size={18} className="mr-2 text-teal-600" />
                                {existingDocNumber ? 'แก้ไขวันที่' : 'ระบุวันที่ออกเลข'}
                            </h3>
                            <button onClick={() => !isSaving && setQuickDateTarget(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-full"><X size={18}/></button>
                        </div>
                        
                        <div className="bg-slate-50 p-3.5 rounded-xl mb-4 border border-slate-200/80">
                            <div className="text-xs text-slate-600 mb-1">
                                เอกสาร: <span className="font-bold font-mono text-slate-900">{quickDateTarget.requestId}</span> (ปีงบ {getFiscalYear(quickDateTarget.requestDate)})
                            </div>
                            {existingDocNumber ? (
                                <>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">เลขที่เอกสารปัจจุบัน (ใช้เลขเดิม)</p>
                                    <p className="text-sm font-bold text-slate-800 font-mono">{existingDocNumber}</p>
                                </>
                            ) : (
                                <p className="text-xs text-slate-500">ระบบจะดึงเลข <span className="font-bold text-slate-800">ลำดับถัดไป (เลขไทย)</span> จากคลังเลขของปีงบ {getFiscalYear(quickDateTarget.requestDate)} ให้อัตโนมัติ</p>
                            )}
                        </div>

                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">เลือกวันที่</label>
                        <input 
                            type="date" 
                            disabled={isSaving} 
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 mb-5 outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 bg-white font-medium shadow-sm" 
                            value={quickDateValue} 
                            onChange={e => setQuickDateValue(e.target.value)} 
                        />
                        
                        <div className="flex gap-2">
                            <button onClick={() => setQuickDateTarget(null)} disabled={isSaving} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold">ยกเลิก</button>
                            <button onClick={handleSaveQuickDate} disabled={isSaving || !quickDateValue} className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex justify-center items-center shadow-md shadow-teal-900/10 transition-all">
                                {isSaving ? <Loader2 className="animate-spin mr-1.5" size={15} /> : <Check className="mr-1.5" size={15} />}
                                {isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 z-[130] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                    {editingId ? 'แก้ไขรายการข้อมูล' : 'บันทึกรายการทะเบียนคุมใหม่'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{title}</p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center mr-2">1</span>
                                    ข้อมูลเรื่องและวันที่ (Basic Details)
                                </h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่ใบขอ *</label>
                                        {editingId ? (
                                            <input 
                                                required 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 font-bold font-mono text-sm" 
                                                value={formData.requestId} 
                                                onChange={e => setFormData({...formData, requestId: e.target.value})} 
                                            />
                                        ) : (
                                            <div className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-600 text-xs min-h-[42px] flex items-center shadow-inner">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-500 italic text-[11px]">
                                                        ➜ ระบบจะรันเลขอัตโนมัติ (ตาม Pool เลขร่วม)
                                                    </span>
                                                    {formData.requestDate && (
                                                        <span className="text-[11px] text-teal-700 font-bold mt-0.5">
                                                            รอบปีงบประมาณ {getFiscalYear(formData.requestDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-semibold text-slate-700">วันที่ใบขอ *</label>
                                            {formData.requestDate && (
                                                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                                    ปีงบ {getFiscalYear(formData.requestDate)}
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            required 
                                            type="date" 
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 text-sm font-medium" 
                                            value={formData.requestDate} 
                                            onChange={e => setFormData({...formData, requestDate: e.target.value})} 
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดพัสดุ *</label>
                                        <select 
                                            required
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-slate-900 text-sm focus:ring-2 focus:ring-teal-500" 
                                            value={formData.category} 
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            <option value="">เลือกหมวดพัสดุ...</option>
                                            {settings.categories?.filter(c => c.isActive).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center mr-2">2</span>
                                    วงเงินงบประมาณและรายการ (Budget & Items)
                                </h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนรายการ</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-slate-900 text-sm focus:ring-2 focus:ring-teal-500" 
                                            placeholder="1"
                                            value={formData.itemCount === 0 ? '' : formData.itemCount} 
                                            onChange={e => setFormData({...formData, itemCount: Number(e.target.value)})} 
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-semibold text-slate-700">จำนวนเงิน (บาท) *</label>
                                            {formData.amount > 0 && (
                                                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                                                    {Number(formData.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            required
                                            type="number" 
                                            step="0.01" 
                                            placeholder="0.00"
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 text-sm font-bold font-mono" 
                                            value={formData.amount === 0 ? '' : formData.amount} 
                                            onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                                        />
                                        {formData.amount > 0 && (() => {
                                            const method = getProcurementMethod(Number(formData.amount));
                                            return (
                                                <div className="mt-2 space-y-1.5 animate-fade-in">
                                                    <div className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                                                        {thaiBahtText(formData.amount)}
                                                    </div>
                                                    <div className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center justify-between ${method.color}`}>
                                                        <span>⚖️ เกณฑ์วิธีจัดหา: <strong>{method.name}</strong></span>
                                                        <span className="text-[10px] opacity-80">พ.ร.บ. จัดซื้อจัดจ้างฯ</span>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/80 flex items-center justify-between">
                                                        <span>✨ ออก{fieldLabels.officialNumber}อัตโนมัติ: <strong>ตั้งแต่ 1.00 บาทขึ้นไป</strong></span>
                                                        <span className="text-[10px] text-blue-600 font-semibold font-mono">Auto Sequence</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center mr-2">3</span>
                                    คู่สัญญาและหมายเหตุ (Vendor & Remarks)
                                </h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">บริษัท/ร้านค้า (คู่สัญญา) - มีระบบแนะนำอัตโนมัติ</label>
                                        <input 
                                            type="text" 
                                            list="vendor-datalist"
                                            placeholder="พิมพ์ชื่อบริษัทหรือเลือกร้านค้าเดิม..."
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-slate-900 text-sm focus:ring-2 focus:ring-teal-500" 
                                            value={formData.company} 
                                            onChange={e => setFormData({...formData, company: e.target.value})} 
                                        />
                                        <datalist id="vendor-datalist">
                                            {uniqueVendors.map((vendor, idx) => (
                                                <option key={idx} value={vendor} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ / ขอบเขตงาน</label>
                                        <textarea 
                                            rows={2} 
                                            placeholder="รายละเอียดเพิ่มเติมของงาน..."
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-slate-900 text-sm focus:ring-2 focus:ring-teal-500" 
                                            value={formData.remarks} 
                                            onChange={e => setFormData({...formData, remarks: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-slate-100">
                                <button type="button" onClick={closeModal} className="order-2 sm:order-1 px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" className={`order-1 sm:order-2 px-6 py-2.5 ${theme.bgDeep} ${theme.bgHover} text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 flex justify-center items-center transition-all`}>
                                    <Check size={16} className="mr-1.5 stroke-[2.5]" /> 
                                    บันทึกข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-slate-100">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-teal-50 text-teal-600 mb-4">
                            <Check className="h-7 w-7 stroke-[2.5]" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">ยืนยันการบันทึกข้อมูล?</h3>
                        <p className="text-xs text-slate-500 mb-6">
                            {editingId ? 'ระบบจะปรับปรุงข้อมูลรายการนี้ทันที' : 'ระบบจะรันเลขที่เอกสารถัดไป และบันทึกลงในระบบ'}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold">
                                ยกเลิก
                            </button>
                            <button onClick={handleConfirmSave} className={`flex-1 py-2.5 ${theme.bgDeep} ${theme.bgHover} text-white rounded-xl text-xs font-bold shadow-md`}>
                                ยืนยันบันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation (Soft Delete to Recycle Bin) */}
            {deleteId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-slate-100">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-50 text-rose-600 mb-4">
                            <Trash2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">ยืนยันการลบรายการ?</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            ระบบจะย้ายรายการนี้ไปยัง <strong>ถังขยะกู้คืนข้อมูล (Recycle Bin)</strong> เพื่อความปลอดภัยของข้อมูลราชการ (ผู้ดูแลระบบสามารถกู้คืนกลับมาได้)
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer">
                                ยกเลิก
                            </button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer">
                                ย้ายลงถังขยะ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit History Modal */}
            {historyRecord && (
                <RecordHistoryModal 
                    record={historyRecord} 
                    onClose={() => setHistoryRecord(null)} 
                />
            )}

            {/* Alert / Warning Dialog */}
            {alertModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-slate-100">
                        <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full ${alertModal.isWarning ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'} mb-4`}>
                            <AlertCircle className="h-7 w-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-2">
                            {alertModal.isWarning ? 'แจ้งเตือนลำดับวันที่' : 'แจ้งเตือน'}
                        </h3>
                        <p className="text-xs text-slate-600 mb-6 whitespace-pre-line leading-relaxed">{alertModal.message}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setAlertModal(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold">
                                ปิดหน้าต่าง
                            </button>
                            {alertModal.isWarning && (
                                <button onClick={handleForceSave} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200">
                                    ยืนยันบันทึกต่อไป
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcurementTable;
