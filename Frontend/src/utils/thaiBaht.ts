/**
 * แปลงจำนวนเงินเป็นตัวอักษรภาษาไทยตามมาตรฐานราชการ
 * e.g. 125500 -> "(หนึ่งแสนสองหมื่นห้าพันห้าร้อยบาทถ้วน)"
 */
export const thaiBahtText = (num: number | string): string => {
    const n = Number(num);
    if (isNaN(n) || n === 0) return '';
    if (n < 0) return '(ลบ' + thaiBahtText(Math.abs(n)).slice(1);

    const textNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const textUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    const formatGroup = (digits: string): string => {
        let res = '';
        const len = digits.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(digits[i], 10);
            const unit = len - i - 1;
            if (digit !== 0) {
                if (unit === 1 && digit === 1) {
                    res += 'สิบ';
                } else if (unit === 1 && digit === 2) {
                    res += 'ยี่สิบ';
                } else if (unit === 0 && digit === 1 && len > 1 && digits[i - 1] !== '0') {
                    res += 'เอ็ด';
                } else {
                    res += textNum[digit] + textUnit[unit];
                }
            }
        }
        return res;
    };

    const [intPart, decPart] = n.toFixed(2).split('.');
    let baht = '';

    if (intPart.length > 6) {
        const millionPart = intPart.substring(0, intPart.length - 6);
        const restPart = intPart.substring(intPart.length - 6);
        baht = formatGroup(millionPart) + 'ล้าน' + formatGroup(restPart);
    } else {
        baht = formatGroup(intPart);
    }

    if (!baht) baht = 'ศูนย์';
    baht += 'บาท';

    const satangNum = parseInt(decPart, 10);
    if (satangNum === 0) {
        baht += 'ถ้วน';
    } else {
        baht += formatGroup(decPart) + 'สตางค์';
    }

    return `(${baht})`;
};
