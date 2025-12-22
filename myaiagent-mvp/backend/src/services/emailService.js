import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@werkules.com';
    this.transporter = null;

    // Initialize Nodemailer if credentials exist
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      console.log('✅ Email Service: Configured with Gmail');
    } else if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✅ Email Service: Configured with SMTP');
    } else {
      console.log('⚠️ Email Service: No credentials found, running in mock mode');
    }
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
    if (!this.transporter) {
      console.log(`\n📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `Werkules Admin <${this.fromAddress}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`✅ Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send invitation email to a new user
   */
  async sendInvitationEmail(email, orgName, inviterName, link) {
    const subject = `Join ${orgName} on Werkules`;
    const text = `Hello,\n\n${inviterName} has invited you to join ${orgName} on Werkules.\n\nClick the link below to accept the invitation:\n${link}\n\nIf you did not expect this invitation, you can ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #111827; margin-top: 0;">You've been invited!</h2>
        <p style="color: #4b5563; font-size: 16px;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Werkules.</p>
        <div style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 14px;"><a href="${link}" style="color: #2563EB;">${link}</a></p>
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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #4b5563; font-size: 16px;">We received a request to reset your password for your Werkules account.</p>
        <div style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">此 link will expire in 24 hours.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }
}

export default new EmailService();
