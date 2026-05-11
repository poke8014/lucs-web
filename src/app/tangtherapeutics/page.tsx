import Script from 'next/script'

const SERVICES = [
  {
    name: 'Swedish Massage',
    description:
      'A gentle, flowing massage that eases tension, improves circulation, and invites deep relaxation. A great starting point — no experience needed.',
  },
  {
    name: 'Deep Tissue',
    description:
      'Sustained, focused pressure that reaches deeper layers of muscle. Ideal for chronic tension, postural patterns, or areas that need real attention.',
  },
]

const AVAILABILITY = [
  { day: 'Friday', hours: '5:00 pm – 8:00 pm' },
  { day: 'Saturday', hours: '9:00 am – 5:00 pm' },
  { day: 'Sunday', hours: '9:00 am – 5:00 pm' },
]

export default function MassagePage() {
  return (
    <div style={{ background: '#FAF7F2', color: '#3D2B1F', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FAF7F2',
        borderBottom: '1px solid #E8DDD4',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <span style={{
          fontFamily: 'var(--font-heading, Georgia, serif)',
          fontSize: '1.25rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: '#3D2B1F',
        }}>
          Tang Therapeutics
        </span>
        <a
          href="#booking"
          style={{
            background: '#7B5040',
            color: '#FAF7F2',
            padding: '0.55rem 1.4rem',
            borderRadius: '2rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '0.03em',
          }}
        >
          Book a Session
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 4rem)',
        background: 'linear-gradient(160deg, #FAF7F2 0%, #F2E5D7 100%)',
      }}>
        <p style={{
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#9C7560',
          marginBottom: '1.5rem',
          fontWeight: 500,
        }}>
          Therapeutic Massage &amp; Bodywork
        </p>

        <h1 style={{
          fontFamily: 'var(--font-heading, Georgia, serif)',
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 500,
          lineHeight: 1.1,
          color: '#3D2B1F',
          maxWidth: '14ch',
          marginBottom: '1.75rem',
        }}>
          Restore Balance.<br />
          <em style={{ fontStyle: 'italic', color: '#7B5040' }}>Feel Renewed.</em>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: '#7A5C4A',
          maxWidth: '52ch',
          lineHeight: 1.75,
          marginBottom: '0.75rem',
        }}>
          Massage should not be a luxury, but a regular part of
          taking care of yourself. Every session is tailored to what your body needs.
        </p>

        <p style={{
          fontSize: '0.9rem',
          color: '#B8917C',
          maxWidth: '48ch',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
          fontStyle: 'italic',
        }}>
          Book to discover what&apos;s limiting your movement.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="#booking"
            style={{
              background: '#7B5040',
              color: '#FAF7F2',
              padding: '0.875rem 2.25rem',
              borderRadius: '2rem',
              fontSize: '1rem',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Book a Session
          </a>
          <a
            href="#services"
            style={{
              border: '1.5px solid #B8917C',
              color: '#7B5040',
              padding: '0.875rem 2.25rem',
              borderRadius: '2rem',
              fontSize: '1rem',
              fontWeight: 500,
              textDecoration: 'none',
              background: 'transparent',
            }}
          >
            See Services
          </a>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="services" style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 6vw, 5rem)',
        background: '#FAF7F2',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#9C7560',
            marginBottom: '0.75rem',
            fontWeight: 500,
          }}>
            What I Offer
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: '#3D2B1F',
            marginBottom: '0.75rem',
          }}>
            Services
          </h2>
          <p style={{
            color: '#9C7560',
            fontSize: '1rem',
            marginBottom: '3rem',
            maxWidth: '55ch',
            lineHeight: 1.7,
          }}>
            No two sessions are the same. Whether you&apos;re new to massage or a regular,
            we&apos;ll work together to find what your body needs.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {SERVICES.map((service) => (
              <div
                key={service.name}
                style={{
                  background: '#FFFCF8',
                  border: '1px solid #E8DDD4',
                  borderRadius: '1.25rem',
                  padding: '2.25rem',
                }}
              >
                <h3 style={{
                  fontFamily: 'var(--font-heading, Georgia, serif)',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: '#3D2B1F',
                  marginBottom: '0.85rem',
                }}>
                  {service.name}
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#7A5C4A',
                  lineHeight: 1.75,
                  marginBottom: '1.5rem',
               }}>
                  {service.description}
                </p>
                <span style={{
                  display: 'inline-block',
                  background: '#F2E5D7',
                  color: '#9C7560',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '2rem',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                }}>
                  Pricing coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Availability ────────────────────────────────────────────────── */}
      <section id="availability" style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 6vw, 5rem)',
        background: '#F5EDE3',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#9C7560',
            marginBottom: '0.75rem',
            fontWeight: 500,
          }}>
            Hours
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: '#3D2B1F',
            marginBottom: '0.75rem',
          }}>
            When to Find Me
          </h2>
          <p style={{
            color: '#9C7560',
            fontSize: '1rem',
            marginBottom: '3rem',
            maxWidth: '52ch',
            lineHeight: 1.6,
          }}>
            Sessions run Friday through Sunday. Booking ahead is recommended — same-week
            slots go quickly.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}>
            {AVAILABILITY.map((slot) => (
              <div
                key={slot.day}
                style={{
                  background: '#FFFCF8',
                  border: '1px solid #E8DDD4',
                  borderRadius: '1.25rem',
                  padding: '2rem 1.75rem',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-heading, Georgia, serif)',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: '#3D2B1F',
                  marginBottom: '0.5rem',
                }}>
                  {slot.day}
                </p>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#7B5040',
                  fontWeight: 500,
                }}>
                  {slot.hours}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking / Calendar ──────────────────────────────────────────── */}
      <section id="booking" style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 6vw, 5rem)',
        background: '#FAF7F2',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#9C7560',
            marginBottom: '0.75rem',
            fontWeight: 500,
          }}>
            Availability
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: '#3D2B1F',
            marginBottom: '0.75rem',
          }}>
            Reserve Your Time
          </h2>
          <p style={{
            color: '#9C7560',
            fontSize: '1rem',
            marginBottom: '2.5rem',
            maxWidth: '52ch',
            lineHeight: 1.6,
          }}>
            Only open slots are shown. Any time I&apos;m unavailable is blocked — no details,
            just unavailable.
          </p>

          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/lucttang/30min?hide_event_type_details=1"
            style={{ minWidth: '320px', height: '750px', overflow: 'hidden' }}
          />
          <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="lazyOnload"
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #E8DDD4',
        padding: '2.5rem clamp(1.5rem, 6vw, 5rem)',
        background: '#FAF7F2',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading, Georgia, serif)',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#9C7560',
        }}>
          Tang Therapeutics
        </span>
        <p style={{ fontSize: '0.8rem', color: '#B8917C' }}>
          © {new Date().getFullYear()} · Sessions available Fri – Sun
        </p>
      </footer>

    </div>
  )
}
