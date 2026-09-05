const nodemailer = require('nodemailer');

const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@emotune.app';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const isConfigured = () => !!EMAIL_HOST && !!EMAIL_USER;

let transporter = null;

function getTransporter() {
  if (!transporter && isConfigured()) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  }
  return transporter;
}

function buildResetOTPEmail(otp, email, expiryMinutes = 15) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1120;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${CLIENT_URL}/logo.png" alt="Emotune" width="64" height="64" style="border-radius:16px;" />
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#121826F2,#121826CC);border:1px solid #252F4599;border-radius:24px;padding:40px 32px;backdrop-filter:blur(20px);">
              <h1 style="color:#F8FAFC;font-size:24px;font-weight:700;margin:0 0 8px 0;text-align:center;">Reset your password</h1>
              <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 32px 0;text-align:center;">
                We received a request to reset the password for your Emotune account associated with <strong style="color:#94A3B8;">${email}</strong>.
              </p>
              <div style="text-align:center;margin-bottom:32px;">
                <div style="display:inline-block;background:#121826;border:1px solid #252F45;border-radius:16px;padding:20px 40px;">
                  <p style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px 0;">Verification Code</p>
                  <div style="letter-spacing:12px;font-size:40px;font-weight:700;color:#3B82F6;font-family:monospace;">${otp}</div>
                </div>
              </div>
              <p style="color:#64748B;font-size:13px;line-height:1.5;margin:0 0 24px 0;text-align:center;">
                This code expires in <strong style="color:#F59E0B;">${expiryMinutes} minutes</strong>. If you didn't request this, please ignore this email.
              </p>
              <div style="border-top:1px solid #252F4580;padding-top:20px;margin-top:20px;">
                <p style="color:#475569;font-size:12px;line-height:1.5;margin:0 0 4px 0;text-align:center;">
                  Need help? Contact <a href="mailto:support@emotune.app" style="color:#3B82F6;text-decoration:none;">support@emotune.app</a>
                </p>
                <p style="color:#475569;font-size:11px;line-height:1.5;margin:0;text-align:center;">
                  Emotune &bull; AI-Powered Conversations
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#475569;font-size:11px;margin:0;">
                This is an automated message from Emotune. Please do not reply.
              </p>
              <p style="color:#475569;font-size:11px;margin:8px 0 0 0;">
                &copy; ${new Date().getFullYear()} Emotune. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetSuccessEmail(email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1120;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${CLIENT_URL}/logo.png" alt="Emotune" width="64" height="64" style="border-radius:16px;" />
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#121826F2,#121826CC);border:1px solid #252F4599;border-radius:24px;padding:40px 32px;backdrop-filter:blur(20px);">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:#22C55E26;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
              <h1 style="color:#F8FAFC;font-size:24px;font-weight:700;margin:0 0 8px 0;text-align:center;">Password reset successful</h1>
              <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
                Your Emotune account password has been changed successfully. You can now sign in with your new password.
              </p>
              <div style="text-align:center;">
                <a href="${CLIENT_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
                  Sign In to Emotune
                </a>
              </div>
              <div style="border-top:1px solid #252F4580;padding-top:20px;margin-top:28px;">
                <p style="color:#475569;font-size:11px;line-height:1.5;margin:0;text-align:center;">
                  If you did not make this change, please contact <a href="mailto:support@emotune.app" style="color:#3B82F6;text-decoration:none;">support@emotune.app</a> immediately.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#475569;font-size:11px;margin:0;">
                &copy; ${new Date().getFullYear()} Emotune. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendPasswordResetOTP(toEmail, otp) {
  if (!isConfigured()) {
    console.log('[EmailService] Email not configured. OTP:', otp, 'for:', toEmail);
    return { sent: false, devMode: true, otp };
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"Emotune" <${EMAIL_FROM}>`,
      to: toEmail,
      subject: 'Reset your Emotune password',
      html: buildResetOTPEmail(otp, toEmail),
    });
    console.log('[EmailService] Password reset OTP sent to:', toEmail);
    return { sent: true };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    return { sent: false, error: err.message, devMode: true, otp };
  }
}

async function sendPasswordResetConfirmation(toEmail) {
  if (!isConfigured()) return { sent: false, devMode: true };

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"Emotune" <${EMAIL_FROM}>`,
      to: toEmail,
      subject: 'Your Emotune password has been changed',
      html: buildPasswordResetSuccessEmail(toEmail),
    });
    return { sent: true };
  } catch (err) {
    console.error('[EmailService] Failed to send confirmation:', err.message);
    return { sent: false };
  }
}

async function sendVerificationEmail(toEmail, token) {
  const verificationUrl = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  if (!isConfigured()) {
    console.log('[EmailService] Email not configured. Verification URL:', verificationUrl);
    return { sent: false, devMode: true };
  }
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"Emotune" <${EMAIL_FROM}>`,
      to: toEmail,
      subject: 'Verify your Emotune email',
      html: `<p>Verify your Emotune email by clicking <a href="${verificationUrl}">this link</a>.</p>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('[EmailService] Failed to send verification email:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  sendPasswordResetOTP,
  sendPasswordResetConfirmation,
  sendVerificationEmail,
  isEmailConfigured: isConfigured,
};
