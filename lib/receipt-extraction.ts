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
