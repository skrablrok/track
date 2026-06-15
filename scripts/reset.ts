import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('Kosarkaljubljana2007!', 12)
  await db.user.update({
    where: { email: 'rok.skrabl@gmail.com' },
    data: { password: hashed },
  })
  console.log('Password updated.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
