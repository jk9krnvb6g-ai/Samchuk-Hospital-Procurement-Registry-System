import { ProcurementRecord, ConsiderationRecord, ReceivingReport, RecordType } from '../types';

const toThaiNum = (num: number | string) => {
    if (num === null || num === undefined) return '';
    return num.toString().replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[parseInt(d, 10)]);
};

const VENDORS = [
    'องค์การเภสัชกรรม (อภ.)',
    'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
    'บริษัท เมดิทอป จำกัด',
    'บริษัท บางกอกดรัก จำกัด',
    'บริษัท บี. บราวน์ (ประเทศไทย) จำกัด',
    'บริษัท ไทยโอซูก้า จำกัด',
    'ห้างหุ้นส่วนจำกัด สามชุกการค้า',
    'บริษัท สุพรรณ ไอที เซอร์วิส จำกัด',
    'บริษัท สยามออฟฟิศ แอนด์ สเตชั่นเนอรี่ จำกัด',
    'บริษัท ฟิลิปส์ อิเล็กทรอนิกส์ (ประเทศไทย) จำกัด',
    'บริษัท ซีเมนส์ เฮลธ์เนียส์ (ประเทศไทย) จำกัด',
    'ห้างหุ้นส่วนจำกัด สุพรรณเมดิคอล ซัพพลาย',
    'บริษัท คลีนนิ่ง เซอร์วิสเซส (สุพรรณบุรี) จำกัด',
    'ห้างหุ้นส่วนจำกัด สามชุกการช่าง',
    'บริษัท ซิลลิค ฟาร์มา จำกัด',
    'บริษัท เบอร์ลี่ ยุคเกอร์ จำกัด (มหาชน)',
    'บริษัท ดีทแฮล์ม เคลเลอร์ โลจิสติกส์ จำกัด',
    'บริษัท ที.แมน ฟาร์มาซูติคอล จำกัด'
];

const PURCHASE_ITEMS = [
    { cat: 'ยาและเวชภัณฑ์', name: 'ยาปฏิชีวนะและยาสามัญประจำโรงพยาบาล', min: 15000, max: 280000 },
    { cat: 'ยาและเวชภัณฑ์', name: 'สารน้ำทางหลอดเลือดดำ (IV Fluid) และเวชภัณฑ์ฉีด', min: 25000, max: 150000 },
    { cat: 'วัสดุการแพทย์', name: 'ถุงมือตรวจโรคและหน้ากากอนามัยทางการแพทย์', min: 8000, max: 45000 },
    { cat: 'วัสดุการแพทย์', name: 'สายให้น้ำเกลือ เข็มฉีดยา และชุดทำแผลปลอดเชื้อ', min: 12000, max: 85000 },
    { cat: 'วัสดุการแพทย์', name: 'ชุดตรวจน้ำตาลในเลือดและแผ่นตรวจวินิจฉัย', min: 15000, max: 95000 },
    { cat: 'วัสดุวิทยาศาสตร์การแพทย์', name: 'น้ำยาตรวจวิเคราะห์ทางห้องปฏิบัติการ (Lab Reagents)', min: 35000, max: 420000 },
    { cat: 'วัสดุคอมพิวเตอร์', name: 'ตลับหมึกเลเซอร์และริบบอนพิมพ์เวชระเบียน', min: 9500, max: 38000 },
    { cat: 'วัสดุคอมพิวเตอร์', name: 'เครื่องสำรองไฟฟ้า (UPS) และอุปกรณ์เครือข่าย IP-Network', min: 25000, max: 180000 },
    { cat: 'วัสดุคอมพิวเตอร์', name: 'เครื่องคอมพิวเตอร์ประมวลผลงานเวชสารสนเทศ', min: 45000, max: 320000 },
    { cat: 'วัสดุสำนักงาน', name: 'กระดาษพิมพ์แบบฟอร์มเวชระเบียนและแฟ้มประวัติ', min: 4500, max: 22000 },
    { cat: 'วัสดุสำนักงาน', name: 'หมึกพิมพ์สติ๊กเกอร์บาร์โค้ดระบุตัวตนผู้ป่วย', min: 8000, max: 35000 },
    { cat: 'ที่ดินและสิ่งก่อสร้าง', name: 'ชุดอุปกรณ์ไฟฉุกเฉินและระบบป้องกันอัคคีภัย', min: 28000, max: 140000 }
];

const HIRING_ITEMS = [
    { cat: 'จ้างเหมาบริการ', name: 'จ้างเหมาบริการทำความสะอาดและฆ่าเชื้ออาคารผู้ป่วยใน', min: 45000, max: 350000 },
    { cat: 'จ้างเหมาบริการ', name: 'จ้างเหมาบริการรักษาความปลอดภัยประจำจุดตรวจ รพ.', min: 35000, max: 240000 },
    { cat: 'จ้างเหมาบริการ', name: 'จ้างเหมาซักฟอกผ้าผู้ป่วยและชุดปฏิบัติการปลอดเชื้อ', min: 25000, max: 180000 },
    { cat: 'จ้างเหมาบริการ', name: 'จ้างเหมากำจัดขยะติดเชื้อทางการแพทย์ประจำเดือน', min: 18000, max: 95000 },
    { cat: 'จ้างเหมาบริการ', name: 'จ้างบำรุงรักษาและตรวจเทียบเครื่องมือแพทย์ (Calibrate)', min: 35000, max: 280000 },
    { cat: 'จ้างเหมาบริการ', name: 'จ้างปรับปรุงระบบสายสัญญาณเครือข่ายความเร็วสูง HIS', min: 28000, max: 195000 },
    { cat: 'ที่ดินและสิ่งก่อสร้าง', name: 'จ้างปรับปรุงระบบระบายน้ำและทางลาดเพื่อคนพิการ', min: 65000, max: 480000 },
    { cat: 'ที่ดินและสิ่งก่อสร้าง', name: 'จ้างซ่อมแซมฝ้าเพดานและห้องตรวจผู้ป่วยนอก (OPD)', min: 45000, max: 290000 }
];

const OTHER_ITEMS = [
    { cat: 'จ้างเหมาบริการ', name: 'เช่าสัญญาณอินเทอร์เน็ตความเร็วสูงสำหรับระบบ Telemedicine', min: 18000, max: 65000 },
    { cat: 'วัสดุสำนักงาน', name: 'เช่าเครื่องถ่ายเอกสารและเครื่องพิมพ์มัลติฟังก์ชัน', min: 12000, max: 48000 },
    { cat: 'วัสดุคอมพิวเตอร์', name: 'เช่าพื้นที่ Cloud Backup ฐานข้อมูลโรงพยาบาล', min: 24000, max: 90000 }
];

// Pseudo-random generator with fixed seed for consistent, realistic distribution
let seed = 123456789;
const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
};

const getRandomInt = (min: number, max: number) => {
    return Math.floor(random() * (max - min + 1)) + min;
};

const padZero = (n: number) => n < 10 ? `0${n}` : `${n}`;

export interface GeneratedMockData {
    procurements: ProcurementRecord[];
    considerations: ConsiderationRecord[];
    receivings: ReceivingReport[];
}

export const generate1000MockRecords = (): GeneratedMockData => {
    seed = 42; // Reset seed for deterministic generation

    const procurements: ProcurementRecord[] = [];
    const considerations: ConsiderationRecord[] = [];
    const receivings: ReceivingReport[] = [];

    const TOTAL = 1000;

    // Date generation helper: distributes dates across FY 2568, 2569, and 2570
    // FY 2568: 2024-10-01 to 2025-09-30 (150 items)
    // FY 2569: 2025-10-01 to 2026-09-30 (350 items)
    // FY 2570: 2026-10-01 to 2027-04-15 (500 items)
    const getDateForIndex = (i: number): { dateStr: string, fiscalYear: number } => {
        let year = 2026;
        let month = 10;
        let day = 1;
        let fiscalYear = 2570;

        if (i < 150) {
            // FY 2568: Oct 2024 to Sep 2025
            fiscalYear = 2568;
            const progress = i / 150;
            const monthOffset = Math.floor(progress * 12);
            if (monthOffset < 3) {
                year = 2024;
                month = 10 + monthOffset;
            } else {
                year = 2025;
                month = monthOffset - 2;
            }
            day = (i % 28) + 1;
        } else if (i < 500) {
            // FY 2569: Oct 2025 to Sep 2026
            fiscalYear = 2569;
            const progress = (i - 150) / 350;
            const monthOffset = Math.floor(progress * 12);
            if (monthOffset < 3) {
                year = 2025;
                month = 10 + monthOffset;
            } else {
                year = 2026;
                month = monthOffset - 2;
            }
            day = (i % 28) + 1;
        } else {
            // FY 2570: Oct 2026 onwards
            fiscalYear = 2570;
            const progress = (i - 500) / 500;
            const monthOffset = Math.floor(progress * 6); // Up to March 2027
            if (monthOffset < 3) {
                year = 2026;
                month = 10 + monthOffset;
            } else {
                year = 2027;
                month = monthOffset - 2;
            }
            day = (i % 28) + 1;
        }

        return {
            dateStr: `${year}-${padZero(month)}-${padZero(day)}`,
            fiscalYear
        };
    };

    // Tracking sequential numbers per fiscal year for request, consideration, receiving
    const fyCounters: Record<number, { po: number, ho: number, other: number, cons: number, recv: number }> = {
        2568: { po: 1, ho: 1, other: 1, cons: 1, recv: 1 },
        2569: { po: 1, ho: 1, other: 1, cons: 1, recv: 1 },
        2570: { po: 1, ho: 1, other: 1, cons: 1, recv: 1 }
    };

    for (let i = 0; i < TOTAL; i++) {
        const { dateStr, fiscalYear } = getDateForIndex(i);
        const counters = fyCounters[fiscalYear];

        // Type distribution: 65% Purchase, 28% Hiring, 7% Other
        const typeRoll = random();
        let recordType = RecordType.PURCHASE;
        let itemPool = PURCHASE_ITEMS;
        let seqNum = 1;

        if (typeRoll < 0.65) {
            recordType = RecordType.PURCHASE;
            itemPool = PURCHASE_ITEMS;
            seqNum = counters.po++;
        } else if (typeRoll < 0.93) {
            recordType = RecordType.HIRING;
            itemPool = HIRING_ITEMS;
            seqNum = counters.ho++;
        } else {
            recordType = RecordType.OTHER;
            itemPool = OTHER_ITEMS;
            seqNum = counters.other++;
        }

        const template = itemPool[Math.floor(random() * itemPool.length)];
        const vendor = VENDORS[Math.floor(random() * VENDORS.length)];
        const amount = getRandomInt(template.min, template.max);
        const itemCount = getRandomInt(1, 8);

        const requestId = `สพ ๐๐๓๓.๐๖/๑๔/${toThaiNum(seqNum)}`;
        const procId = `proc_gen_${i + 1}`;

        // Official order number
        let officialNumber: string | null = null;
        if (recordType === RecordType.PURCHASE) {
            officialNumber = `พด. ${seqNum}/${fiscalYear}`;
        } else if (recordType === RecordType.HIRING) {
            officialNumber = `จง. ${seqNum}/${fiscalYear}`;
        } else {
            officialNumber = `อต. ${seqNum}/${fiscalYear}`;
        }

        // Status simulation:
        // Older records (FY 2568, 2569) have high completion rate (>95%)
        // Current year (FY 2570) has realistic in-progress rate (~60% complete, 20% waiting recv, 20% waiting cons)
        let hasConsideration = false;
        let hasReceiving = false;

        if (fiscalYear < 2570) {
            hasConsideration = random() > 0.03; // 97% have consideration
            hasReceiving = hasConsideration && (random() > 0.05); // 95% of those have receiving
        } else {
            const statusRoll = random();
            if (statusRoll < 0.60) {
                hasConsideration = true;
                hasReceiving = true;
            } else if (statusRoll < 0.80) {
                hasConsideration = true;
                hasReceiving = false;
            } else {
                hasConsideration = false;
                hasReceiving = false;
            }
        }

        // Dates for linked stages
        const reqDateObj = new Date(dateStr);
        
        // Consideration date: 2 to 7 days after request
        const consDateObj = new Date(reqDateObj.getTime() + getRandomInt(2, 7) * 86400000);
        const consDateStr = consDateObj.toISOString().split('T')[0];

        // Receiving date: 5 to 15 days after consideration
        const recvDateObj = new Date(consDateObj.getTime() + getRandomInt(5, 15) * 86400000);
        const recvDateStr = recvDateObj.toISOString().split('T')[0];

        if (hasConsideration) {
            const consSeq = counters.cons++;
            considerations.push({
                id: `cons_gen_${consSeq}_${fiscalYear}`,
                requestId: requestId,
                considerationNumber: `สพ ๐๐๓๓.๐๖/รายงาน/${toThaiNum(consSeq)}`,
                considerationDate: consDateStr,
                procurementId: procId
            });
        }

        if (hasReceiving) {
            const recvSeq = counters.recv++;
            receivings.push({
                id: `recv_gen_${recvSeq}_${fiscalYear}`,
                requestId: requestId,
                deliveryNoteNo: `บข. ${toThaiNum(recvSeq)}/${toThaiNum(fiscalYear)}`,
                receiveDate: recvDateStr,
                createdAt: new Date(recvDateStr).getTime() || Date.now(),
                procurementId: procId
            });
        }

        // Realistic department mapping based on item category
        let deptId = 'dept_1';
        let createdBy = 'usr_admin';

        if (template.cat === 'ยาและเวชภัณฑ์' || template.cat === 'วัสดุการแพทย์' || template.cat === 'วัสดุวิทยาศาสตร์การแพทย์') {
            deptId = (i % 2 === 0) ? 'dept_3' : 'dept_4';
            createdBy = 'usr_staff';
        } else if (template.cat === 'วัสดุสำนักงาน' || template.cat === 'จ้างเหมาบริการ') {
            deptId = 'dept_2';
            createdBy = (i % 3 === 0) ? 'usr_admin' : 'usr_staff';
        } else {
            deptId = 'dept_1';
            createdBy = (i % 2 === 0) ? 'usr_admin' : 'usr_exec';
        }

        procurements.push({
            id: procId,
            requestId: requestId,
            requestDate: dateStr,
            category: template.cat,
            itemCount: itemCount,
            amount: amount,
            company: vendor,
            remarks: `${template.name} ตามแผนปฏิบัติการ รพ.สามชุก`,
            officialNumber: officialNumber,
            type: recordType,
            departmentId: deptId,
            createdBy: createdBy,
            createdAt: reqDateObj.getTime()
        });
    }

    return {
        procurements,
        considerations,
        receivings
    };
};
