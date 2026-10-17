"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVATAR_COLOR_PALETTE = void 0;
exports.pickAvatarColor = pickAvatarColor;
exports.AVATAR_COLOR_PALETTE = [
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#EAB308',
    '#84CC16',
    '#22C55E',
    '#10B981',
    '#14B8A6',
    '#06B6D4',
    '#0EA5E9',
    '#3B82F6',
    '#6366F1',
    '#8B5CF6',
    '#A855F7',
    '#D946EF',
    '#EC4899',
];
function pickAvatarColor(usedColors) {
    const used = new Set(usedColors.map((color) => color.toUpperCase()));
    const available = exports.AVATAR_COLOR_PALETTE.find((color) => !used.has(color.toUpperCase()));
    if (available) {
        return available;
    }
    const seed = usedColors.length;
    const value = (seed * 2654435761) % 0xffffff;
    return `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
}
//# sourceMappingURL=avatar-color.util.js.map