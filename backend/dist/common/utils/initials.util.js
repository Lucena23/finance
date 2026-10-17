"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitials = getInitials;
function getInitials(name) {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0);
    if (parts.length === 0) {
        return '';
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}
//# sourceMappingURL=initials.util.js.map