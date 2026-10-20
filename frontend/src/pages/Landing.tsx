import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bell, CircleDot, FileCode2,
  GitBranch, Radar, ScanSearch, ShieldAlert, Sparkles, WandSparkles,
} from 'lucide-react'

const providers = [
  { name: 'STRIPE', mark: 'S', color: '#635bff', className: 'signal-one' },
  { name: 'OPENAI', mark: '◎', color: '#10a37f', className: 'signal-two' },
  { name: 'GITHUB', mark: 'GH', color: '#f0eee9', className: 'signal-three' },
  { name: 'SUPABASE', mark: 'S', color: '#3ecf8e', className: 'signal-four' },
  { name: 'TWILIO', mark: 'T', color: '#f22f46', className: 'signal-five' },
  { name: 'GOOGLE', mark: 'G', color: '#4285f4', className: 'signal-six' },
]

const flow = [
  {
    n: '01', icon: FileCode2, title: 'Bring your stack',
    copy: 'Drop in package.json or requirements.txt, or pick APIs yourself. No account needed.',
    tag: 'YOUR PROJECT',
  },
  {
    n: '02', icon: Radar, title: 'Choose what to watch',
    copy: 'ApiRadar matches supported SDKs and builds a watchlist right in this browser.',
    tag: 'YOUR WATCHLIST',
  },
  {
    n: '03', icon: Bell, title: 'Catch published changes',
    copy: 'When monitored sources publish a change, review its severity and migration notes in your feed.',
    tag: 'YOUR CHANGE FEED',
  },
]

const signals = [
  { time: 'SOURCE', title: 'Provider publishes an update', detail: 'Release notes · changelog · API spec', icon: GitBranch },
  { time: 'RADAR', title: 'Change gets analyzed', detail: 'Detected · classified · summarized', icon: ScanSearch },
  { time: 'YOU', title: 'You get a clear next step', detail: 'Severity · impact · migration guidance', icon: ShieldAlert },
]

export default function Landing() {
  const navigate = useNavigate()
  const revealRefs = useRef<HTMLElement[]>([])

  useEffect(() => {
    const nodes = revealRefs.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('radar-visible'))
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('radar-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const reveal = (node: HTMLElement | null) => {
    if (node && !revealRefs.current.includes(node)) revealRefs.current.push(node)
  }

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="ApiRadar home"><span>API</span>RADAR<sup>®</sup></Link>
        <div className="landing-nav-right">
          <Link to="/login" className="landing-signin">SIGN IN <span>(OPTIONAL)</span></Link>
          <button className="landing-nav-cta" onClick={() => navigate('/dashboard/stack')}>BUILD A WATCHLIST <ArrowUpRight size={15} /></button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbit orbit-a" aria-hidden="true" />
        <div className="hero-orbit orbit-b" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> API CHANGE INTELLIGENCE <span className="eyebrow-index">ISSUE 001 / ALWAYS ON</span></div>
          <h1><span className="hero-title-api">API</span><span className="hero-title-radar">RADAR</span></h1>
          <p className="hero-subtitle">Know what changed.<br /><em>Before it breaks your build.</em></p>
          <div className="hero-actions">
            <button className="button-light" onClick={() => navigate('/dashboard/stack')}>BUILD YOUR WATCHLIST <ArrowRight size={16} /></button>
            <button className="button-outline" onClick={() => navigate('/dashboard/feed')}>EXPLORE THE LIVE FEED <ArrowDown size={15} /></button>
          </div>
          <div className="hero-note"><Sparkles size={14} /> Start free in this browser. No sign-in required.</div>
        </div>
        <div className="signal-cloud" aria-label="API providers monitored">
          {providers.map((provider) => (
            <div key={provider.name} className={`signal-chip ${provider.className}`}>
              <span className="signal-mark" style={{ color: provider.color }}>{provider.mark}</span>
              <span>{provider.name}</span><i />
            </div>
          ))}
          <div className="radar-center"><Radar size={35} strokeWidth={1.4} /><span>RADAR<br />ACTIVE</span></div>
          <div className="signal-caption">A wider view of the APIs your product depends on.</div>
        </div>
        <a href="#story" className="scroll-cue"><span>SCROLL TO SEE HOW IT WORKS</span><ArrowDown size={15} /></a>
        <div className="hero-stamp" aria-hidden="true">DEPENDENCY<br />INTELLIGENCE<br /><b>● LIVE</b></div>
      </section>

      <div className="ticker-band landing-ticker" aria-hidden="true">
        <div className="ticker-inner">{[...providers, ...providers].map((p, i) => <span key={`${p.name}-${i}`} className="ticker-word"><b>{p.mark}</b> {p.name} <i>✳</i></span>)}<span className="ticker-word">OFFICIAL SOURCE WATCH <i>✳</i></span></div>
      </div>

      <section id="story" ref={reveal} className="story-section reveal-section">
        <div className="story-heading">
          <div className="eyebrow dark-eyebrow">01 / THE PROBLEM</div>
          <h2>Change is normal.<br /><span>Finding out late isn’t.</span></h2>
          <p>Important API updates hide in release notes, changelogs, and spec files. ApiRadar brings the signal into one place, so you can decide what to do next.</p>
        </div>
        <div className="problem-art" aria-label="Scattered API updates converge into a single radar signal">
          <div className="orbit-line orbit-line-one" /><div className="orbit-line orbit-line-two" />
          <div className="problem-tag tag-release">RELEASE NOTES <span>v4.2.0</span></div>
          <div className="problem-tag tag-spec">OPENAPI SPEC <span>DIFF FOUND</span></div>
          <div className="problem-tag tag-blog">PROVIDER BLOG <span>NEW POST</span></div>
          <div className="problem-radar"><Radar size={54} strokeWidth={1.2} /><span>ONE CLEAR<br />SIGNAL</span></div>
          <div className="problem-alert"><span className="severity-dot" /> BREAKING CHANGE FOUND <ArrowRight size={13} /></div>
          <div className="art-caption">NO MORE TAB-HOPPING <span>✳</span> JUST THE CHANGES THAT MATTER</div>
        </div>
      </section>

      <section ref={reveal} className="monitor-section reveal-section">
        <div className="monitor-intro">
          <div className="eyebrow"><span className="live-dot" /> 02 / THE RADAR LOOP</div>
          <h2>From provider signal<br />to your next move.</h2>
          <p>Three clear steps take a newcomer from “what is this?” to a watchlist that makes sense.</p>
        </div>
        <div className="signal-timeline">
          {signals.map((item, index) => {
            const Icon = item.icon
            return <article key={item.time} className={`timeline-card timeline-card-${index + 1}`}>
              <div className="timeline-top"><span>{item.time} / 0{index + 1}</span><Icon size={19} /></div>
              <h3>{item.title}</h3><p>{item.detail}</p>
              <div className="timeline-progress"><span style={{ width: `${(index + 1) * 31}%` }} /></div>
              {index < signals.length - 1 && <ArrowRight className="timeline-arrow" size={18} />}
            </article>
          })}
        </div>
        <div className="monitor-footnote"><CircleDot size={14} /> Current monitoring reports published changes from configured provider sources.</div>
      </section>

      <section ref={reveal} className="forecast-section reveal-section">
        <div className="forecast-orbit" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="forecast-copy">
          <div className="eyebrow"><WandSparkles size={14} /> 03 / THE BIGGER VISION</div>
          <div className="forecast-kicker">EXPERIMENTAL <b>90-DAY</b> OUTLOOK</div>
          <h2>See the risk<br />on the horizon.</h2>
          <p>ApiRadar estimates the chance of another warning or breaking-change signal within 90 days, using each provider’s sourced history. It is an <strong>early, experimental estimate</strong>, not a claim about an unpublished endpoint or roadmap.</p>
          <div className="forecast-status"><span className="status-dash" /> EVIDENCE-LINKED RISK ESTIMATES <span className="status-next">LOW-DATA APIS ARE HELD BACK</span></div>
        </div>
        <div className="forecast-visual" aria-label="Illustrative timeline from early signals toward a possible future change">
          <div className="forecast-window"><div className="forecast-window-head"><span>HORIZON / 90 DAYS</span><span className="forecast-badge">EXPERIMENTAL · LIVE</span></div>
            <div className="forecast-track"><span className="track-past" /><span className="track-future" /><i className="track-now" /><i className="track-target" /></div>
            <div className="forecast-dates"><span>NOW</span><span>EARLY SIGNALS</span><span>UP TO 3 MONTHS</span></div>
            <div className="forecast-placeholder"><div className="placeholder-icon"><Radar size={25} /></div><div><b>Evidence-linked risk outlook</b><span>Open the forecast page to see each API’s evidence and confidence</span></div><span className="placeholder-lock">OPEN OUTLOOK →</span></div>
            <div className="forecast-window-foot"><span>LOW-DATA PROVIDERS</span><span>HELD BACK · NEVER GUESSED</span></div>
          </div>
          <span className="forecast-side-note">THE GOAL IS TO SURFACE A SIGNAL BEFORE THE CHANGE IS ANNOUNCED.</span>
        </div>
      </section>

      <section ref={reveal} className="newbie-section reveal-section">
        <div className="newbie-head">
          <div><div className="eyebrow dark-eyebrow">04 / YOUR FIRST MINUTE</div><h2>New here?<br /><span>Start right here.</span></h2></div>
          <div className="newbie-aside">No setup ceremony.<br />No account gate.<br /><b>Just pick a starting point.</b></div>
        </div>
        <div className="flow-cards">
          {flow.map((step, index) => {
            const Icon = step.icon
            return <article key={step.n} className="flow-card">
              <div className="flow-card-head"><span>{step.n} / 03</span><Icon size={23} strokeWidth={1.5} /></div>
              <div><h3>{step.title}</h3><p>{step.copy}</p></div>
              <div className="flow-card-foot"><span>{step.tag}</span>{index < 2 && <ArrowRight size={15} />}</div>
            </article>
          })}
        </div>
        <div className="flow-file-note"><FileCode2 size={16} /><span><b>About your file:</b> the current scanner recognizes supported SDK dependencies. It does not inspect source code or predict changes from the file.</span></div>
      </section>

      <section ref={reveal} className="api-wall reveal-section">
        <div className="api-wall-head"><div className="eyebrow">05 / THE SIGNAL NETWORK</div><h2>Many providers.<br /><span>One radar.</span></h2><p>Logo tokens are the providers in ApiRadar’s catalog. Coverage depends on the sources configured for each API.</p></div>
        <div className="provider-wall">{providers.map((provider, i) => <div className={`provider-tile provider-tile-${i + 1}`} key={provider.name}><span className="provider-logo" style={{ color: provider.color }}>{provider.mark}</span><span>{provider.name}</span><ArrowUpRight size={13} /></div>)}<div className="provider-center"><Radar size={32} /><span>APIRADAR</span></div></div>
      </section>

      <section className="closing-section">
        <div className="closing-spark" aria-hidden="true">✳</div>
        <div className="eyebrow">READY WHEN YOU ARE / NO ACCOUNT REQUIRED</div>
        <h2>Keep your eyes<br />on the <em>horizon.</em></h2>
        <p>Start with confirmed changes, or explore the experimental<br />three-month risk outlook.</p>
        <div className="hero-actions closing-actions">
          <button className="button-light" onClick={() => navigate('/dashboard/stack')}>BUILD A WATCHLIST <ArrowRight size={16} /></button>
          <button className="button-outline" onClick={() => navigate('/dashboard/feed')}>SEE THE CHANGE FEED <ArrowUpRight size={15} /></button>
          <button className="button-outline" onClick={() => navigate('/dashboard/forecast')}>EXPLORE 90-DAY OUTLOOK <Radar size={15} /></button>
        </div>
        <footer className="landing-footer"><Link to="/" className="landing-brand"><span>API</span>RADAR<sup>®</sup></Link><span>KNOW BEFORE YOUR APIS BREAK.</span><span>APIRADAR © 2026</span></footer>
      </section>
    </main>
  )
}
