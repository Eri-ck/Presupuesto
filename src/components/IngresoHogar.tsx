'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Profile, IncomeEntry } from '@/lib/types'

const DEFAULT_ALLOCATION = {
  fijos_pct: 50,
  variables_pct: 20,
  ahorro_intocable_pct: 5,
  ahorro_general_pct: 10,
  ahorro_navidad_pct: 5,
  personal_pct: 10,
}

const MAMA_SUGGESTED = 22500

type AllocationKey = keyof typeof DEFAULT_ALLOCATION

export default function IngresoHogar() {
  const supabase = createClient()
  const { viewedIndex, currentIndex } = useQuincena()
  const [loading, setLoading] = useState(true)
  const [mama, setMama] = useState<Profile | null>(null)
  const [papa, setPapa] = useState<Profile | null>(null)
  const [mamaEntry, setMamaEntry] = useState<IncomeEntry | null>(null)
  const [papaEntry, setPapaEntry] = useState<IncomeEntry | null>(null)
  const [mamaAmount, setMamaAmount] = useState('')
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
      const { data: entries } = await supabase
        .from('income_entries')
        .select('*')
        .eq('profile_id', mamaProfile.id)
        .eq('quincena_start', quincenaStart)
        .order('created_at', { ascending: false })
        .limit(1)
      setMamaEntry(entries?.[0] ?? null)
      setMamaAmount(entries?.[0]?.amount?.toString() ?? '')
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
      const row = allocData[0]
      setAllocation({
        fijos_pct: Number(row.fijos_pct),
        variables_pct: Number(row.variables_pct),
        ahorro_intocable_pct: Number(row.ahorro_intocable_pct),
        ahorro_general_pct: Number(row.ahorro_general_pct),
        ahorro_navidad_pct: Number(row.ahorro_navidad_pct),
        personal_pct: Number(row.personal_pct),
      })
      setAllocationId(row.id)
    } else {
      setAllocation(DEFAULT_ALLOCATION)
      setAllocationId(null)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [viewedIndex])

  async function saveAllocation(next: typeof allocation) {
    if (allocationId) {
      await supabase.from('allocation_settings').update(next).eq('id', allocationId)
    } else {
      const { data } = await supabase.from('allocation_settings').insert({
        quincena_start: quincenaStart,
        ...next,
      }).select().single()
      if (data) setAllocationId(data.id)
    }
  }

  function updateAllocationLive(key: AllocationKey, value: number) {
    setAllocation(prev => ({ ...prev, [key]: value }))
  }

  function commitAllocation(key: AllocationKey, value: number) {
    const next = { ...allocation, [key]: value }
    setAllocation(next)
    saveAllocation(next)
  }

  function resetAllocation() {
    setAllocation(DEFAULT_ALLOCATION)
    saveAllocation(DEFAULT_ALLOCATION)
  }

  async function saveMamaDeposit() {
    if (!mama) return
    const amount = Number(mamaAmount)
    if (!amount || amount <= 0) return
    if (mamaEntry) {
      await supabase.from('income_entries').update({ amount }).eq('id', mamaEntry.id)
    } else {
      await supabase.from('income_entries').insert({
        profile_id: mama.id,
        quincena_start: quincenaStart,
        period_start: quincenaStart,
        amount,
        is_projection: isFuture,
      })
    }
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

  const mamaTotal = mamaEntry ? Number(mamaEntry.amount) : 0
  const papaTotal = papaEntry ? Number(papaEntry.amount) : 0
  const total = mamaTotal + papaTotal
  const mamaShare = total > 0 ? mamaTotal / total : 0
  const papaShare = total > 0 ? papaTotal / total : 0

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')

  const sumPct = allocation.fijos_pct + allocation.variables_pct + allocation.ahorro_intocable_pct +
    allocation.ahorro_general_pct + allocation.ahorro_navidad_pct + allocation.personal_pct
  const sumOk = Math.abs(sumPct - 100) < 0.05
  const isDefault = Math.abs(sumPct - 100) < 0.05 &&
    allocation.fijos_pct === DEFAULT_ALLOCATION.fijos_pct &&
    allocation.variables_pct === DEFAULT_ALLOCATION.variables_pct &&
    allocation.ahorro_intocable_pct === DEFAULT_ALLOCATION.ahorro_intocable_pct &&
    allocation.ahorro_general_pct === DEFAULT_ALLOCATION.ahorro_general_pct &&
    allocation.ahorro_navidad_pct === DEFAULT_ALLOCATION.ahorro_navidad_pct &&
    allocation.personal_pct === DEFAULT_ALLOCATION.personal_pct

  function sliderRow(label: string, key: AllocationKey, color: string) {
    const amount = total * (allocation[key] / 100)
    const mamaPart = amount * mamaShare
    const papaPart = amount * papaShare
    return (
      <div className="mb-4" key={key}>
        <div className="flex justify-between text-sm mb-1" style={{ color }}>
          <span>{label} ({allocation[key].toFixed(1)}%)</span>
          <span>{money(amount)}</span>
        </div>
        <input
          type="range" min={0} max={60} step={0.5}
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

      <div className="text-xs uppercase text-[var(--neu-text-dim)] mb-3 tracking-wide">Mamá, depósito de esta quincena</div>
      <div className="flex gap-2">
        <input type="number" value={mamaAmount} onChange={e => setMamaAmount(e.target.value)}
          placeholder={String(MAMA_SUGGESTED)}
          className="neu-input px-3 py-2 text-sm flex-1" />
        <button onClick={saveMamaDeposit} className="neu-btn-primary px-4 py-2 text-sm font-medium">Guardar</button>
      </div>
      {!mamaEntry && (
        <div className="text-xs text-[var(--neu-text-dim)] mt-1">Sueldo fijo mensual $45,000, sugerido {money(MAMA_SUGGESTED)} por quincena.</div>
      )}
      <div className="flex justify-between mt-3 pt-3 border-t border-[var(--neu-shadow-dark)]/40 text-sm font-medium">
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

      <div className="flex justify-between items-center mt-4 mb-1">
        <span className="text-xs uppercase text-[var(--neu-text-dim)] tracking-wide">Reparto del ingreso</span>
        {!isDefault && (
          <button onClick={resetAllocation} className="neu-btn text-xs px-3 py-1 text-[var(--neu-text-dim)]">
            Restablecer porcentajes
          </button>
        )}
      </div>

      <div className="mt-2">
        {sliderRow('Gastos fijos', 'fijos_pct', '#0f6e56')}
        {sliderRow('Gastos variables', 'variables_pct', '#534ab7')}
        {sliderRow('Ahorro intocable', 'ahorro_intocable_pct', '#1b3a8a')}
        {sliderRow('Ahorro disponible', 'ahorro_general_pct', '#3b6d11')}
        {sliderRow('Ahorro eventual', 'ahorro_navidad_pct', '#854f0b')}
        {sliderRow('Uso personal', 'personal_pct', '#e24b4a')}
      </div>

      <div className={'mt-2 p-3 text-sm rounded-xl ' + (sumOk ? 'text-emerald-700' : 'text-rose-600')} style={{ background: sumOk ? undefined : 'rgba(226,75,74,0.08)' }}>
        {sumOk
          ? `Suman ${sumPct.toFixed(1)}%, todo cuadra.`
          : `Ojo: suman ${sumPct.toFixed(1)}%, no 100%. Ajusta los sliders.`}
      </div>
    </div>
  )
}