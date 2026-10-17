"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalAdminOnly = exports.GLOBAL_ADMIN_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.GLOBAL_ADMIN_KEY = 'isGlobalAdminRoute';
const GlobalAdminOnly = () => (0, common_1.SetMetadata)(exports.GLOBAL_ADMIN_KEY, true);
exports.GlobalAdminOnly = GlobalAdminOnly;
//# sourceMappingURL=global-admin.decorator.js.map