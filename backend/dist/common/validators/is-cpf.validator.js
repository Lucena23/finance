"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsCpf = IsCpf;
const class_validator_1 = require("class-validator");
const cpf_util_1 = require("../utils/cpf.util");
function IsCpf(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isCpf',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    return typeof value === 'string' && (0, cpf_util_1.isValidCpf)(value);
                },
                defaultMessage(args) {
                    return `${args.property} deve ser um CPF válido.`;
                },
            },
        });
    };
}
//# sourceMappingURL=is-cpf.validator.js.map