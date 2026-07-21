import nodemailer from 'nodemailer'
import { generateDeliveryNotePdf } from '@/lib/pdf-delivery-note'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
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
    subject: 'Povabljeni ste v BuildFlow',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:22px;">BuildFlow</h1>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Upravljanje inventarja orodij</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e293b;margin:0 0 12px;">Bili ste povabljeni!</h2>
          <p style="color:#475569;margin:0 0 20px;">Povabljeni ste v sistem za upravljanje inventarja orodij BuildFlow. Kliknite spodnji gumb za dokončanje registracije.</p>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Ta povezava poteče čez <strong>7 dni</strong>.</p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
              Dokončaj registracijo
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Če tega povabila niste pričakovali, ga lahko varno prezrete.</p>
          <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Ali kopirajte to povezavo:<br/><span style="color:#2563eb;">${inviteUrl}</span></p>
        </div>
      </div>
    `,
  })
}

export async function sendNewOrgNotificationEmail(
  to: string,
  details: {
    orgName: string
    adminName: string
    adminEmail: string
    registeredAt: Date
  }
) {
  const appUrl = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 'http://localhost:3000').replace(/\/$/, '')
  const { orgName, adminName, adminEmail, registeredAt } = details
  const dateStr = registeredAt.toLocaleString('sl-SI', { dateStyle: 'full', timeStyle: 'short' })

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
      <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">BuildFlow</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Super Admin Notification</p>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e293b;margin:0 0 16px;font-size:18px;">New organization registration — awaiting your approval</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">Organization</td><td style="padding:8px 0;color:#1e293b;font-size:13px;font-weight:600;">${orgName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Admin name</td><td style="padding:8px 0;color:#1e293b;font-size:13px;">${adminName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Admin email</td><td style="padding:8px 0;color:#1e293b;font-size:13px;">${adminEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Registered at</td><td style="padding:8px 0;color:#1e293b;font-size:13px;">${dateStr}</td></tr>
        </table>
        <p style="color:#475569;font-size:13px;margin:0 0 20px;">The organization's account is <strong>inactive</strong> until you approve it. Log in to the super-admin panel to activate it.</p>
        <div style="text-align:center;">
          <a href="${appUrl}/super-admin" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            Open Super Admin Panel
          </a>
        </div>
      </div>
    </div>
  `

  const transporter = createTransporter()
  await transporter.verify()
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `BuildFlow – New registration: ${orgName} (pending approval)`,
    html,
  })
}

export async function sendDeliveryNoteEmail(
  to: string[],
  details: {
    requestId: string
    requesterName: string
    confirmedByName: string
    projectName: string | null
    status: string
    confirmedAt: Date
    items: { name: string; requestedQty: number; approvedQty: number }[]
    adminNotes?: string | null
  }
) {
  if (to.length === 0) return

  const appUrl = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 'http://localhost:3000').replace(/\/$/, '')
  const { requestId, requesterName, confirmedByName, projectName, status, confirmedAt, items, adminNotes } = details

  const refNumber = requestId.slice(-8).toUpperCase()
  const dateStr = confirmedAt.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = confirmedAt.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })

  const statusLabel = status === 'APPROVED' ? 'Potrjeno' : 'Delno potrjeno'
  const statusColor = status === 'APPROVED' ? '#15803d' : '#b45309'
  const statusBg    = status === 'APPROVED' ? '#dcfce7'  : '#fef3c7'

  const approvedItems = items.filter((i) => i.approvedQty > 0)

  const itemRows = approvedItems.map((item, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#f8fafc' : 'white'};">
      <td style="padding:10px 14px;color:#1e293b;font-size:13px;border-bottom:1px solid #e2e8f0;">${item.name}</td>
      <td style="padding:10px 14px;text-align:center;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">${item.requestedQty}</td>
      <td style="padding:10px 14px;text-align:center;font-size:13px;font-weight:600;color:${statusColor};border-bottom:1px solid #e2e8f0;">${item.approvedQty}</td>
    </tr>`).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
      <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">BuildFlow</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Upravljanje inventarja orodij</p>
      </div>

      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">

        <!-- Header row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #1e40af;padding-bottom:16px;">
          <div>
            <h2 style="color:#1e293b;margin:0 0 4px;font-size:20px;font-weight:700;">DOBAVNICA</h2>
            <p style="color:#64748b;margin:0;font-size:13px;">Delivery Note</p>
          </div>
          <div style="text-align:right;">
            <p style="color:#1e293b;margin:0;font-size:13px;font-weight:600;">Ref: #${refNumber}</p>
            <p style="color:#64748b;margin:4px 0 0;font-size:12px;">${dateStr} ob ${timeStr}</p>
            <span style="display:inline-block;margin-top:6px;background:${statusBg};color:${statusColor};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${statusLabel}</span>
          </div>
        </div>

        <!-- Parties -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
          <div style="background:#f1f5f9;border-radius:8px;padding:14px;">
            <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Naročnik</p>
            <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${requesterName}</p>
            ${projectName ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0;">Projekt: ${projectName}</p>` : ''}
          </div>
          <div style="background:#f1f5f9;border-radius:8px;padding:14px;">
            <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Potrdil</p>
            <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${confirmedByName}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">${dateStr}</p>
          </div>
        </div>

        <!-- Items table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:${adminNotes ? '16px' : '24px'};">
          <thead>
            <tr style="background:#1e40af;">
              <th style="padding:10px 14px;text-align:left;color:white;font-size:12px;font-weight:600;border-radius:6px 0 0 0;">Artikel</th>
              <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;font-weight:600;">Zahtevano</th>
              <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;font-weight:600;border-radius:0 6px 0 0;">Odobreno</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        ${adminNotes ? `
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
          <p style="color:#92400e;font-size:12px;font-weight:600;margin:0 0 4px;">Opomba administratorja:</p>
          <p style="color:#78350f;font-size:13px;margin:0;">${adminNotes}</p>
        </div>` : ''}

        <div style="text-align:center;">
          <a href="${appUrl}/requests/${requestId}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
            Oglej zahtevek
          </a>
        </div>

        <p style="color:#94a3b8;font-size:11px;text-align:center;margin:20px 0 0;">
          Ta dokument je bil samodejno ustvarjen s sistemom BuildFlow.<br/>
          Ref: #${refNumber} · ${dateStr}
        </p>
      </div>
    </div>
  `

  const pdfBuffer = await generateDeliveryNotePdf(details)
  const pdfFilename = `Dobavnica_${refNumber}.pdf`

  const transporter = createTransporter()
  await transporter.verify()

  const subject = `Dobavnica #${refNumber} – ${statusLabel}`
  await Promise.all(
    to.map((recipient) =>
      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient,
        subject,
        html,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })
    )
  )
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
        <h1 style="color:white;margin:0;font-size:22px;">BuildFlow</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Upravljanje inventarja orodij</p>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e293b;margin:0 0 12px;">&#9888;&#65039; Potreben nakup materiala</h2>
        <p style="color:#475569;margin:0 0 8px;"><strong>${requesterName}</strong> je zahteval material za projekt <strong>${projectName}</strong>, ki ga je treba naročiti.</p>
        ${renderSection('Nov material za nabavo (ni bil nikoli na zalogi)', neverStocked.map((i) => `${i.name} &ndash; kol. ${i.qty}`))}
        ${renderSection('Ponovna naročba &ndash; nizka zaloga', lowStock.map((i) => `${i.name} &ndash; potrebno ${i.qty}, na zalogi le ${i.currentStock}`))}
        <div style="text-align:center;margin:24px 0 0;">
          <a href="${appUrl}${details.linkUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            Oglej zahtevek
          </a>
        </div>
      </div>
    </div>
  `

  const transporter = createTransporter()
  await Promise.all(
    to.map((recipient) =>
      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: '&#9888;&#65039; BuildFlow – Potreben nakup materiala',
        html,
      })
    )
  )
}
