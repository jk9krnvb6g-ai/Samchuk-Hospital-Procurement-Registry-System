/**
 * Formatting utilities for Thai Currency and Numbers
 */
export const formatCurrency = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return '0.00 บาท';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
};

export const formatNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    return Number(num).toLocaleString('th-TH');
};
