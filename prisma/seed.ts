import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const [adminPw, managerPw, employeePw, foremanPw] = await Promise.all([
    bcrypt.hash('Admin123!', 12),
    bcrypt.hash('Manager123!', 12),
    bcrypt.hash('Employee123!', 12),
    bcrypt.hash('Foreman123!', 12),
  ])

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: { email: 'admin@company.com', password: adminPw, name: 'System Administrator', role: 'ADMIN' },
  })
  await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: { email: 'manager@company.com', password: managerPw, name: 'John Manager', role: 'MANAGER' },
  })
  await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: { email: 'employee@company.com', password: employeePw, name: 'Jane Employee', role: 'EMPLOYEE' },
  })
  await prisma.user.upsert({
    where: { email: 'foreman@company.com' },
    update: {},
    create: { email: 'foreman@company.com', password: foremanPw, name: 'Mike Foreman', role: 'FOREMAN' },
  })

  await prisma.project.upsert({
    where: { id: 'project-site-a' },
    update: {},
    create: { id: 'project-site-a', name: 'Site A - Downtown Tower', location: '123 Main St, Downtown', description: 'High-rise construction project', status: 'ACTIVE' },
  })
  await prisma.project.upsert({
    where: { id: 'project-site-b' },
    update: {},
    create: { id: 'project-site-b', name: 'Site B - Riverside Complex', location: '45 River Road', description: 'Residential complex renovation', status: 'ACTIVE' },
  })

  const tools = [
    { id: 'tool-001', name: 'Cordless Drill', description: 'Heavy-duty 20V cordless drill with 2 battery packs', category: 'Power Tools', totalStock: 8, currentStock: 6, minStock: 2, maxStock: 10, qrCode: 'QR-DRILL-001' },
    { id: 'tool-002', name: 'Angle Grinder', description: '4.5" angle grinder, 7.5A motor', category: 'Power Tools', totalStock: 5, currentStock: 5, minStock: 2, maxStock: 10, qrCode: 'QR-GRINDER-002' },
    { id: 'tool-003', name: 'Circular Saw', description: '7-1/4" circular saw with laser guide', category: 'Power Tools', totalStock: 4, currentStock: 2, minStock: 2, maxStock: 10, qrCode: 'QR-SAW-003' },
    { id: 'tool-004', name: 'Hammer', description: '20oz claw hammer, fiberglass handle', category: 'Hand Tools', totalStock: 10, currentStock: 8, minStock: 2, maxStock: 10, qrCode: 'QR-HAMMER-004' },
    { id: 'tool-005', name: 'Tape Measure', description: '25ft auto-lock tape measure', category: 'Measuring Tools', totalStock: 10, currentStock: 10, minStock: 2, maxStock: 10, qrCode: 'QR-TAPE-005' },
    { id: 'tool-006', name: 'Level', description: '48" magnetic torpedo level', category: 'Measuring Tools', totalStock: 6, currentStock: 2, minStock: 2, maxStock: 10, qrCode: 'QR-LEVEL-006' },
    { id: 'tool-007', name: 'Reciprocating Saw', description: '12A reciprocating saw with orbital action', category: 'Power Tools', totalStock: 3, currentStock: 1, minStock: 2, maxStock: 10, qrCode: 'QR-RECSAW-007' },
    { id: 'tool-008', name: 'Socket Set', description: '200-piece metric/SAE socket set', category: 'Hand Tools', totalStock: 7, currentStock: 5, minStock: 2, maxStock: 10, qrCode: 'QR-SOCKET-008' },
  ]

  for (const tool of tools) {
    await prisma.tool.upsert({ where: { id: tool.id }, update: {}, create: tool })
  }

  console.log('\nDatabase seeded!')
  console.log('Accounts:')
  console.log('  Admin:    admin@company.com    / Admin123!')
  console.log('  Manager:  manager@company.com  / Manager123!')
  console.log('  Employee: employee@company.com / Employee123!')
  console.log('  Foreman:  foreman@company.com  / Foreman123!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
