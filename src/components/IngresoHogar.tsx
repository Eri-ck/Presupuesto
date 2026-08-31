'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { quincenaFromIndex, toISODateString, mostRecentSaturday } from '@/lib/quincena'
import type { Profile, IncomeEntry } from '@/lib/types'

const ALLOCATION = { personal: 8.4, ahorroGeneral: 15, ahorroNavidad: 5 }

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
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [viewedIndex])

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

  if (loading) return <div className="p-6 text-[var(--neu-text-dim)]">Cargando…</div>

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
  const personalAmt = total * (ALLOCATION.personal / 100)
  const ahorroGeneralAmt = total * (ALLOCATION.ahorroGeneral / 100)
  const ahorroNavidadAmt = total * (ALLOCATION.ahorroNavidad / 100)
  const hogarPool = total - personalAmt - ahorroGeneralAmt - ahorroNavidadAmt

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <div className="neu-raised max-w-xl p-6 font-mono text-[var(--neu-text)]" style={{ borderLeft: '4px solid #d85a30' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#d85a30' }}>Ingreso del hogar</h2>

      {isFuture && (
        <div className="neu-pressed text-amber-700 text-sm p-3 mb-4">
          Quincena futura — lo que captures aquí es una proyección, no un depósito real todavía.
        </div>
      )}
      {isPast && (
        <div className="neu-pressed text-[var(--neu-text-dim)] text-sm p-3 mb-4">
          Estás viendo historial — estos montos ya pasaron.
        </div>
      )}

      <div className="text-xs uppercase text-[var(--neu-text-dim)] mb-3 tracking-wide">Mamá · semanas de esta quincena</div>
      {mamaWeeks.map(w => (
        <div key={w.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
          <span className="text-[var(--neu-text-dim)]">{w.period_start}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={w.amount}
              onBlur={e => updateMamaWeek(w.id, e.target.value)}
              className="w-24 bg-transparent border-b border-[var(--neu-shadow-dark)] text-right focus:outline-none"
            />
            <button onClick={() => removeMamaWeek(w.id)} className="neu-btn-danger text-xs px-2 py-1">×</button>
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input
          type="number"
          value={newAmount}
          onChange={e => setNewAmount(e.target.value)}
          placeholder={isFuture ? 'Monto proyectado' : 'Monto de la semana nueva'}
          className="neu-input px-3 py-2 text-sm flex-1"
        />
        <button onClick={addMamaWeek} className="neu-btn-primary px-4 py-2 text-sm font-medium">
          + Agregar
        </button>
      </div>
      <div className="flex justify-between mt-4 pt-3 border-t border-[var(--neu-shadow-dark)]/40 text-sm font-medium">
        <span>Subtotal mamá</span>
        <span>{money(mamaTotal)}</span>
      </div>

      <div className="text-xs uppercase text-[var(--neu-text-dim)] mt-6 mb-3 tracking-wide">Papá · depósito de esta quincena{isFuture ? ' (proyección)' : ''}</div>
      <div className="flex gap-2">
        <input
          type="number"
          value={papaAmount}
          onChange={e => setPapaAmount(e.target.value)}
          placeholder="Depósito"
          className="neu-input px-3 py-2 text-sm flex-1"
        />
        <button onClick={savePapaDeposit} className="neu-btn-primary px-4 py-2 text-sm font-medium">
          Guardar
        </button>
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/40 text-base font-semibold">
        <span>Total ingreso quincenal</span>
        <span>{money(total)}</span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-rose-600"><span>Personal ({ALLOCATION.personal}%)</span><span>- {money(personalAmt)}</span></div>
        <div className="flex justify-between text-emerald-700"><span>Ahorro general ({ALLOCATION.ahorroGeneral}%)</span><span>- {money(ahorroGeneralAmt)}</span></div>
        <div className="flex justify-between text-amber-700"><span>Ahorro navideño ({ALLOCATION.ahorroNavidad}%)</span><span>- {money(ahorroNavidadAmt)}</span></div>
        <div className="flex justify-between pt-2 border-t border-[var(--neu-shadow-dark)]/40 font-semibold"><span>= Disponible para el hogar</span><span>{money(hogarPool)}</span></div>
      </div>
    </div>
  )
}