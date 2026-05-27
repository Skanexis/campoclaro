export interface Product {
  id: string
  name: string
  category: string
  description: string
  longDescription: string
  prices: Record<string, number>
  filters?: string[]
  strains?: string[]
  thc: string
  cbd: string
  tags: string[]
  gradient: string
  glowColor: string
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
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Premium', 'Filtrato'],
    gradient: 'linear-gradient(135deg, #8B6914 0%, #DAA520 58%, #FFD700 100%)',
    glowColor: 'rgba(218,165,32,0.16)',
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
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Exotic terps', 'Creamy vibes'],
    gradient: 'linear-gradient(135deg, #FF6B9D 0%, #FFA500 40%, #00D4FF 100%)',
    glowColor: 'rgba(255,107,157,0.16)',
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
    thc: 'N/D',
    cbd: 'N/D',
    tags: ['Frozen quality', 'Heavy flavour'],
    gradient: 'linear-gradient(135deg, #071522 0%, #12384a 58%, #030608 100%)',
    glowColor: 'rgba(120,205,240,0.16)',
  },
]
