import { motion } from 'motion/react'
import { ExternalLink, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { useSiteContent } from '../../hooks/useSiteContent'

function contactIcon(label: string) {
  const value = label.toLowerCase()
  if (value.includes('telegram')) return <Send size={18} />
  if (value.includes('signal')) return <MessageCircle size={18} />
  return <ExternalLink size={18} />
}

export function ContactPage() {
  const content = useSiteContent()

  return (
    <div className="cc-contact-page" style={{ minHeight: '100vh', paddingTop: 72 }}>
      <section className="contact-hero" style={{
        padding: '72px 24px 40px',
        background: 'linear-gradient(180deg, rgba(214,178,94,0.08), transparent)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#D6B25E',
              marginBottom: 14,
            }}>
              Unici contatti
            </div>
            <h1 style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.4rem)',
              lineHeight: 1.05,
              color: '#F5F5F5',
              margin: '0 0 16px',
            }}>
              {content.contactsTitle}
            </h1>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.96rem',
              lineHeight: 1.7,
              color: 'rgba(245,245,245,0.5)',
              maxWidth: 620,
              margin: 0,
            }}>
              {content.contactsIntro}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="contact-content" style={{ padding: '48px 24px 110px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="contact-security" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            background: 'rgba(214,178,94,0.06)',
            border: '1px solid rgba(214,178,94,0.16)',
            borderRadius: 8,
            color: '#D6B25E',
            marginBottom: 22,
          }}>
            <span className="cc-float-icon" style={{ display: 'flex' }}><ShieldCheck size={18} /></span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', letterSpacing: '0.04em' }}>
              Usa solo i canali pubblicati qui. I link vengono aggiornati dallo staff.
            </span>
          </div>

          <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {content.contacts.map((contact, i) => (
              <motion.a
                className="cc-interactive-card cc-animated-surface"
                key={`${contact.label}-${i}`}
                href={contact.url || '#'}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ y: -4, borderColor: 'rgba(214,178,94,0.35)', boxShadow: '0 18px 60px rgba(214,178,94,0.08)' }}
                style={{
                  minHeight: 132,
                  padding: 20,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(214,178,94,0.025))',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 18,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div className="cc-float-icon" style={{ color: '#D6B25E' }}>{contactIcon(contact.label)}</div>
                  <ExternalLink size={15} color="rgba(245,245,245,0.24)" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F5F5F5', marginBottom: 6 }}>
                    {contact.label}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(245,245,245,0.44)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                    {contact.value || contact.url}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>
      <style>{`
        @media (max-width: 700px) {
          .cc-contact-page {
            padding-top: 64px !important;
          }
          .contact-hero {
            padding: 42px 12px 26px !important;
          }
          .contact-content {
            padding: 26px 12px calc(90px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .contact-security {
            align-items: flex-start !important;
            padding: 12px !important;
          }
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .contact-grid a {
            min-height: 108px !important;
            padding: 14px !important;
          }
        }
      `}</style>
    </div>
  )
}
