'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Category, Card, Profile, Priority } from '@/lib/types'

const TYPE_TAGS = ['Alimentos', 'Cultura', 'Entretenimiento', 'Escuela', 'Trabajo', 'Comida', 'Salud', 'Transporte', 'Otro']

export default function RegistrarGasto() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [priority, setPriority] = useState<Priority>('necesidad')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [needsInvoice, setNeedsInvoice] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadOptions() {
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    const { data: cardData } = await supabase.from('cards').select('*').order('name')
    const { data: profileData } = await supabase.from('profiles').select('*').in('role', ['mama', 'papa'])
    setCategories(cats ?? [])
    setCards(cardData ?? [])
    setProfiles(profileData ?? [])
    if (profileData?.[0]) setProfileId(profileData[0].id)
  }

  useEffect(() => { loadOptions() }, [])

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function submit() {
    const amt = Number(amount)
    if (!desc.trim() || !amt || amt <= 0 || !categoryId || !profileId) {
      setError('Escribe una descripción, un monto mayor a cero, elige categoría y quién gastó.')
      return
    }
    setError('')
    setSaving(true)
    const { start } = quincenaFromIndex(currentQuincenaIndex())
    const isCard = paymentMethod !== 'efectivo'

    await supabase.from('transactions').insert({
      profile_id: profileId,
      category_id: categoryId,
      amount: amt,
      description: desc.trim(),
      source: 'manual',
      payment_method: paymentMethod,
      card_id: isCard ? paymentMethod : null,
      priority,
      tags: selectedTags,
      needs_invoice: needsInvoice,
      occurred_at: new Date(occurredAt + 'T12:00:00').toISOString(),
      quincena_start: toISODateString(start),
    })

    setDesc(''); setAmount(''); setSelectedTags([]); setNeedsInvoice(false)
    setOccurredAt(new Date().toISOString().slice(0, 10))
    setSaving(false)
    window.location.reload()
  }

  return (
    <div className="max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 mt-6 font-mono text-neutral-100">
      <h2 className="text-lg mb-4">Registrar gasto</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción"
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm col-span-2" />
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto"
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm">
          <option value="">— categoría —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={profileId} onChange={e => setProfileId(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm">
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm">
          <option value="efectivo">Efectivo / débito</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm bg-neutral-800 border border-neutral-700 rounded px-2 py-1">
          <input type="checkbox" checked={needsInvoice} onChange={e => setNeedsInvoice(e.target.checked)} />
          Necesita factura
        </label>
      </div>

      <div className="flex gap-4 mb-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={priority === 'necesidad'} onChange={() => setPriority('necesidad')} />
          Necesidad primaria
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={priority === 'prescindible'} onChange={() => setPriority('prescindible')} />
          Prescindible
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TYPE_TAGS.map(tag => (
          <button key={tag} onClick={() => toggleTag(tag)}
            className={`text-xs px-3 py-1 rounded-full border ${selectedTags.includes(tag) ? 'bg-teal-700 border-teal-700 text-white' : 'border-neutral-700 text-neutral-400'}`}>
            {tag}
          </button>
        ))}
      </div>

      {error && <div className="text-rose-400 text-sm mb-3">{error}</div>}

      <button onClick={submit} disabled={saving} className="bg-emerald-800 text-emerald-200 px-4 py-2 rounded text-sm">
        {saving ? 'Guardando…' : '+ Registrar gasto'}
      </button>
    </div>
  )
}