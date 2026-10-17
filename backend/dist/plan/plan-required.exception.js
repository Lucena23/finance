"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanRequiredException = void 0;
const common_1 = require("@nestjs/common");
const plan_constants_1 = require("./plan.constants");
class PlanRequiredException extends common_1.HttpException {
    constructor(feature, message) {
        super({
            statusCode: common_1.HttpStatus.PAYMENT_REQUIRED,
            code: plan_constants_1.PLAN_REQUIRED_CODE,
            feature,
            message,
        }, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
}
exports.PlanRequiredException = PlanRequiredException;
//# sourceMappingURL=plan-required.exception.js.map