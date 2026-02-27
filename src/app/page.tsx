"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

/* ── Animated counter ── */
function useCountUp(end: number, duration = 2000, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [end, duration, delay]);
  return value;
}

/* ── Intersection observer for scroll reveals ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Floating particles (subtle) ── */
function Particles() {
  return (
    <div className="lp-particles" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="lp-particle" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 8}s`,
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          opacity: 0.15 + Math.random() * 0.25,
        }} />
      ))}
    </div>
  );
}

/* ── Animated typing terminal ── */
function TerminalPreview() {
  const lines = [
    { prompt: true, text: "repoangel audit --contract VaultStrategy.sol" },
    { prompt: false, text: "⏳ Parsing 420 LOC of Solidity..." },
    { prompt: false, text: "🔍 Running AI security analysis (Bedrock Claude)..." },
    { prompt: false, text: "✅ Audit complete: ISSUES_FOUND (2 medium severity)" },
    { prompt: false, text: "💰 x402 payment received: +$10.00 USDC → treasury" },
    { prompt: true, text: "repoangel evaluate --pr #42 --author alex-dev" },
    { prompt: false, text: "📊 Complexity: HIGH | Impact: MAJOR | Quality: 92/100" },
    { prompt: false, text: "💸 Bounty calculated: $12.50 USDC → 0x7a3f...9c2d" },
    { prompt: false, text: "🔒 High-risk: hiring Security Oracle ($1.00 M2M)" },
    { prompt: false, text: "✅ PR approved — USDC sent on Base L2" },
  ];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 800 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [shown, lines.length]);

  return (
    <div className="lp-terminal">
      <div className="lp-terminal-bar">
        <div className="lp-terminal-dots">
          <span className="lp-dot-red" /><span className="lp-dot-yellow" /><span className="lp-dot-green" />
        </div>
        <span className="lp-terminal-title">repoangel-cli — base-l2</span>
      </div>
      <div className="lp-terminal-body">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className={`lp-term-line ${i === shown - 1 ? "lp-term-new" : ""}`}>
            {l.prompt ? (
              <><span className="lp-term-prompt">$</span> <span className="lp-term-cmd">{l.text}</span></>
            ) : (
              <span className="lp-term-out">{l.text}</span>
            )}
          </div>
        ))}
        <div className="lp-term-cursor">█</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [heroVis, setHeroVis] = useState(false);
  useEffect(() => setHeroVis(true), []);

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal();

  const statAudits = useCountUp(142, 2000, 800);
  const statBounties = useCountUp(89, 2000, 1000);
  const statPaid = useCountUp(4720, 2500, 1200);

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <span className="lp-nav-icon">😇</span>
          <span className="lp-nav-name">RepoAngel</span>
          <span className="lp-nav-version">v2.0</span>
        </div>
        <div className="lp-nav-links">
          <a href="#protocol">Protocol</a>
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
          <Link href="/dashboard" className="lp-nav-cta">Launch Dashboard →</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className={`lp-hero ${heroVis ? "lp-visible" : ""}`}>
        <Particles />
        <div className="lp-hero-glow" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Built on PinionOS · x402 Protocol · Base L2
          </div>

          <h1 className="lp-hero-title">
            The First<br />
            <span className="lp-gradient-text">Self-Sustaining</span><br />
            Open-Source Sponsor
          </h1>

          <p className="lp-hero-sub">
            An autonomous AI agent that earns revenue from enterprise code audits
            and reinvests it to fund open-source developers — creating a closed-loop
            economy where <strong>software pays for software.</strong>
          </p>

          <div className="lp-hero-actions">
            <Link href="/dashboard" className="lp-btn-primary">
              <span className="lp-btn-glow" />
              Open Mission Control
            </Link>
            <a href="#protocol" className="lp-btn-ghost">How It Works</a>
          </div>

          {/* STATS */}
          <div className="lp-stats-bar">
            <div className="lp-stat">
              <span className="lp-stat-value">{statAudits}</span>
              <span className="lp-stat-label">Audits Completed</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-value">{statBounties}</span>
              <span className="lp-stat-label">Bounties Paid</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-value">${statPaid.toLocaleString()}</span>
              <span className="lp-stat-label">USDC Distributed</span>
            </div>
          </div>
        </div>

        {/* TERMINAL PREVIEW */}
        <div className="lp-hero-visual">
          <TerminalPreview />
        </div>
      </section>

      {/* ═══ PROTOCOL FLOW ═══ */}
      <section className={`lp-section lp-reveal ${s1.visible ? "lp-revealed" : ""}`} id="protocol" ref={s1.ref}>
        <div className="lp-section-tag">The Robinhood Protocol</div>
        <h2 className="lp-section-title">Tax Enterprise. <span className="lp-gradient-text">Fund Open Source.</span></h2>
        <p className="lp-section-sub">
          A dual-economy autonomous agent operating as both an x402 server and client —
          earning, spending, and subcontracting entirely on its own.
        </p>

        <div className="lp-flow">
          <div className="lp-flow-node lp-flow-earn lp-glow-card">
            <div className="lp-flow-num">01</div>
            <div className="lp-flow-icon">🏢</div>
            <div className="lp-flow-label">Enterprise Client</div>
            <div className="lp-flow-sub">Pays via x402 paywall for a Solidity smart contract audit</div>
            <div className="lp-flow-amount">+$10.00 USDC</div>
          </div>
          <div className="lp-flow-connector">
            <svg width="60" height="24" viewBox="0 0 60 24"><path d="M0 12 L50 12 M42 4 L50 12 L42 20" stroke="var(--green)" strokeWidth="2" fill="none" opacity="0.6" /></svg>
          </div>
          <div className="lp-flow-node lp-flow-core lp-glow-card">
            <div className="lp-flow-num">02</div>
            <div className="lp-flow-icon">😇</div>
            <div className="lp-flow-label">RepoAngel</div>
            <div className="lp-flow-sub">Autonomous treasury manages income and expenditure</div>
            <div className="lp-flow-amount" style={{ color: "var(--accent)" }}>Self-Managed</div>
          </div>
          <div className="lp-flow-connector">
            <svg width="60" height="24" viewBox="0 0 60 24"><path d="M0 12 L50 12 M42 4 L50 12 L42 20" stroke="var(--violet)" strokeWidth="2" fill="none" opacity="0.6" /></svg>
          </div>
          <div className="lp-flow-node lp-flow-spend lp-glow-card">
            <div className="lp-flow-num">03</div>
            <div className="lp-flow-icon">👩‍💻</div>
            <div className="lp-flow-label">OSS Developer</div>
            <div className="lp-flow-sub">Receives dynamically priced USDC bounty on Base L2</div>
            <div className="lp-flow-amount" style={{ color: "var(--violet)" }}>-$5.00 USDC</div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className={`lp-section lp-reveal ${s2.visible ? "lp-revealed" : ""}`} id="features" ref={s2.ref}>
        <div className="lp-section-tag">Capabilities</div>
        <h2 className="lp-section-title">Three Layers of <span className="lp-gradient-text">Autonomy</span></h2>
        <div className="lp-features">
          <div className="lp-feature lp-glow-card">
            <div className="lp-feature-icon-wrap" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)" }}>
              <span>💰</span>
            </div>
            <h3 className="lp-feature-title">Enterprise Audits</h3>
            <p className="lp-feature-desc">
              Web3 startups pay via x402 paywall for AI-powered Solidity security audits.
              Revenue flows directly into the treasury.
            </p>
            <div className="lp-feature-footer">
              <span className="lp-feature-tag" style={{ color: "var(--green)" }}>x402 Server</span>
              <span className="lp-feature-tag" style={{ color: "var(--green)" }}>Earner</span>
            </div>
          </div>
          <div className="lp-feature lp-glow-card">
            <div className="lp-feature-icon-wrap" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0.05) 100%)" }}>
              <span>💸</span>
            </div>
            <h3 className="lp-feature-title">Dynamic Bounties</h3>
            <p className="lp-feature-desc">
              AI evaluates every PR for complexity, impact, and quality — pricing
              bounties from $0.50 to $50.00 USDC in real-time.
            </p>
            <div className="lp-feature-footer">
              <span className="lp-feature-tag" style={{ color: "var(--accent)" }}>x402 Client</span>
              <span className="lp-feature-tag" style={{ color: "var(--accent)" }}>Spender</span>
            </div>
          </div>
          <div className="lp-feature lp-glow-card">
            <div className="lp-feature-icon-wrap" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)" }}>
              <span>🔒</span>
            </div>
            <h3 className="lp-feature-title">M2M Security</h3>
            <p className="lp-feature-desc">
              High-risk PRs trigger agent-to-agent subcontracting — a Security Oracle
              is hired via x402 for dual-verification.
            </p>
            <div className="lp-feature-footer">
              <span className="lp-feature-tag" style={{ color: "var(--red)" }}>Machine-to-Machine</span>
              <span className="lp-feature-tag" style={{ color: "var(--red)" }}>M2M</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <section className={`lp-section lp-reveal ${s3.visible ? "lp-revealed" : ""}`} id="architecture" ref={s3.ref}>
        <div className="lp-section-tag">Under the Hood</div>
        <h2 className="lp-section-title">Built for the <span className="lp-gradient-text">Machine Economy</span></h2>
        <div className="lp-arch-grid">
          {[
            { n: "01", t: "GitHub Webhook", d: "PR merged → webhook intercepted → diff parsed and analyzed" },
            { n: "02", t: "3-Tier AI Engine", d: "PinionOS chat() → Bedrock Claude → deep heuristic fallback" },
            { n: "03", t: "Dynamic Pricing", d: "Complexity × impact × quality → bounty across 5 pricing tiers" },
            { n: "04", t: "Treasury Guardrails", d: "$500/mo budget, per-PR caps, epoch queuing — self-managed" },
            { n: "05", t: "x402 Settlement", d: "USDC signed and broadcast on Base L2 via PinionOS send()" },
            { n: "06", t: "Closed Loop", d: "Audit revenue → treasury → OSS bounties. Self-sustaining." },
          ].map(c => (
            <div key={c.n} className="lp-arch-card lp-glow-card">
              <div className="lp-arch-num">{c.n}</div>
              <h4>{c.t}</h4>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TECH + CTA ═══ */}
      <section className={`lp-section lp-reveal ${s4.visible ? "lp-revealed" : ""}`} ref={s4.ref}>
        <div className="lp-tech-row">
          {["PinionOS SDK", "AWS Bedrock", "Base L2", "x402 Protocol", "Next.js", "TypeScript", "Solidity"].map(t => (
            <span key={t} className="lp-tech-badge">{t}</span>
          ))}
        </div>
      </section>

      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <h2 className="lp-cta-title">See the Autonomous Economy <span className="lp-gradient-text">in Action</span></h2>
        <p className="lp-cta-sub">Open Mission Control and run the full Robinhood Protocol cycle.</p>
        <Link href="/dashboard" className="lp-btn-primary lp-btn-lg">
          <span className="lp-btn-glow" />
          Launch Dashboard →
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand"><span>😇</span> RepoAngel</div>
        <div className="lp-footer-text">PinionOS Hackathon · Autonomous AI Agent · Self-Sustaining Public Goods</div>
      </footer>
    </div>
  );
}
