import { useEffect, useState } from 'react'
import { api, SiteContent } from '../lib/api'

export const FALLBACK_SITE_CONTENT: SiteContent = {
  welcomeTitle: 'BENVENUTI SU CAMPOCLARO',
  welcomeSubtitle: 'Ship da BCN in tutto il mondo',
  infoCards: [
    { title: 'Shipping', body: 'Ship da BCN in tutto il mondo. Spediamo da lunedi a venerdi con track 24h.' },
    { title: 'Meet up', body: 'Meet up Barcellona. Meet up Italia previo pagamento con gestione 48h.' },
    { title: 'Corrieri', body: 'Usiamo UPS, InPost, SEUR e GLS. Penisola 48h, isole 72h.' },
    { title: 'Catalogo', body: 'Lavoriamo W*ed, H*sh, W*ite e tutti tipi di qualita. Ordine minimo 100g.' },
    { title: 'Pagamenti', body: 'Accettiamo crypto e soldi in posta.' },
  ],
  productFilters: ['Club Selection'],
  contactsTitle: 'CONTATTI',
  contactsIntro: 'Unici contatti ufficiali CAMPOCLARO. Usa solo questi link per evitare profili fake.',
  contacts: [
    { label: 'Linktree', value: 'linktr.ee/Campoclaro', url: 'https://linktr.ee/Campoclaro' },
    { label: 'Telegram', value: 't.me/campoclaro28', url: 'https://t.me/campoclaro28' },
    { label: 'Canale Signal prodotti', value: 'Signal prodotti', url: 'https://signal.group/#CjQKIP9RSrg0AVHBkbrD9Za2Y6up4LWO9DJRCbOhRhO4C3EzEhCCeyvjyjYp-HLLNVPNB6JD' },
    { label: 'Contatto diretto Signal', value: 'Signal diretto', url: 'https://signal.me/#eu/B1z1MUFIX7P82EBTxFmuI_E8E3YJAuCrX2ByhFyvkZvrVHf2p-xOVI0wbc-XTHij' },
    { label: 'Canale Potato prodotti', value: 'Campoclaroreal', url: 'https://tatokdym.org/Campoclaroreal' },
    { label: 'Canale Viber foto', value: 'Viber foto', url: 'https://invite.viber.com/?g2=AQBHCFHr%2ByzypFaNsXfqYd4biSbCF1FGOu8AH66AU4EEymDzYsfjX2DYKkcv%2FDBR' },
  ],
  circle: {
    enabled: true,
    orderCompletedPoints: 120,
    paymentVerifiedPoints: 60,
    notificationsPoints: 40,
    recurringCustomerPoints: 80,
    levels: [
      { id: 'guest', label: 'Guest', minScore: 0, description: 'Accesso base al club.', perks: ['Accesso catalogo', 'Area privata'] },
      { id: 'member', label: 'Member', minScore: 180, description: 'Cliente verificato con primi vantaggi.', perks: ['Passport storico', 'Notifiche prioritarie'] },
      { id: 'insider', label: 'Insider', minScore: 420, description: 'Profilo ricorrente con accesso migliorato.', perks: ['Priority processing', 'Private preview'] },
      { id: 'priority', label: 'Priority', minScore: 760, description: 'Corsia preferenziale sui drop selezionati.', perks: ['Reserved access', 'Fast reorder'] },
      { id: 'vault', label: 'Vault', minScore: 1200, description: 'Massimo livello CAMPO Circle.', perks: ['Vault drops', 'Accesso riservato'] },
    ],
  },
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(FALLBACK_SITE_CONTENT)

  useEffect(() => {
    let cancelled = false
    api.getSiteContent()
      .then(data => {
        if (!cancelled) setContent(data)
      })
      .catch(() => {
        if (!cancelled) setContent(FALLBACK_SITE_CONTENT)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return content
}
