// ──────────────────────────────────────────────────────────
// Email Service — Resend integration
// ──────────────────────────────────────────────────────────

import { Resend } from 'resend';

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'From Sprue to Glory <noreply@fromspruetoglory.com>';

function getResend(): Resend {
    return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const { error } = await getResend().emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: 'Reset your password — From Sprue to Glory',
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #1a1212; color: #dbc2ad;">
                <div style="width: 32px; height: 3px; background: #d4a34a; margin-bottom: 16px;"></div>
                <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #d4a34a; margin: 0 0 24px;">
                    From Sprue to Glory
                </h1>
                <p style="margin: 0 0 8px; font-size: 0.9rem; color: rgba(219,194,173,0.8);">
                    You requested a password reset. Click the link below — it expires in <strong>1 hour</strong>.
                </p>
                <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #ffc081, #ff9800); color: #2c1600; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 4px;">
                    Reset Password
                </a>
                <p style="margin: 0; font-size: 0.75rem; color: rgba(219,194,173,0.35);">
                    If you didn't request this, ignore this email. Your password won't change.
                </p>
            </div>
        `,
    });

    if (error) {
        throw new Error(`Resend error: ${error.message}`);
    }
}
