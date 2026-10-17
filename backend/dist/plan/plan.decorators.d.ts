import { PremiumFeature } from './plan.constants';
export declare const REQUIRES_PREMIUM_KEY = "requiresPremium";
export declare const MEMBER_WRITE_KEY = "memberWriteRequiresPlan";
export declare const RequiresPremium: (feature: PremiumFeature) => MethodDecorator & ClassDecorator;
export declare const MemberWriteRequiresPlan: () => MethodDecorator & ClassDecorator;
