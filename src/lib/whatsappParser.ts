// Parser gratuito basado en palabras clave — sin costo, sin API externa.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Colegio hijo': ['colegio', 'escuela', 'uniforme', 'utiles', 'útiles', 'niño', 'niña'],
  'Renta': ['renta', 'alquiler'],
  'Servicios (luz, agua, internet)': ['luz', 'agua', 'internet', 'cfe', 'servicio', 'telefono', 'teléfono'],
  'Súper': ['super', 'súper', 'mercado', 'despensa', 'comida', 'oxxo', 'fruta', 'verdura'],
  'Transporte / gasolina': ['gasolina', 'uber', 'transporte', 'camion', 'camión', 'metro', 'estacionamiento', 'taxi'],
}

const TAG_KEYWORDS: Record<string, string[]> = {
  'Alimentos': ['comida', 'super', 'súper', 'fruta', 'verdura', 'mercado', 'despensa'],
  'Escuela': ['colegio', 'escuela', 'utiles', 'útiles'],
  'Transporte': ['gasolina', 'uber', 'transporte', 'camion', 'camión', 'metro', 'taxi'],
  'Salud': ['farmacia', 'doctor', 'medicina', 'consulta'],
  'Entretenimiento': ['cine', 'peli', 'película', 'salida', 'fiesta'],
  'Cultura': ['libro', 'museo', 'concierto'],
}

const PRESCINDIBLE_KEYWORDS = ['antojo', 'dulce', 'peli', 'cine', 'salida', 'fiesta', 'regalo', 'extra', 'capricho']

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function parseTextMessage(text: string) {
  const lower = normalize(text)
  const match = text.match(/\d+(\.\d+)?/)
  const amount = match ? Number(match[0]) : 0

  let category_guess = 'Imprevistos'
  let matchedCategory = false
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => lower.includes(normalize(w)))) {
      category_guess = cat
      matchedCategory = true
      break
    }
  }

  const tags: string[] = []
  for (const [tag, words] of Object.entries(TAG_KEYWORDS)) {
    if (words.some(w => lower.includes(normalize(w)))) tags.push(tag)
  }

  const priority = PRESCINDIBLE_KEYWORDS.some(w => lower.includes(w)) ? 'prescindible' : 'necesidad'

  return {
    amount,
    description: text.trim(),
    category_guess,
    priority,
    tags,
    confidence: amount > 0 && matchedCategory ? 0.8 : amount > 0 ? 0.5 : 0,
  }
}