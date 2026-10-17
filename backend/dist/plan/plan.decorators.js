"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberWriteRequiresPlan = exports.RequiresPremium = exports.MEMBER_WRITE_KEY = exports.REQUIRES_PREMIUM_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRES_PREMIUM_KEY = 'requiresPremium';
exports.MEMBER_WRITE_KEY = 'memberWriteRequiresPlan';
const RequiresPremium = (feature) => (0, common_1.SetMetadata)(exports.REQUIRES_PREMIUM_KEY, feature);
exports.RequiresPremium = RequiresPremium;
const MemberWriteRequiresPlan = () => (0, common_1.SetMetadata)(exports.MEMBER_WRITE_KEY, true);
exports.MemberWriteRequiresPlan = MemberWriteRequiresPlan;
//# sourceMappingURL=plan.decorators.js.map