import { Link } from 'react-router'

type LegalPageProps = {
  type: 'privacy' | 'terms'
}

const sectionStyle = {
  padding: '22px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
}

const titleStyle = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: '1rem',
  fontWeight: 700,
  color: '#F5F5F5',
  marginBottom: 10,
}

const textStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.88rem',
  lineHeight: 1.75,
  color: 'rgba(245,245,245,0.56)',
}

export function LegalPage({ type }: LegalPageProps) {
  const isPrivacy = type === 'privacy'

  return (
    <div className="cc-legal-page" style={{ minHeight: '100vh', paddingTop: 72 }}>
      <div className="legal-content" style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 100px' }}>
        <Link to="/profilo" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#D6B25E', textDecoration: 'none' }}>
          Torna all'area privata
        </Link>

        <div style={{ marginTop: 28, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 12 }}>
            CAMPOCLARO
          </div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#F5F5F5', margin: 0, lineHeight: 1.1 }}>
            {isPrivacy ? 'Privacy Policy' : 'Termini e Notifiche'}
          </h1>
          <div style={{ ...textStyle, marginTop: 12, color: 'rgba(245,245,245,0.36)' }}>
            Ultimo aggiornamento: 23 Maggio 2026
          </div>
        </div>

        {isPrivacy ? (
          <>
            <section style={sectionStyle}>
              <div style={titleStyle}>Dati trattati</div>
              <p style={textStyle}>
                Trattiamo solo i dati necessari per gestire account, ordini, preferenze di consegna, preferenze di notifica e richieste di assistenza. I dati possono includere nome utente, identificativo Telegram, dettagli ordine, indirizzo o note fornite volontariamente.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Finalità</div>
              <p style={textStyle}>
                I dati vengono usati per fornire il servizio richiesto, registrare gli ordini, rispondere alle richieste e inviare aggiornamenti transazionali solo quando le notifiche sono attive.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Notifiche Telegram</div>
              <p style={textStyle}>
                Le notifiche sono abilitate di default per gli aggiornamenti operativi relativi agli ordini. L'utente può disattivarle dalle impostazioni o durante il checkout. Se disattivate, l'ordine viene salvato con notifiche off e non deve essere usato per invii automatici.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Marketing</div>
              <p style={textStyle}>
                Non inviamo newsletter o comunicazioni promozionali automatiche senza consenso separato. La preferenza newsletter è disattivata di default.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Conservazione e diritti</div>
              <p style={textStyle}>
                Conserviamo i dati per il tempo necessario alla gestione del servizio e agli obblighi applicabili. L'utente può richiedere accesso, rettifica o cancellazione dei propri dati tramite il canale di supporto indicato dal servizio.
              </p>
            </section>
          </>
        ) : (
          <>
            <section style={sectionStyle}>
              <div style={titleStyle}>Uso del servizio</div>
              <p style={textStyle}>
                Il servizio permette di consultare il catalogo, preparare un ordine e ricevere aggiornamenti operativi. L'utente è responsabile dell'accuratezza delle informazioni inserite.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Regole notifiche</div>
              <p style={textStyle}>
                Le notifiche sono esclusivamente transazionali: conferma ordine, aggiornamenti di stato, pagamento, consegna o ritiro. Non sono messaggi massivi, non sono invii promozionali e non vengono mandate se l'utente disattiva la preferenza.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Opt-out</div>
              <p style={textStyle}>
                Le notifiche possono essere disattivate in qualsiasi momento da Area Privata, Impostazioni, oppure dal checkout prima dell'invio dell'ordine. La scelta viene salvata localmente e inviata insieme all'ordine.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Canali Telegram</div>
              <p style={textStyle}>
                Il bot o il canale Telegram deve rispettare le preferenze dell'utente. Prima di qualsiasi invio automatico, il sistema deve verificare che notifiche siano attive per quell'ordine o account.
              </p>
            </section>
            <section style={sectionStyle}>
              <div style={titleStyle}>Modifiche</div>
              <p style={textStyle}>
                Le condizioni possono essere aggiornate per chiarire funzionamento del servizio, preferenze di notifica o requisiti tecnici. Le modifiche rilevanti saranno rese disponibili in questa pagina.
              </p>
            </section>
          </>
        )}
      </div>
      <style>{`
        .legal-content p {
          overflow-wrap: anywhere;
        }
        @media (max-width: 700px) {
          .cc-legal-page {
            padding-top: 64px !important;
          }
          .legal-content {
            padding: 30px 12px calc(92px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </div>
  )
}
