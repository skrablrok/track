import { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

export type SerialAssignResult = {
  // Whether the tool has any registered serial units at all — if false, this tool
  // doesn't use per-unit tracking and the caller shouldn't warn about anything.
  engaged: boolean
  assigned: number
  serials: string[]
}

// Best-effort: picks up to `quantity` AVAILABLE units for this tool (preferred serials
// first, then oldest-registered), flips them to IN_USE, and logs an assignment row per
// unit. Never blocks the checkout — if fewer units are available than requested, it just
// assigns what it can and reports back so the caller can surface a non-blocking warning.
export async function assignSerialsToCheckout(
  tx: Tx,
  opts: { toolId: string; checkoutId: string; organizationId: string; quantity: number; preferredSerials?: string[] }
): Promise<SerialAssignResult> {
  const { toolId, checkoutId, organizationId, quantity, preferredSerials } = opts
  if (quantity <= 0) return { engaged: false, assigned: 0, serials: [] }

  const registeredCount = await tx.toolSerialUnit.count({ where: { toolId, organizationId } })
  if (registeredCount === 0) return { engaged: false, assigned: 0, serials: [] }

  const picked: { id: string; serialNumber: string }[] = []

  for (const sn of preferredSerials || []) {
    if (picked.length >= quantity) break
    const trimmed = sn.trim()
    if (!trimmed) continue
    const unit = await tx.toolSerialUnit.findFirst({
      where: { toolId, organizationId, status: 'AVAILABLE', serialNumber: { equals: trimmed, mode: 'insensitive' } },
    })
    if (unit && !picked.some((p) => p.id === unit.id)) picked.push({ id: unit.id, serialNumber: unit.serialNumber })
  }

  if (picked.length < quantity) {
    const need = quantity - picked.length
    const extras = await tx.toolSerialUnit.findMany({
      where: {
        toolId, organizationId, status: 'AVAILABLE',
        ...(picked.length > 0 && { id: { notIn: picked.map((p) => p.id) } }),
      },
      orderBy: { createdAt: 'asc' },
      take: need,
    })
    picked.push(...extras.map((u) => ({ id: u.id, serialNumber: u.serialNumber })))
  }

  if (picked.length === 0) return { engaged: true, assigned: 0, serials: [] }

  await tx.toolSerialUnit.updateMany({
    where: { id: { in: picked.map((p) => p.id) } },
    data: { status: 'IN_USE' },
  })

  await tx.serialAssignment.createMany({
    data: picked.map((p) => ({ unitId: p.id, checkoutId })),
  })

  return { engaged: true, assigned: picked.length, serials: picked.map((p) => p.serialNumber) }
}

// Releases every still-open assignment tied to a checkout (on return) without erasing
// the assignment rows themselves, so checkout history always shows which serial was used.
export async function releaseSerialsForCheckout(tx: Tx, checkoutId: string): Promise<void> {
  const open = await tx.serialAssignment.findMany({ where: { checkoutId, releasedAt: null } })
  if (open.length === 0) return

  await tx.serialAssignment.updateMany({
    where: { id: { in: open.map((a) => a.id) } },
    data: { releasedAt: new Date() },
  })
  await tx.toolSerialUnit.updateMany({
    where: { id: { in: open.map((a) => a.unitId) } },
    data: { status: 'AVAILABLE' },
  })
}
