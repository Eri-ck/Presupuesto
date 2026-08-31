import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { parseTextMessage } from '@/lib/whatsappParser'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

async function sendWhatsAppReply(to: string, text: string) {
  await fetch(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body: text },
    }),
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServerClient()

  const entry = body.entry?.[0]?.changes?.[0]?.value
  const message = entry?.messages?.[0]
  if (!message) return NextResponse.json({ ok: true })

  const from = message.from
  let parsed: any = null

  try {
    if (message.type === 'text') {
      parsed = await parseTextMessage(message.text.body)
    } else {
      await sendWhatsAppReply(from, 'Por ahora solo entiendo mensajes de texto — escríbeme el monto y de qué es (ej. "150 súper")')
      return NextResponse.json({ ok: true })
    }
  } catch (err) {
    await sendWhatsAppReply(from, 'No pude leer ese gasto, intenta de nuevo con más detalle.')
    return NextResponse.json({ ok: true })
  }

  if (!parsed?.amount || parsed.amount <= 0) {
    await sendWhatsAppReply(from, 'No detecté un monto válido en ese mensaje.')
    return NextResponse.json({ ok: true })
  }

  const { data: categories } = await supabase.from('categories').select('*')
  const category = categories?.find(c => c.name === parsed.category_guess) ?? categories?.[0]
  const { data: profiles } = await supabase.from('profiles').select('*').eq('whatsapp_number', from)
  const profile = profiles?.[0]

  const { start } = quincenaFromIndex(currentQuincenaIndex())

  await supabase.from('transactions').insert({
    profile_id: profile?.id ?? null,
    category_id: category?.id ?? null,
    amount: parsed.amount,
    description: parsed.description ?? 'Gasto vía WhatsApp',
    source: 'texto',
    payment_method: 'efectivo',
    priority: parsed.priority ?? 'necesidad',
    tags: parsed.tags ?? [],
    confidence: parsed.confidence ?? 0.5,
    needs_review: (parsed.confidence ?? 1) < 0.6,
    quincena_start: toISODateString(start),
  })

  await sendWhatsAppReply(
    from,
    `✅ Registrado: $${parsed.amount} — ${category?.name ?? 'sin categoría'}${parsed.confidence < 0.6 ? ' (revisar, no estoy 100% seguro)' : ''}`
  )

  return NextResponse.json({ ok: true })
}