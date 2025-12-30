import nodemailer from 'nodemailer';
import { getApiKey } from '../utils/apiKeys.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  async getTransporter() {
    // 1. Check Environment Variables first (Priority)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }

    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // 2. Check Database (System Settings)
    try {
      const dbConfigStr = await getApiKey('system_email');
      if (dbConfigStr) {
        const config = JSON.parse(dbConfigStr);

        if (config.service === 'gmail') {
          return nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: config.user,
              pass: config.pass,
            },
          });
        }

        if (config.host) {
          return nodemailer.createTransport({
            host: config.host,
            port: config.port || 587,
            secure: config.secure === true,
            auth: {
              user: config.user,
              pass: config.pass,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching email config from DB:', error);
    }

    // 3. No config found
    return null;
  }

  async getFromAddress() {
    return process.env.EMAIL_FROM || 'noreply@werkules.com';
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, text }) {
    const transporter = await this.getTransporter();
    const fromAddress = await this.getFromAddress();

    if (!transporter) {
      console.log(`\n📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: `Werkules Admin <${fromAddress}>`,
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
  async sendInvitationEmail(email, orgName, inviterName, link, password = null) {
    const subject = `Join ${orgName} on Werkules`;

    let passwordSectionText = '';
    let passwordSectionHtml = '';

    if (password) {
      passwordSectionText = `\n\nYour temporary password is: ${password}\n\nPlease use this password to log in, then change it in your profile settings.`;
      passwordSectionHtml = `
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 0; color: #374151; font-weight: bold;">Temporary Password:</p>
          <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 18px; color: #111827;">${password}</p>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 13px;">Please change this password after your first login.</p>
        </div>
      `;
    }

    const text = `Hello,\n\n${inviterName} has invited you to join ${orgName} on Werkules.${passwordSectionText}\n\nClick the link below to accept the invitation:\n${link}\n\nIf you did not expect this invitation, you can ignore this email.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #111827; margin-top: 0;">You've been invited!</h2>
        <p style="color: #4b5563; font-size: 16px;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Werkules.</p>
        ${passwordSectionHtml}
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
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link will expire in 24 hours.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }
}

export default new EmailService();
