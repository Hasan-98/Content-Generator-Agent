import nodemailer from 'nodemailer';

function getTransporter() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendInviteEmail(opts: {
  toEmail: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}): Promise<void> {
  const { toEmail, inviterName, role, inviteLink } = opts;
  const fromName = process.env.SMTP_FROM_NAME || 'Content Creator Studio';
  const fromEmail = process.env.SMTP_USER || 'noreply@example.com';

  const roleLabel = role === 'VIEWER' ? 'Viewer' : role === 'ADMIN' ? 'Admin' : 'Editor';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're Invited</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #30363d;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1c2333 0%,#0d1117 100%);padding:36px 40px 28px;border-bottom:1px solid #30363d;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:#58a6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#0d1117;font-weight:900;font-size:18px;">C</span>
                      </div>
                      <span style="color:#e6edf3;font-size:16px;font-weight:700;letter-spacing:-0.3px;">Content Creator Studio</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 0;">
              <div style="text-align:center;">
                <div style="width:72px;height:72px;background:#21262d;border:2px solid #30363d;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:32px;">✉️</span>
                </div>
                <h1 style="color:#e6edf3;font-size:26px;font-weight:800;margin:0 0 10px;letter-spacing:-0.5px;">You're invited!</h1>
                <p style="color:#8b949e;font-size:15px;margin:0;line-height:1.6;">
                  <strong style="color:#58a6ff;">${inviterName}</strong> has invited you to join their<br/>
                  <strong style="color:#e6edf3;">Content Creator Studio</strong> workspace.
                </p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px;">
              <div style="height:1px;background:#30363d;"></div>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#21262d;border:1px solid #30363d;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:18px 20px;border-bottom:1px solid #30363d;">
                    <span style="color:#8b949e;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.8px;">Invited by</span><br/>
                    <span style="color:#e6edf3;font-size:14px;font-weight:600;">${inviterName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 20px;">
                    <span style="color:#8b949e;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.8px;">Your role</span><br/>
                    <span style="display:inline-block;margin-top:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:${role === 'ADMIN' ? 'rgba(188,140,255,0.15)' : role === 'VIEWER' ? 'rgba(139,148,158,0.15)' : 'rgba(88,166,255,0.15)'};color:${role === 'ADMIN' ? '#bc8cff' : role === 'VIEWER' ? '#8b949e' : '#58a6ff'};">${roleLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What you'll get -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="color:#8b949e;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What's inside</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['🎯', 'AI-powered keyword & title generation'],
                  ['🧑‍💼', 'Audience persona builder'],
                  ['✍️', 'Full blog article writer'],
                  ['🖼️', 'Image generation & management'],
                  ['🚀', 'One-click WordPress/Shopify publishing'],
                ].map(([icon, text]) => `
                <tr>
                  <td style="padding:5px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;font-size:16px;vertical-align:middle;">${icon}</td>
                        <td style="color:#8b949e;font-size:13px;vertical-align:middle;line-height:1.5;">${text}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <a href="${inviteLink}"
                 style="display:inline-block;padding:14px 40px;background:#58a6ff;color:#0d1117;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:-0.2px;">
                Accept Invitation &amp; Create Account
              </a>
              <p style="color:#484f58;font-size:11px;margin:16px 0 0;">
                This invitation link expires in <strong style="color:#8b949e;">7 days</strong>.<br/>
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #30363d;text-align:center;">
              <p style="color:#484f58;font-size:11px;margin:0;line-height:1.6;">
                Sent by Content Creator Studio &bull; If the button doesn't work, copy this link:<br/>
                <a href="${inviteLink}" style="color:#58a6ff;font-size:10px;word-break:break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `${inviterName} invited you to Content Creator Studio`,
    html,
  });
}
