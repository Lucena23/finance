export interface EmailCidAttachment {
    filename: string;
    content: string;
    encoding: 'base64';
    cid: string;
}
export declare const getLogoCidAttachment: () => EmailCidAttachment;
export declare const getWelcomeEmailHtml: (name: string, verifyLink: string, _frontendUrl?: string) => string;
export declare const getVerificationSuccessHtml: (frontendUrl: string) => string;
