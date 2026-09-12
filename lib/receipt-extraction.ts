import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type ReceiptItem = { name: string; quantity: number; unitPrice: number }
export type ReceiptExtraction = { items: ReceiptItem[]; totalPrice: number }

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
        },
        required: ['name', 'quantity', 'unitPrice'],
        additionalProperties: false,
      },
    },
    totalPrice: { type: 'number' },
  },
  required: ['items', 'totalPrice'],
  additionalProperties: false,
}

// PhotoInput always compresses to a JPEG data URL, so media_type is fixed.
export async function extractReceiptData(photoDataUrl: string): Promise<ReceiptExtraction | null> {
  const commaIdx = photoDataUrl.indexOf(',')
  if (!photoDataUrl.startsWith('data:image/jpeg;base64,') || commaIdx === -1) return null
  const base64Data = photoDataUrl.slice(commaIdx + 1)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RECEIPT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } },
            {
              type: 'text',
              text: 'This is a photo of a store receipt. Extract every line item with its name, quantity, and unit price, plus the total price printed on the receipt. If a quantity is not shown for an item, use 1. Use the numbers exactly as printed, without a currency symbol.',
            },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') return null

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    return JSON.parse(textBlock.text) as ReceiptExtraction
  } catch (e) {
    console.error('Receipt extraction failed:', e)
    return null
  }
}

export type ExpectedItem = { id: string; name: string }
export type ReceiptMatch = { expectedId: string; found: boolean }
export type ReceiptMatchResult = ReceiptExtraction & { matches: ReceiptMatch[] }

const RECEIPT_MATCH_SCHEMA = {
  type: 'object',
  properties: {
    ...RECEIPT_SCHEMA.properties,
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          expectedId: { type: 'string' },
          found: { type: 'boolean' },
        },
        required: ['expectedId', 'found'],
        additionalProperties: false,
      },
    },
  },
  required: ['items', 'totalPrice', 'matches'],
  additionalProperties: false,
}

// PhotoInput always compresses to a JPEG data URL, so media_type is fixed.
export async function matchReceiptItems(
  photoDataUrl: string,
  expected: ExpectedItem[]
): Promise<ReceiptMatchResult | null> {
  const commaIdx = photoDataUrl.indexOf(',')
  if (!photoDataUrl.startsWith('data:image/jpeg;base64,') || commaIdx === -1) return null
  const base64Data = photoDataUrl.slice(commaIdx + 1)

  const expectedList = expected.map((e) => `${e.id}: ${e.name}`).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: RECEIPT_MATCH_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } },
            {
              type: 'text',
              text:
                'This is a photo of a store receipt or invoice. Extract every line item with its name, quantity, and unit price, plus the total price printed on the receipt. If a quantity is not shown for an item, use 1. Use the numbers exactly as printed, without a currency symbol.\n\n' +
                'We also expected the following items to be on this receipt (id: name):\n' +
                expectedList +
                '\n\nFor each expected item, decide whether it actually appears on the receipt, allowing for abbreviations, different wording, or partial matches (e.g. "BOSCH DRILL 18V" matches "Bosch Cordless Drill 18V"). Return one entry per expected id in `matches` with `found: true` if it appears on the receipt, `found: false` otherwise.',
            },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') return null

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    return JSON.parse(textBlock.text) as ReceiptMatchResult
  } catch (e) {
    console.error('Receipt matching failed:', e)
    return null
  }
}
