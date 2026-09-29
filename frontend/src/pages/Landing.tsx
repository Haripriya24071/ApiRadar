import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [hoveredApi, setHoveredApi] = useState<string | null>(null)

  // Track navbar scroll state
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // IntersectionObserver for section fade-up transitions
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-up')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    sectionRefs.current.forEach((sec) => {
      if (sec) observer.observe(sec)
    })

    return () => observer.disconnect()
  }, [])

  const apis = ['STRIPE', 'OPENAI', 'SUPABASE', 'TWILIO', 'GITHUB', 'SENDGRID']

  const tickerItems = [
    'STRIPE',
    'OPENAI',
    'SUPABASE',
    'TWILIO',
    'GITHUB',
    'SENDGRID',
    'BREAKING CHANGE DETECTED',
    'API DIFF ENGINE',
    'REAL-TIME MONITORING',
  ]

  const problemRows = [
    {
      num: '01',
      title: 'Silent Endpoint Deprecations',
      desc: 'APIs release breaking changes with short sunset windows buried in blog posts.',
    },
    {
      num: '02',
      title: 'OpenAPI Spec Drift',
      desc: 'Field type changes and removed payload parameters silently break production code.',
    },
    {
      num: '03',
      title: 'Scattered Release Logs',
      desc: 'Eng teams spend hours manually checking GitHub releases, RSS feeds, and docs.',
    },
  ]

  const mechanismSteps = [
    {
      num: '01',
      title: 'Multi-Source Scrape',
      desc: 'Automated 6-hour cycles crawling RSS feeds, GitHub releases, and OpenAPI schemas.',
      chip: '[RSS + GITHUB + OPENAPI]',
    },
    {
      num: '02',
      title: 'LLM Diff Intelligence',
      desc: 'GPT-4o-mini extracts exact breaking changes, severity rankings, and migration guides.',
      chip: '[GPT-4o-mini]',
    },
    {
      num: '03',
      title: 'Direct Feed & Digest',
      desc: 'Instant web alert feeds plus custom daily HTML email summaries delivered at 8:00 AM.',
      chip: '[YOUR INBOX]',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--cream)] font-['Space_Grotesk'] selection:bg-[var(--red)] selection:text-[var(--white)]">
      {/* FIXED NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 h-[56px] z-[100] transition-all duration-300 px-6 md:px-12 flex items-center justify-between ${
          scrolled
            ? 'bg-[var(--black)] border-b border-[var(--border-dark)]'
            : 'bg-transparent'
        }`}
      >
        <Link
          to="/"
          className="font-['Space_Mono'] text-[13px] tracking-[0.15em] text-[var(--cream)] hover:text-[var(--red)] transition-colors"
          data-cursor="hover"
        >
          APIRADAR©
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/login"
            className="font-['Space_Mono'] text-[11px] tracking-[0.1em] text-[var(--cream)] hover:text-[var(--red)] transition-colors uppercase"
            data-cursor="hover"
          >
            LOGIN
          </Link>
          <button
            onClick={() => navigate('/register')}
            className="bg-[var(--cream)] text-[var(--black)] font-['Space_Mono'] text-[11px] font-bold tracking-[0.1em] px-4 py-2 hover:bg-[var(--red)] hover:text-[var(--white)] transition-colors"
            data-cursor="hover"
          >
            MONITOR NOW →
          </button>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section
        ref={(el) => (sectionRefs.current[0] = el)}
        className="min-h-screen w-full flex flex-col justify-between pt-[15vh] pb-12 px-6 md:px-16 section-dark opacity-0"
      >
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center text-center">
          {/* Section Label */}
          <div className="editorial-label mb-8">
            00_1 // INTELLIGENCE SYSTEM
          </div>

          {/* SPLIT GIANT TEXT */}
          <div className="relative inline-flex items-center justify-center flex-wrap gap-2 md:gap-4 my-2">
            <div className="bg-[var(--red)] px-5 py-2 inline-block">
              <span className="display-text text-[var(--white)] block">API</span>
            </div>
            <div className="bg-transparent px-2 py-2 inline-block">
              <span className="display-text text-[var(--cream)] block">RADAR</span>
            </div>
          </div>
          <div className="w-full max-w-[680px] text-right font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] pr-2 -mt-2 mb-6">
            ©2025
          </div>

          {/* Subtitle */}
          <p className="text-[20px] font-light text-[var(--cream)] opacity-70 max-w-xl mt-4">
            Know before your APIs break.
          </p>

          {/* Stat Row */}
          <div className="font-['Space_Mono'] text-[11px] tracking-[0.15em] text-[var(--muted-dark)] mt-8 uppercase">
            6 APIS MONITORED · REAL-TIME DIFFS · ZERO NOISE
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
            <button
              onClick={() => navigate('/register')}
              className="bg-[var(--cream)] text-[var(--black)] font-['Space_Grotesk'] text-[13px] font-medium tracking-[0.05em] px-7 py-3.5 hover:bg-[var(--red)] hover:text-[var(--white)] transition-all uppercase"
              data-cursor="hover"
            >
              START MONITORING
            </button>
            <button
              onClick={() => navigate('/dashboard/feed')}
              className="bg-transparent text-[var(--cream)] border border-[var(--border-dark)] font-['Space_Grotesk'] text-[13px] font-medium tracking-[0.05em] px-7 py-3.5 hover:border-[var(--cream)] transition-all uppercase"
              data-cursor="hover"
            >
              SEE THE FEED →
            </button>
          </div>
        </div>

        {/* Animated Scroll Indicator */}
        <div className="flex flex-col items-center justify-center mt-16">
          <div className="relative w-[2px] h-[40px] bg-[var(--border-dark)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[12px] bg-[var(--cream)] animate-bounce" />
          </div>
          <span className="font-['Space_Mono'] text-[9px] text-[var(--muted-dark)] tracking-[0.2em] uppercase mt-2">
            SCROLL
          </span>
        </div>
      </section>

      {/* TICKER BAND */}
      <div className="ticker-band border-y border-[var(--border-dark)]">
        <div className="ticker-inner">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-2">
              {item} <span className="opacity-50">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* SECTION 2 — THE PROBLEM */}
      <section
        ref={(el) => (sectionRefs.current[1] = el)}
        className="py-24 px-6 md:px-16 section-light relative overflow-hidden opacity-0"
      >
        <div className="max-w-6xl mx-auto relative">
          <div className="editorial-label mb-12">00_2 // THE PROBLEM</div>

          {/* Giant Background Number */}
          <div className="absolute -top-12 -left-8 font-['Space_Mono'] text-[180px] md:text-[220px] font-bold text-[var(--border-light)] pointer-events-none select-none opacity-60 leading-none">
            3
          </div>

          <h2 className="relative z-10 text-[36px] md:text-[48px] font-bold leading-none mb-16 text-[var(--text-on-light)]">
            Your APIs are changing.
            <br />
            Right now. Without warning.
          </h2>

          {/* Pain Point Rows */}
          <div className="border-t border-[var(--border-light)] mt-8">
            {problemRows.map((row) => (
              <div
                key={row.num}
                className="group border-b border-[var(--border-light)] py-8 px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:bg-[var(--black)] hover:text-[var(--cream)]"
                data-cursor="hover"
              >
                <div className="flex items-start md:items-center gap-6 md:gap-12">
                  <span className="font-['Space_Mono'] text-[12px] text-[var(--muted-dark)] group-hover:text-[var(--gold)] transition-colors">
                    {row.num}
                  </span>
                  <h3 className="text-[20px] font-medium tracking-tight">
                    {row.title}
                  </h3>
                </div>
                <p className="text-[14px] text-[var(--muted-dark)] group-hover:text-[var(--muted-light)] max-w-md transition-colors">
                  {row.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW IT WORKS */}
      <section
        ref={(el) => (sectionRefs.current[2] = el)}
        className="py-24 px-6 md:px-16 section-dark border-t border-[var(--border-dark)] opacity-0"
      >
        <div className="max-w-6xl mx-auto">
          <div className="editorial-label mb-16">00_3 // MECHANISM</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-b md:border-b-0 border-[var(--border-dark)]">
            {mechanismSteps.map((step, index) => (
              <div
                key={step.num}
                className={`p-8 md:p-10 flex flex-col justify-between min-h-[320px] ${
                  index !== mechanismSteps.length - 1
                    ? 'border-b md:border-b-0 md:border-r border-[var(--border-dark)]'
                    : ''
                }`}
              >
                <div>
                  <div className="font-['Space_Mono'] text-[56px] md:text-[64px] font-bold text-[var(--border-dark)] leading-none mb-6">
                    {step.num}
                  </div>
                  <h3 className="text-[24px] font-bold mb-4 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-[14px] font-light text-[var(--muted-light)] leading-relaxed mb-8">
                    {step.desc}
                  </p>
                </div>
                <div className="font-['Space_Mono'] text-[10px] tracking-[0.15em] text-[var(--red)] uppercase">
                  {step.chip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — APIS */}
      <section
        ref={(el) => (sectionRefs.current[3] = el)}
        className="py-24 px-6 md:px-16 section-light border-t border-[var(--border-light)] opacity-0"
      >
        <div className="max-w-6xl mx-auto">
          <div className="editorial-label mb-12">00_4 // STACK</div>

          <h2 className="text-[36px] md:text-[48px] font-bold leading-none mb-16 text-[var(--text-on-light)]">
            6 APIs. Watched. Always.
          </h2>

          <div className="py-12 border-y border-[var(--border-light)] flex flex-wrap items-center justify-center md:justify-between gap-y-6 gap-x-4">
            {apis.map((api, idx) => (
              <React.Fragment key={api}>
                <span
                  onMouseEnter={() => setHoveredApi(api)}
                  onMouseLeave={() => setHoveredApi(null)}
                  className={`font-['Space_Grotesk'] text-[24px] md:text-[32px] font-light tracking-tight transition-all duration-200 cursor-pointer ${
                    hoveredApi === api
                      ? 'text-[var(--red)] underline underline-offset-8 decoration-2'
                      : 'text-[var(--text-on-light)]'
                  }`}
                  data-cursor="hover"
                >
                  {api}
                </span>
                {idx !== apis.length - 1 && (
                  <span className="text-[var(--muted-light)] text-[20px] select-none">
                    ·
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — FINAL CTA */}
      <section
        ref={(el) => (sectionRefs.current[4] = el)}
        className="py-28 px-6 md:px-16 section-dark border-t border-[var(--border-dark)] relative opacity-0"
      >
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="display-text text-[var(--cream)] mb-4">READY?</h2>
          <p className="text-[18px] font-light opacity-60 mb-10">
            Set up takes 60 seconds.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-[var(--cream)] text-[var(--black)] font-['Space_Grotesk'] text-[13px] font-medium tracking-[0.05em] px-8 py-4 hover:bg-[var(--red)] hover:text-[var(--white)] transition-all uppercase"
            data-cursor="hover"
          >
            START MONITORING
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-24 pt-8 border-t border-[var(--border-dark)] flex items-center justify-between font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] uppercase">
          <span>APIRADAR INTELLIGENCE SYSTEM</span>
          <span>APIRADAR © 2025</span>
        </div>
      </section>
    </div>
  )
}
