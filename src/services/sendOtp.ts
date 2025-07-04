import { Context } from "hono";

function sendEmailOtp(uri: string, to: string, otp: string) {
    return fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to,
            subject: '[Xemdi]: Mã bảo mật của bạn',
            text: otp,
        }),
    });
}
function sendSmsOtp(uri: string, to: string, otp: string) {
    return fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to,
            message: `[Xemdi] Mã OTP của bạn là: ${otp}`,
        }),
    });
}

export async function sendOtp(c: Context, identifier: string, type:  "email" | "phone" | "username", otp: string) {
    try {
        switch (type) {
            case 'email':
                c.executionCtx.waitUntil(sendEmailOtp(c.env.MAILER_URI, identifier, otp).then(r => {
                    console.log(`Email OTP sent successfully to ${identifier}`);
                }));
                break;
            case 'phone':
                c.executionCtx.waitUntil(sendSmsOtp(c.env.SMS_API_URI, identifier, otp).then(r => {
                    console.log(`SMS OTP sent successfully to ${identifier}`);
                }));
                break;
            default:
                throw new Error('Unsupported type');
        }

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        c.executionCtx.waitUntil(
            Promise.resolve().then(() => {
                console.error('Error sending OTP:', error);
            })
        );
        return { success: false, message: 'Failed to send OTP', error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
