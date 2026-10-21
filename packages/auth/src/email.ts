import nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

const transport = createTransport();

export async function sendEmail({ to, subject, html, text }: SendMailOptions) {
  const from =
    process.env.EMAIL_FROM || "Centraxis <notifications@centvis.com>";

  if (transport) {
    try {
      const info = await transport.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ""),
      });
      console.log(`[Email] Message sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Error] Failed to send email to ${to}:`, error);
      return { success: false, error };
    }
  }

  // Development / fallback simulation
  console.log(`
================================================================================
📧 [CENTRAXIS VERIFICATION EMAIL]
--------------------------------------------------------------------------------
From:    ${from}
To:      ${to}
Subject: ${subject}
--------------------------------------------------------------------------------
${text || html.replace(/<[^>]*>?/gm, "")}
================================================================================
`);
  return { success: true, simulated: true };
}

export function renderVerificationCodeEmail({
  code,
  email,
  expiresMinutes = 15,
}: {
  code: string;
  email: string;
  expiresMinutes?: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Centraxis Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 24px; text-align: center;">
      <span style="font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px;">CENTRAXIS</span>
      <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">by Centvis Enterprise Agile</span>
    </div>

    <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; text-align: center;">
      Verify Your Email Address
    </h2>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; text-align: center;">
      An account verification was requested for <strong style="color: #f8fafc;">${email}</strong> to access the Centraxis Agile platform. Use the 8-digit verification code below to verify your email and activate your access:
    </p>

    <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 28px; border: 1px solid #334155; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
        8-Digit Verification Code
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; padding: 8px 16px; background-color: #0b1120; border-radius: 8px; border: 1px solid #1e293b; display: inline-block;">
        ${code}
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 14px;">
        This code expires in <strong>${expiresMinutes} minutes</strong>. Do not share this code with anyone.
      </div>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; margin: 0;">
      If you did not request this verification code, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `;
}

export async function sendVerificationCodeEmail({
  to,
  code,
  expiresMinutes = 15,
}: {
  to: string;
  code: string;
  expiresMinutes?: number;
}) {
  const html = renderVerificationCodeEmail({
    code,
    email: to,
    expiresMinutes,
  });

  return sendEmail({
    to,
    subject: `Your Centraxis verification code: ${code}`,
    html,
    text: `Your Centraxis 8-digit verification code is: ${code}. It expires in ${expiresMinutes} minutes.`,
  });
}
