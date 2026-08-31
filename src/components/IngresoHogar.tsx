'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { quincenaFromIndex, toISODateString, mostRecentSaturday } from '@/lib/quincena'
import type { Profile, IncomeEntry } from '@/lib/types'

const DEFAULT_ALLOCATION = { personal_pct: 8.4, ahorro_general_pct: 15, ahorro_navidad_pct: 5 }

export default function IngresoHogar() {
  const supabase = createClient()
  const { viewedIndex, currentIndex } = useQuincena()
  const [loading, setLoading] = useState(true)
  const [mama, setMama] = useState<Profile | null>(null)
  const [papa, setPapa] = useState<Profile | null>(null)
  const [mamaWeeks, setMamaWeeks] = useState<IncomeEntry[]>([])
  const [papaEntry, setPapaEntry] = useState<IncomeEntry | null>(null)
  const [newAmount, setNewAmount] = useState('')
  const [papaAmount, setPapaAmount] = useState('')
  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION)
  const [allocationId, setAllocationId] = useState<string | null>(null)

  const { start } = quincenaFromIndex(viewedIndex)
  const quincenaStart = toISODateString(start)
  const isFuture = viewedIndex > currentIndex
  const isPast = viewedIndex < currentIndex

  async function loadAll() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').in('role', ['mama', 'papa'])
    const mamaProfile = profiles?.find(p => p.role === 'mama') ?? null
    const papaProfile = profiles?.find(p => p.role === 'papa') ?? null
    setMama(mamaProfile)
    setPapa(papaProfile)

    if (mamaProfile) {
      const { data: weeks } = await supabase
        .from('income_entries')
        .select('*')
        .eq('profile_id', mamaProfile.id)
        .eq('quincena_start', quincenaStart)
        .order('period_start', { ascending: true })
      setMamaWeeks(weeks ?? [])
    }
    if (papaProfile) {
      const { data: entries } = await supabase
        .from('income_entries')
        .select('*')
        .eq('profile_id', papaProfile.id)
        .eq('quincena_start', quincenaStart)
        .order('created_at', { ascending: false })
        .limit(1)
      setPapaEntry(entries?.[0] ?? null)
      setPapaAmount(entries?.[0]?.amount?.toString() ?? '')
    }

    const { data: allocData } = await supabase
      .from('allocation_settings')
      .select('*')
      .eq('quincena_start', quincenaStart)
      .limit(1)
    if (allocData?.[0]) {
      setAllocation({
        personal_pct: Number(allocData[0].personal_pct),
        ahorro_general_pct: Number(allocData[0].ahorro_general_pct),
        ahorro_navidad_pct: Number(allocData[0].ahorro_navidad_pct),
      })
      setAllocationId(allocData[0].id)
    } else {
      setAllocation(DEFAULT_ALLOCATION)
      setAllocationId(null)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [viewedIndex])

  async function saveAllocation(next: typeof allocation) {
    if (allocationId) {
      await supabase.from('allocation_settings').update({
        personal_pct: next.personal_pct,
        ahorro_general_pct: next.ahorro_general_pct,
        ahorro_navidad_pct: next.ahorro_navidad_pct,
      }).eq('id', allocationId)
    } else {
      const { data } = await supabase.from('allocation_settings').insert({
        quincena_start: quincenaStart,
        personal_pct: next.personal_pct,
        ahorro_general_pct: next.ahorro_general_pct,
        ahorro_navidad_pct: next.ahorro_navidad_pct,
      }).select().single()
      if (data) setAllocationId(data.id)
    }
  }

  function updateAllocationLive(key: keyof typeof allocation, value: number) {
    setAllocation(prev => ({ ...prev, [key]: value }))
  }

  function commitAllocation(key: keyof typeof allocation, value: number) {
    const next = { ...allocation, [key]: value }
    setAllocation(next)
    saveAllocation(next)
  }

  async function addMamaWeek() {
    if (!mama) return
    const amount = Number(newAmount)
    if (!amount || amount <= 0) return
    const periodStart = toISODateString(mostRecentSaturday(new Date()))
    await supabase.from('income_entries').insert({
      profile_id: mama.id,
      quincena_start: quincenaStart,
      period_start: periodStart,
      amount,
      is_projection: isFuture,
    })
    setNewAmount('')
    loadAll()
  }

  async function updateMamaWeek(id: string, value: string) {
    const amount = Math.max(0, Number(value) || 0)
    await supabase.from('income_entries').update({ amount }).eq('id', id)
    loadAll()
  }

  async function removeMamaWeek(id: string) {
    await supabase.from('income_entries').delete().eq('id', id)
    loadAll()
  }

  async function savePapaDeposit() {
    if (!papa) return
    const amount = Number(papaAmount)
    if (!amount || amount <= 0) return
    if (papaEntry) {
      await supabase.from('income_entries').update({ amount }).eq('id', papaEntry.id)
    } else {
      await supabase.from('income_entries').insert({
        profile_id: papa.id,
        quincena_start: quincenaStart,
        period_start: quincenaStart,
        amount,
        is_projection: isFuture,
      })
    }
    loadAll()
  }

  if (loading) {
    return <div className="p-6 text-[var(--neu-text-dim)]">Cargando…</div>
  }

  if (!mama || !papa) {
    return (
      <div className="neu-pressed p-6 text-amber-600">
        Falta crear los perfiles de mamá y papá en la tabla profiles.
      </div>
    )
  }

  const mamaTotal = mamaWeeks.reduce((s, w) => s + Number(w.amount), 0)
  const papaTotal = papaEntry ? Number(papaEntry.amount) : 0
  const total = mamaTotal + papaTotal
  const mamaShare = total > 0 ? mamaTotal / total : 0
  const papaShare = total > 0 ? papaTotal / total : 0

  const personalAmt = total * (allocation.personal_pct / 100)
  const ahorroGeneralAmt = total * (allocation.ahorro_general_pct / 100)
  const ahorroNavidadAmt = total * (allocation.ahorro_navidad_pct / 100)
  const hogarPool = total - personalAmt - ahorroGeneralAmt - ahorroNavidadAmt

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')

  function sliderRow(label: string, key: keyof typeof allocation, amount: number, color: string) {
    const mamaPart = amount * mamaShare
    const papaPart = amount * papaShare
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1" style={{ color }}>
          <span>{label} ({allocation[key].toFixed(1)}%)</span>
          <span>- {money(amount)}</span>
        </div>
        <input
          type="range" min={0} max={40} step={0.5}
          value={allocation[key]}
          onInput={e => updateAllocationLive(key, Number((e.target as HTMLInputElement).value))}
          onChange={e => commitAllocation(key, Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-[var(--neu-text-dim)] mt-1">
          <span>Mamá: {money(mamaPart)}</span>
          <span>Papá: {money(papaPart)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="neu-raised max-w-xl p-6 font-mono text-[var(--neu-text)]">
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#d85a30' }}>Ingreso del hogar</h2>

      {isFuture && (
        <div className="neu-pressed text-amber-700 text-sm p-3 mb-4">
          Quincena futura, lo que captures aquí es una proyección.
        </div>
      )}
      {isPast && (
        <div className="neu-pressed text-[var(--neu-text-dim)] text-sm p-3 mb-4">
          Estás viendo historial.
        </div>
      )}

      <div className="text-xs uppercase text-[var(--neu-text-dim)] mb-3 tracking-wide">Mamá, semanas de esta quincena</div>
      {mamaWeeks.map(w => (
        <div key={w.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
          <span className="text-[var(--neu-text-dim)]">{w.period_start}</span>
          <div className="flex items-center gap-2">
            <input type="number" defaultValue={w.amount} onBlur={e => updateMamaWeek(w.id, e.target.value)}
              className="w-24 bg-transparent border-b border-[var(--neu-shadow-dark)] text-right focus:outline-none" />
            <button onClick={() => removeMamaWeek(w.id)} className="neu-btn-danger text-xs px-2 py-1">×</button>
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
          placeholder={isFuture ? 'Monto proyectado' : 'Monto de la semana nueva'}
          className="neu-input px-3 py-2 text-sm flex-1" />
        <button onClick={addMamaWeek} className="neu-btn-primary px-4 py-2 text-sm font-medium">+ Agregar</button>
      </div>
      <div className="flex justify-between mt-4 pt-3 border-t border-[var(--neu-shadow-dark)]/40 text-sm font-medium">
        <span>Subtotal mamá</span><span>{money(mamaTotal)}</span>
      </div>

      <div className="text-xs uppercase text-[var(--neu-text-dim)] mt-6 mb-3 tracking-wide">Papá, depósito de esta quincena</div>
      <div className="flex gap-2">
        <input type="number" value={papaAmount} onChange={e => setPapaAmount(e.target.value)} placeholder="Depósito"
          className="neu-input px-3 py-2 text-sm flex-1" />
        <button onClick={savePapaDeposit} className="neu-btn-primary px-4 py-2 text-sm font-medium">Guardar</button>
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/40 text-base font-semibold">
        <span>Total ingreso quincenal</span><span>{money(total)}</span>
      </div>

      <div className="mt-4">
        {sliderRow('Personal', 'personal_pct', personalAmt, '#e24b4a')}
        {sliderRow('Ahorro general', 'ahorro_general_pct', ahorroGeneralAmt, '#3b6d11')}
        {sliderRow('Ahorro navideño', 'ahorro_navidad_pct', ahorroNavidadAmt, '#854f0b')}
        <div className="flex justify-between pt-3 border-t border-[var(--neu-shadow-dark)]/40 font-semibold text-sm">
          <span>= Disponible para el hogar</span><span>{money(hogarPool)}</span>
        </div>
      </div>
    </div>
  )
}
}