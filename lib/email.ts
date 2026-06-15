import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendInviteEmail(to: string, token: string) {
  const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
  const inviteUrl = `${appUrl}/invite/${token}`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'You have been invited to ToolTrack',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:22px;">ToolTrack</h1>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Internal Tool Inventory System</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e293b;margin:0 0 12px;">You've been invited!</h2>
          <p style="color:#475569;margin:0 0 20px;">You have been invited to join the ToolTrack tool inventory system. Click the button below to complete your registration.</p>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">This link expires in <strong>48 hours</strong>.</p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
              Complete Registration
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">If you did not expect this invitation, you can safely ignore this email.</p>
          <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Or copy this link:<br/><span style="color:#2563eb;">${inviteUrl}</span></p>
        </div>
      </div>
    `,
  })
}
