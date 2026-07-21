// @ts-nocheck — one-time migration script, already executed, organizationId is now non-null
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const org = await db.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: { id: 'org_default', name: 'Default Organization', slug: 'default' },
  })
  console.log('Organization:', org.id, org.name)

  const [u, t, p, c, r, a, n] = await Promise.all([
    db.user.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.tool.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.project.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.checkout.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.request.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.auditLog.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    db.notification.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
  ])

  console.log(`Updated: ${u.count} users, ${t.count} tools, ${p.count} projects, ${c.count} checkouts, ${r.count} requests, ${a.count} audit logs, ${n.count} notifications`)
  console.log('Migration complete.')
}

main().catch(console.error).finally(() => db.$disconnect())
