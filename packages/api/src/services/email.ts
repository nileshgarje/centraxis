import nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Configure Nodemailer transport with SMTP or fallback to simulated console transport
 */
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

  // Fallback simulator for development/testing
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

  // Development simulation
  console.log(`
================================================================================
📧 [SIMULATED TRANSACTIONAL EMAIL]
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

// -----------------------------------------------------------------------------
// Template 1: User Invitation Email
// -----------------------------------------------------------------------------
export function renderUserInvitationEmail({
  orgName,
  inviterName,
  role,
  acceptUrl,
  clientName,
}: {
  orgName: string;
  inviterName?: string;
  role: string;
  acceptUrl: string;
  clientName?: string | null;
}) {
  const targetName = clientName ? `${clientName} on ${orgName}` : orgName;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to join Centraxis</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 24px; text-align: center;">
      <span style="font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px;">CENTRAXIS</span>
      <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">by Centvis Enterprise Agile</span>
    </div>

    <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; text-align: center;">
      You've been invited to join ${targetName}
    </h2>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : "You have been invited"} to join <strong>${targetName}</strong> as a <strong>${role}</strong>.
    </p>

    <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 28px; border: 1px solid #334155;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">Authentication Note:</div>
      <div style="font-size: 13px; color: #e2e8f0; line-height: 1.5;">
        Members with <strong>@centvis.com</strong> Microsoft accounts can sign in directly via Microsoft Entra ID SSO. External contractors can set their credentials on accept.
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${acceptUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
        Accept Invitation & Get Started &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; margin: 0;">
      If the button above doesn't work, copy and paste this URL into your browser:<br>
      <a href="${acceptUrl}" style="color: #818cf8; word-break: break-all;">${acceptUrl}</a>
    </p>
  </div>
</body>
</html>
  `;
}

// -----------------------------------------------------------------------------
// Template 2: Sprint Started Email
// -----------------------------------------------------------------------------
export function renderSprintStartedEmail({
  sprintName,
  teamName,
  startDate,
  endDate,
  totalPoints,
  sprintUrl,
}: {
  sprintName: string;
  teamName?: string;
  startDate?: string | null;
  endDate?: string | null;
  totalPoints?: number;
  sprintUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sprint ${sprintName} Started</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 1px;">Sprint Active</span>
      <h2 style="font-size: 22px; font-weight: 700; color: #f8fafc; margin: 6px 0 0 0;">
        ${sprintName} has kicked off!
      </h2>
      ${teamName ? `<p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0 0;">Team: ${teamName}</p>` : ""}
    </div>

    <div style="background-color: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #334155; display: flex; justify-content: space-between;">
      <div>
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Dates</div>
        <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 4px;">
          ${startDate || "Today"} &ndash; ${endDate || "Next 2 weeks"}
        </div>
      </div>
      ${
        totalPoints !== undefined
          ? `
      <div>
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Committed Points</div>
        <div style="font-size: 14px; font-weight: 700; color: #818cf8; margin-top: 4px;">
          ${totalPoints} pts
        </div>
      </div>
      `
          : ""
      }
    </div>

    <div style="text-align: center; margin-bottom: 12px;">
      <a href="${sprintUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
        Open Active Kanban Board &rarr;
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

// -----------------------------------------------------------------------------
// Template 3: Assignment Notification Email
// -----------------------------------------------------------------------------
export function renderAssignmentNotificationEmail({
  itemKey,
  itemTitle,
  itemType,
  itemPriority,
  assignerName,
  itemUrl,
}: {
  itemKey: string;
  itemTitle: string;
  itemType: string;
  itemPriority: string;
  assignerName?: string;
  itemUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assigned to ${itemKey}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px;">Task Assignment</span>
      <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 6px 0 0 0;">
        You were assigned to ${itemKey}
      </h2>
      ${assignerName ? `<p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0 0;">Assigned by: ${assignerName}</p>` : ""}
    </div>

    <div style="background-color: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #6366f1; background-color: rgba(99, 102, 241, 0.15); padding: 2px 6px; border-radius: 4px;">${itemKey}</span>
        <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; background-color: #334155; padding: 2px 6px; border-radius: 4px;">${itemType}</span>
        <span style="font-size: 11px; font-weight: 600; color: #f59e0b; background-color: rgba(245, 158, 11, 0.15); padding: 2px 6px; border-radius: 4px;">${itemPriority}</span>
      </div>
      <div style="font-size: 15px; font-weight: 600; color: #f8fafc; line-height: 1.4;">
        ${itemTitle}
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${itemUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
        View Work Item &rarr;
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

// -----------------------------------------------------------------------------
// Template 4: 8-Digit Email Verification Code
// -----------------------------------------------------------------------------
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

    <!-- 8-Digit Code Display Box -->
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
