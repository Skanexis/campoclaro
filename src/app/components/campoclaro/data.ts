export interface Product {
  id: string
  name: string
  category: string
  description: string
  longDescription: string
  prices: Record<string, number>
  filters?: string[]
  strains?: string[]
  images?: string[]
  videos?: string[]
  thc: string
  cbd: string
  tags: string[]
  gradient: string
  glowColor: string
  earlyDropEnabled?: boolean
  earlyDropDays?: number
  earlyDropUntil?: string
  earlyDropNotifiedAt?: string
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'filtrato',
    name: 'Filtrato',
    category: 'Club Selection',
    description: 'Filtrato 25-50g formato premium.',
    longDescription: 'Filtrato di alta qualita in formato 25-50g, perfetto per chi cerca qualita e precisione dosaggio.',
    prices: { '100g': 315, '500g': 1350, '1kg': 2000 },
    filters: ['Club Selection'],
    strains: [],
    images: [],
    videos: [],
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Premium', 'Filtrato'],
    gradient: '#0d0d0e',
    glowColor: 'rgba(214,178,94,0.12)',
  },
  {
    id: 'cali-spain-sherbet',
    name: 'Cali Spain - Sherbet',
    category: 'Club Selection',
    description: 'Exotic terps e Creamy vibes con profilo unico.',
    longDescription: 'Cali Spain Sherbet combina Exotic terps e Creamy vibes per una selezione dal profilo aromatico intenso.',
    prices: { '100g': 450, '500g': 1850, '1kg': 3200 },
    filters: ['Club Selection'],
    strains: ['Exotic terps', 'Creamy vibes'],
    images: [],
    videos: [],
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Exotic terps', 'Creamy vibes'],
    gradient: '#0d0d0e',
    glowColor: 'rgba(214,178,94,0.12)',
  },
  {
    id: 'frozen-moe-farm',
    name: 'Frozen Moe Farm',
    category: 'Club Selection',
    description: 'Frozen quality con heavy flavour e profilo intenso.',
    longDescription: 'Frozen Moe Farm e una selezione frozen quality dal flavour pesante e persistente. Strain disponibili: Zkittlez, Lollipopa, Hash Burger, Honey x Butter e Gush Mints.',
    prices: { '100g': 500, '500g': 2400, '1kg': 4200 },
    filters: ['Club Selection'],
    strains: ['Zkittlez', 'Lollipopa', 'Hash Burger', 'Honey x Butter', 'Gush Mints'],
    images: [],
    videos: [],
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Frozen quality', 'Heavy flavour'],
    gradient: '#0d0d0e',
    glowColor: 'rgba(214,178,94,0.12)',
  },
]
