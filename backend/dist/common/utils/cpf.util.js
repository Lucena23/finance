"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripCpf = stripCpf;
exports.isValidCpf = isValidCpf;
exports.formatCpf = formatCpf;
exports.maskCpfForDisplay = maskCpfForDisplay;
function stripCpf(cpf) {
    return cpf.replace(/\D/g, '');
}
function isValidCpf(cpf) {
    const digits = stripCpf(cpf);
    if (digits.length !== 11) {
        return false;
    }
    if (/^(\d)\1{10}$/.test(digits)) {
        return false;
    }
    const calcCheckDigit = (base) => {
        let sum = 0;
        for (let i = 0; i < base.length; i += 1) {
            sum += Number(base.charAt(i)) * (base.length + 1 - i);
        }
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };
    const firstCheck = calcCheckDigit(digits.slice(0, 9));
    const secondCheck = calcCheckDigit(digits.slice(0, 10));
    return (firstCheck === Number(digits.charAt(9)) &&
        secondCheck === Number(digits.charAt(10)));
}
function formatCpf(cpf) {
    const digits = stripCpf(cpf);
    if (digits.length !== 11) {
        throw new Error('CPF inválido: deve conter 11 dígitos.');
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
function maskCpfForDisplay(cpf) {
    const digits = stripCpf(cpf);
    if (digits.length !== 11) {
        return '***.***.***-**';
    }
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
//# sourceMappingURL=cpf.util.js.map