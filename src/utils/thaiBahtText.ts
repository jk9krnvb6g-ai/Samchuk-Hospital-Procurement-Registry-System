/**
 * Convert number into Thai Baht text string
 * Example: 15400 -> "หนึ่งหมื่นห้าพันสี่ร้อยบาทถ้วน"
 */
export const thaiBahtText = (num: number | string): string => {
    const val = Number(num);
    if (isNaN(val) || val <= 0) return 'ศูนย์บาทถ้วน';

    const thaiNums = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    const [integerStr, decimalStr = '00'] = val.toFixed(2).split('.');

    const convertGroup = (digits: string, isMillion: boolean = false): string => {
        let text = '';
        const len = digits.length;

        for (let i = 0; i < len; i++) {
            const digit = parseInt(digits[i], 10);
            const unit = thaiUnits[len - i - 1];

            if (digit !== 0) {
                if (unit === 'สิบ' && digit === 1) {
                    text += '';
                } else if (unit === 'สิบ' && digit === 2) {
                    text += 'ยี่';
                } else if (unit === '' && digit === 1 && len > 1 && (isMillion || parseInt(digits[len - 2], 10) !== 0)) {
                    text += 'เอ็ด';
                } else {
                    text += thaiNums[digit];
                }
                text += unit;
            }
        }
        return text;
    };

    let result = '';
    const intLen = integerStr.length;

    if (intLen > 6) {
        const millionPart = integerStr.slice(0, intLen - 6);
        const remainderPart = integerStr.slice(intLen - 6);
        result += convertGroup(millionPart, true) + 'ล้าน' + convertGroup(remainderPart, false);
    } else {
        result += convertGroup(integerStr, false);
    }

    result += 'บาท';

    const decVal = parseInt(decimalStr.slice(0, 2), 10);
    if (decVal === 0) {
        result += 'ถ้วน';
    } else {
        result += convertGroup(decimalStr.slice(0, 2), false) + 'สตางค์';
    }

    return result;
};

/**
 * Get Public Procurement Method based on Thai Law (พ.ร.บ. จัดซื้อจัดจ้างฯ 2560)
 */
export const getProcurementMethod = (amount: number): { name: string; tag: string; color: string; desc: string } => {
    if (amount <= 100000) {
        return {
            name: 'วิธีเฉพาะเจาะจง (วงเงินเล็กน้อย)',
            tag: 'เฉพาะเจาะจง <= 1 แสน',
            color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            desc: 'วงเงินไม่เกิน 100,000 บาท สามารถจัดซื้อจัดจ้างโดยวิธีเฉพาะเจาะจง'
        };
    } else if (amount <= 500000) {
        return {
            name: 'วิธีเฉพาะเจาะจง (ไม่เกิน 5 แสน)',
            tag: 'เฉพาะเจาะจง <= 5 แสน',
            color: 'bg-teal-50 text-teal-800 border-teal-200',
            desc: 'วงเงินไม่เกิน 500,000 บาท ตามมาตรา 56 (2) (ข)'
        };
    } else if (amount <= 5000000) {
        return {
            name: 'วิธีประกวดราคาอิเล็กทรอนิกส์ (e-Bidding)',
            tag: 'e-Bidding (> 5 แสน)',
            color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            desc: 'วงเงินเกิน 500,000 บาท แต่ไม่เกิน 5,000,000 บาท ต้องดำเนินการผ่าน e-GP'
        };
    } else {
        return {
            name: 'วิธีประกวดราคาอิเล็กทรอนิกส์ / คัดเลือก',
            tag: 'e-Bidding วงเงินสูง (> 5 ล้าน)',
            color: 'bg-purple-50 text-purple-800 border-purple-200',
            desc: 'วงเงินเกิน 5,000,000 บาท เข้าเงื่อนไขควบคุมพิเศษของส่วนราชการ'
        };
    }
};
