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
  const appUrl = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 'http://localhost:3000').replace(/\/$/, '')
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
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">This link expires in <strong>7 days</strong>.</p>
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

export async function sendProcurementEmail(
  to: string[],
  details: {
    requesterName: string
    projectName: string
    neverStocked: { name: string; qty: number }[]
    lowStock: { name: string; qty: number; currentStock: number }[]
    linkUrl: string
  }
) {
  if (to.length === 0) return

  const appUrl = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 'http://localhost:3000').replace(/\/$/, '')
  const { requesterName, projectName, neverStocked, lowStock } = details

  const renderSection = (title: string, rows: string[]) =>
    rows.length === 0 ? '' : `
        <h3 style="color:#1e293b;margin:20px 0 8px;font-size:15px;">${title}</h3>
        <ul style="color:#475569;margin:0;padding-left:18px;">
          ${rows.map((r) => `<li style="margin-bottom:4px;">${r}</li>`).join('')}
        </ul>`

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
      <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">ToolTrack</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Internal Tool Inventory System</p>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e293b;margin:0 0 12px;">⚠️ Items need to be purchased</h2>
        <p style="color:#475569;margin:0 0 8px;"><strong>${requesterName}</strong> requested items for <strong>${projectName}</strong> that need procurement.</p>
        ${renderSection('New items to source (never in warehouse)', neverStocked.map((i) => `${i.name} — qty ${i.qty}`))}
        ${renderSection('Reorder — running low', lowStock.map((i) => `${i.name} — need ${i.qty}, only ${i.currentStock} on hand`))}
        <div style="text-align:center;margin:24px 0 0;">
          <a href="${appUrl}${details.linkUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            View Request
          </a>
        </div>
      </div>
    </div>
  `

  const transporter = createTransporter()
  await Promise.allSettled(
    to.map((recipient) =>
      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: '⚠️ ToolTrack — Items need to be purchased',
        html,
      })
    )
  )
}
