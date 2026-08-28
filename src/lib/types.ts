export type ProfileRole = 'mama' | 'papa' | 'hijo'
export type PayCycle = 'semanal' | 'quincenal'
export type CategoryType = 'fijo' | 'variable'
export type Priority = 'necesidad' | 'prescindible'
export type Source = 'foto' | 'texto' | 'audio' | 'manual'

export interface Profile {
  id: string
  name: string
  role: ProfileRole
  whatsapp_number: string | null
  pay_cycle: PayCycle | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  budget_current: number
  created_at: string
}

export interface Card {
  id: string
  name: string
  cutoff_day: number
  due_day: number
  credit_limit: number | null
  created_at: string
}

export interface Transaction {
  id: string
  profile_id: string | null
  category_id: string | null
  amount: number
  description: string | null
  source: Source
  receipt_url: string | null
  confidence: number | null
  needs_review: boolean
  payment_method: string
  card_id: string | null
  priority: Priority | null
  tags: string[] | null
  quincena_start: string
  occurred_at: string
  created_at: string
}

export interface IncomeEntry {
  id: string
  profile_id: string
  quincena_start: string
  period_start: string
  amount: number
  is_projection: boolean
  created_at: string
}

export interface Goal {
  id: string
  name: string
  sub: string | null
  target_amount: number
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  created_at: string
}

export interface AllocationSettings {
  id: string
  quincena_start: string
  personal_pct: number
  ahorro_general_pct: number
  ahorro_navidad_pct: number
  created_at: string
}
