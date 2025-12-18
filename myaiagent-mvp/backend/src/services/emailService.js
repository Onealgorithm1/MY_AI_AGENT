import { query } from '../utils/database.js';

class EmailService {
  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@werkules.com';
    // Check if we have credentials for real sending
    this.isConfigured = !!process.env.SMTP_HOST || !!process.env.GMAIL_CLIENT_ID;
  }

  /**
   * Send an email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Text content (fallback)
   */
  async sendEmail({ to, subject, html, text }) {
    console.log(`\n📧 ========= EMAIL SERVICE =========`);
    console.log(`To: ${to}`);
    console.log(`From: ${this.fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`-----------------------------------`);
    console.log(text || '(HTML Content)');
    console.log(`===================================\n`);

    // Log to database for audit trail
    // We already have 'activity_logs', but maybe a dedicated 'email_logs' is better?
    // For now, let's just ensure we return success.

    // TODO: Implement real sending via Nodemailer or Gmail API
    // if (this.isConfigured) { ... }

    return { success: true, messageId: `mock-${Date.now()}` };
  }

  /**
   * Send invitation email to a new user
   */
  async sendInvitationEmail(email, orgName, inviterName, link) {
    const subject = `Join ${orgName} on Werkules`;
    const text = `Hello,\n\n${inviterName} has invited you to join ${orgName} on Werkules.\n\nClick the link below to accept the invitation:\n${link}\n\nIf you did not expect this invitation, you can ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Werkules.</p>
        <p>Click the button below to get started:</p>
        <a href="${link}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">
          Or copy this link: <br>
          <a href="${link}">${link}</a>
        </p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, link) {
    const subject = `Reset your Werkules password`;
    const text = `Hello,\n\nWe received a request to reset your password.\n\nClick the link below to verify your identity and set a new password:\n${link}\n\nThis link will expire in 24 hours.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password. If you made this request, click the button below:</p>
        <a href="${link}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }
}

export default new EmailService();
