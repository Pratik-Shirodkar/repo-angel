"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MOCK_PRS } from "@/lib/mock-diffs";

interface EvalData {
  id: string;
  timestamp: number;
  pr: { title: string; author: string; repo: string; filesChanged: number; additions: number; deletions: number };
  ai: { verdict: "PASS" | "FAIL"; score: number; reasoning: string; highlights: string[]; concerns: string[] };
  payout: { amount: string; token: string; toAddress: string; txHash: string | null; status: string };
  source: string;
  securityAudit?: { triggered: boolean; cost: string; oracleWallet: string };
}

interface AuditData {
  id: string;
  timestamp: number;
  client: string;
  contractName: string;
  linesOfCode: number;
  amountCharged: string;
  verdict: "SECURE" | "ISSUES_FOUND" | "CRITICAL";
  summary: string;
  findings: string[];
  severity: string;
}

interface Stats { totalEvaluated: number; passed: number; failed: number; passRate: string; totalPaidUSDC: string; averageScore: string }
interface AgentStatus { name: string; version: string; status: string; walletAddress: string; balance: { ETH: string; USDC: string } | null; ethPrice: { priceUSD: number } | null }
interface Treasury { monthlyBudget: number; totalEarned: number; auditCount: number; totalSpent: number; bountyCount: number; netBalance: number; maxPerPR: number; epoch: string; securityAuditSpend: number }

interface TimelineEvent { id: string; time: number; type: "pass" | "fail" | "system" | "security" | "earn"; text: string }

const SPEND_STEPS = [
  "Intercepting GitHub webhook",
  "Parsing diff → file analysis",
  "Running AI evaluation (PinionOS/Bedrock)",
  "Calculating dynamic bounty",
  "Signing x402 USDC payout on Base L2",
];

const SECURITY_STEPS = [
  "Intercepting GitHub webhook",
  "⚠️ Critical infrastructure change detected",
  "Hiring Security Oracle ($1.00 USDC M2M)",
  "Running dual AI + security evaluation",
  "Calculating dynamic bounty",
  "Signing x402 USDC payout on Base L2",
];

const EARN_STEPS = [
  "x402 paywall triggered — enterprise client detected",
  "Charging client via PinionOS x402 protocol",
  "Receiving USDC payment into treasury",
  "Parsing Solidity contract for audit",
  "Running AI security analysis (Bedrock)",
  "Generating audit report",
];

function parseDiffLines(diff: string): { text: string; type: string }[] {
  return diff.split("\n").slice(0, 40).map(line => {
    if (line.startsWith("@@")) return { text: line, type: "header" };
    if (line.startsWith("+") && !line.startsWith("+++")) return { text: line, type: "add" };
    if (line.startsWith("-") && !line.startsWith("---")) return { text: line, type: "remove" };
    return { text: line, type: "neutral" };
  });
}

// Animated counter hook
function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const diff = target - from;
    if (Math.abs(diff) < 0.01) { setDisplay(target); prev.current = target; return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out
      setDisplay(from + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return display;
}

export default function Home() {
  const [evals, setEvals] = useState<EvalData[]>([]);
  const [audits, setAudits] = useState<AuditData[]>([]);
  const [stats, setStats] = useState<Stats>({ totalEvaluated: 0, passed: 0, failed: 0, passRate: "0", totalPaidUSDC: "0.00", averageScore: "0" });
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [treasury, setTreasury] = useState<Treasury>({ monthlyBudget: 500, totalEarned: 0, auditCount: 0, totalSpent: 0, bountyCount: 0, netBalance: 500, maxPerPR: 50, epoch: "Feb 2026", securityAuditSpend: 0 });
  const [detectedPRs, setDetectedPRs] = useState<{ id: string; time: number; author: string; title: string; repo: string; status: "scanning" | "evaluating" | "paid" | "rejected" }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [procMode, setProcMode] = useState<"earn" | "spend" | "security">("spend");
  const [step, setStep] = useState(-1);
  const [mainTab, setMainTab] = useState<"bounties" | "audits" | "leaderboard">("bounties");
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [autoDemo, setAutoDemo] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  // Initialize timeline on client only to avoid hydration mismatch
  useEffect(() => {
    setTimeline([
      { id: "sys-1", time: Date.now() - 60000, type: "system", text: "RepoAngel v2.0 — Robinhood Protocol initialized" },
      { id: "sys-2", time: Date.now() - 30000, type: "system", text: "Dual-economy mode: x402 Server (earner) + Client (spender)" },
      { id: "sys-3", time: Date.now() - 10000, type: "system", text: "Base L2 connected · PinionOS 7 skills · Bedrock ready" },
    ]);
  }, []);

  // Animated treasury values
  const animEarned = useAnimatedNumber(treasury.totalEarned);
  const animSpent = useAnimatedNumber(treasury.totalSpent);
  const animBalance = useAnimatedNumber(treasury.netBalance);
  const animAuditSpend = useAnimatedNumber(treasury.securityAuditSpend);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, stRes] = await Promise.all([fetch("/api/evaluations"), fetch("/api/status")]);
      const evData = await evRes.json();
      const stData = await stRes.json();
      if (evData.success) {
        setEvals(evData.evaluations); setStats(evData.stats);
        if (evData.treasury) setTreasury(evData.treasury);
        if (evData.enterpriseAudits) setAudits(evData.enterpriseAudits);
      }
      if (stData.success) setAgent(stData.agent);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, [fetchData]);

  // ── ENTERPRISE AUDIT (Earn) ──
  const simulateAudit = async (contractId?: string) => {
    setProcessing(true);
    setProcMode("earn");
    setTimeline(t => [{ id: `tl-${Date.now()}`, time: Date.now(), type: "earn", text: "💰 Enterprise client requesting paid code audit via x402 paywall" }, ...t]);
    for (let i = 0; i < EARN_STEPS.length; i++) { setStep(i); await new Promise(r => setTimeout(r, 800)); }
    try {
      const res = await fetch("/api/enterprise-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId }) });
      const d = await res.json();
      if (d.success) {
        await fetchData();
        setTimeline(t => [{
          id: `tl-${Date.now()}`, time: Date.now(), type: "earn",
          text: `💰 +$${d.amountCharged} USDC earned — ${d.audit.client} (${d.audit.contractName}) audited [${d.audit.verdict}]`
        }, ...t]);
      }
    } catch (e) { console.error(e); }
    setProcessing(false);
    setStep(-1);
  };

  // ── OSS BOUNTY (Spend) ──
  const simulateBounty = async (id?: string) => {
    const prId = id || MOCK_PRS[Math.floor(Math.random() * MOCK_PRS.length)].id;
    const pr = MOCK_PRS.find(p => p.id === prId);
    const isHR = pr?.id === "pr-5";

    // Add to detected PRs feed
    const detectedId = `det-${Date.now()}`;
    setDetectedPRs(prev => [{ id: detectedId, time: Date.now(), author: pr?.author || "unknown", title: pr?.title || "PR", repo: pr?.repo || "github/repo", status: "scanning" }, ...prev.slice(0, 7)]);

    setProcessing(true);
    setProcMode(isHR ? "security" : "spend");
    setTimeline(t => [{ id: `tl-${Date.now()}`, time: Date.now(), type: isHR ? "security" : "system", text: `${isHR ? "🔒 HIGH-RISK " : "📡"} PR detected: "${pr?.title || "Random PR"}" by ${pr?.author}` }, ...t]);

    // Update status to evaluating
    await new Promise(r => setTimeout(r, 400));
    setDetectedPRs(prev => prev.map(p => p.id === detectedId ? { ...p, status: "evaluating" } : p));

    const steps = isHR ? SECURITY_STEPS : SPEND_STEPS;
    for (let i = 0; i < steps.length; i++) { setStep(i); await new Promise(r => setTimeout(r, isHR ? 1000 : 800)); }
    try {
      const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prId }) });
      const d = await res.json();
      if (d.success) {
        await fetchData();
        const ev = d.evaluation;

        // Update detected PR status
        setDetectedPRs(prev => prev.map(p => p.id === detectedId ? { ...p, status: ev.ai.verdict === "PASS" ? "paid" : "rejected" } : p));

        if (ev.securityAudit?.triggered) {
          setTimeline(t => [{ id: `tl-sec-${Date.now()}`, time: Date.now(), type: "security", text: `🔒 M2M: Security Oracle hired — $${ev.securityAudit.cost} USDC via x402` }, ...t]);
        }

        const txHash = ev.payout.txHash;
        const txLink = txHash ? ` <a href="https://sepolia.basescan.org/tx/${txHash}" target="_blank" style="color:#22c55e;text-decoration:none">View TX ↗</a>` : "";

        setTimeline(t => [{
          id: `tl-${Date.now()}`, time: Date.now(),
          type: ev.ai.verdict === "PASS" ? "pass" : "fail",
          text: `${ev.ai.verdict === "PASS" ? "💸" : "❌"} -$${ev.payout.amount} — ${ev.pr.title} (${ev.ai.score}/100)${txLink}`
        }, ...t]);

        // Trigger confetti on successful on-chain payment
        if (ev.ai.verdict === "PASS" && txHash) {
          setLastTxHash(txHash);
          setShowConfetti(true);
          setConfettiKey(k => k + 1);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
    } catch (e) { console.error(e); }
    setProcessing(false);
    setStep(-1);
  };

  // ── AUTO DEMO (The Killer Flow) ──
  const runAutoDemo = async () => {
    setAutoDemo(true);
    setTimeline(t => [{ id: `tl-demo-${Date.now()}`, time: Date.now(), type: "system", text: "🎬 AUTO DEMO — Running full Robinhood Protocol sequence" }, ...t]);

    // 1. Enterprise audit (EARN $10)
    await simulateAudit("ent-1");
    await new Promise(r => setTimeout(r, 1000));

    // 2. Typo fix bounty (SPEND $1)
    await simulateBounty("pr-6");
    await new Promise(r => setTimeout(r, 1000));

    // 3. Another audit (EARN $15)
    await simulateAudit("ent-2");
    await new Promise(r => setTimeout(r, 1000));

    // 4. Auth refactor bounty with M2M security (SPEND $45)
    await simulateBounty("pr-5");
    await new Promise(r => setTimeout(r, 1000));

    // 5. Third audit (EARN $8)
    await simulateAudit("ent-3");

    setTimeline(t => [{ id: `tl-done-${Date.now()}`, time: Date.now(), type: "system", text: "🎬 AUTO DEMO complete — Self-sustaining economy demonstrated" }, ...t]);
    setAutoDemo(false);
  };

  const fmtTime = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtShort = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
  const toggleDiff = (id: string) => { setExpandedDiffs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const leaderboard = useMemo(() => {
    const map = new Map<string, { author: string; repo: string; prs: number; totalEarned: number; avgScore: number; scores: number[] }>();
    evals.forEach(ev => {
      const k = ev.pr.author;
      const e = map.get(k) || { author: k, repo: ev.pr.repo, prs: 0, totalEarned: 0, avgScore: 0, scores: [] };
      e.prs++; e.totalEarned += parseFloat(ev.payout.amount) || 0; e.scores.push(ev.ai.score);
      e.avgScore = Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length);
      map.set(k, e);
    });
    return Array.from(map.values()).sort((a, b) => b.totalEarned - a.totalEarned);
  }, [evals]);

  const findDiff = (title: string) => MOCK_PRS.find(p => p.title === title)?.diff || "";

  const procSteps = procMode === "earn" ? EARN_STEPS : procMode === "security" ? SECURITY_STEPS : SPEND_STEPS;
  const procTitle = procMode === "earn" ? "💰 Enterprise Audit — x402 Server" : procMode === "security" ? "🔒 High-Risk PR — M2M Audit" : "💸 OSS Bounty — x402 Client";
  const procSub = procMode === "earn" ? "Receiving payment and auditing smart contract" : procMode === "security" ? "Dual evaluation: Security Oracle + AI pipeline" : "Evaluating code and pricing developer bounty";

  return (
    <div className="shell">
      {/* ── CONFETTI OVERLAY ── */}
      {showConfetti && (
        <div key={confettiKey} className="confetti-container" aria-hidden>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              '--x': `${Math.random() * 100}vw`,
              '--delay': `${Math.random() * 0.5}s`,
              '--drift': `${(Math.random() - 0.5) * 200}px`,
              '--fall': `${600 + Math.random() * 400}px`,
              '--spin': `${Math.random() * 720 - 360}deg`,
              '--size': `${6 + Math.random() * 6}px`,
              '--color': ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 7)],
            } as React.CSSProperties} />
          ))}
          {lastTxHash && (
            <div className="confetti-banner">
              <div className="confetti-banner-icon">✅</div>
              <div className="confetti-banner-text">Payment Confirmed On-Chain!</div>
              <a href={`https://sepolia.basescan.org/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" className="confetti-banner-link">
                View Transaction on BaseScan ↗
              </a>
            </div>
          )}
        </div>
      )}
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">😇</div>
          <div>
            <div className="brand-name">RepoAngel</div>
            <div className="brand-tag">v2.0 · Robinhood Protocol</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Dual Economy</div>
          <div className="sidebar-item active">
            <span className="sidebar-item-icon">💰</span>Earn (x402 Server)
            <span className="sidebar-badge" style={{ background: "var(--green-dim)", color: "var(--green)" }}>{treasury.auditCount}</span>
          </div>
          <div className="sidebar-item active">
            <span className="sidebar-item-icon">💸</span>Spend (x402 Client)
            <span className="sidebar-badge" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{treasury.bountyCount}</span>
          </div>
        </div>

        <div className="sidebar-wallet">
          <div style={{ fontSize: "10px", color: "var(--text-2)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Agent Wallet</div>
          <div className="wallet-addr">{agent?.walletAddress ? `${agent.walletAddress.slice(0, 6)}…${agent.walletAddress.slice(-4)}` : "Loading..."}</div>
          {agent?.balance ? (
            <>
              <div className="wallet-row"><span className="wallet-label">ETH</span><span className="wallet-val">{agent.balance.ETH}</span></div>
              <div className="wallet-row"><span className="wallet-label">USDC</span><span className="wallet-val">{agent.balance.USDC}</span></div>
            </>
          ) : (
            <>
              <div className="wallet-row"><span className="wallet-label">USDC</span><span className="wallet-val" style={{ color: "var(--green)" }}>${animBalance.toFixed(2)}</span></div>
              <div className="wallet-row"><span className="wallet-label">Network</span><span className="wallet-val">Base L2</span></div>
            </>
          )}
        </div>
        <div className="powered-by">Powered by <strong>PinionOS</strong> + <strong>Bedrock</strong></div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        {/* PROCESSING OVERLAY */}
        {processing && (
          <div className="process-overlay">
            <div className="process-card">
              <div className="process-spinner" />
              <div className="process-title">{procTitle}</div>
              <div className="process-sub">{procSub}</div>
              <div className="process-steps">
                {procSteps.map((s, i) => (
                  <div key={i} className={`process-step ${i < step ? "done" : i === step ? "active" : ""}`}>
                    <span className="step-icon">{i < step ? "✓" : i === step ? "›" : "·"}</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Mission Control</span>
            <div className="topbar-divider" />
            <div className="status-indicator">
              <div className="status-dot" />
              {agent?.status === "online" ? "System Online" : "Connecting..."}
            </div>
          </div>
          <div className="topbar-right">
            {agent?.ethPrice?.priceUSD && <span>ETH ${Number(agent.ethPrice.priceUSD).toLocaleString()}</span>}
            <span>Network: Base L2</span>
            <div style={{ position: "relative" }}>
              <button onClick={() => setScenarioOpen(!scenarioOpen)} disabled={processing || autoDemo}
                style={{ background: "var(--bg-2)", border: "1px solid var(--border-default)", color: autoDemo ? "var(--amber)" : "var(--text-1)", padding: "5px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: "6px" }}>
                {autoDemo ? "◉ Running…" : "▶ Scenario"}
              </button>
              {scenarioOpen && !processing && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--bg-1)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "6px", minWidth: "240px", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-2)", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Playbook</div>
                  <button onClick={() => { setScenarioOpen(false); runAutoDemo(); }}
                    style={{ width: "100%", background: "none", border: "none", color: "var(--text-1)", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    <div style={{ fontWeight: 600 }}>Full Cycle</div>
                    <div style={{ fontSize: "10px", color: "var(--text-2)", marginTop: "2px" }}>Earn → Pay → Audit → Pay → Earn</div>
                  </button>
                  <button onClick={() => { setScenarioOpen(false); simulateAudit(); }}
                    style={{ width: "100%", background: "none", border: "none", color: "var(--text-1)", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    <div style={{ fontWeight: 600, color: "var(--green)" }}>Enterprise Audit</div>
                    <div style={{ fontSize: "10px", color: "var(--text-2)", marginTop: "2px" }}>x402 paywall → audit → revenue</div>
                  </button>
                  <button onClick={() => { setScenarioOpen(false); simulateBounty("pr-5"); }}
                    style={{ width: "100%", background: "none", border: "none", color: "var(--text-1)", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    <div style={{ fontWeight: 600, color: "var(--red)" }}>High-Risk PR + M2M</div>
                    <div style={{ fontSize: "10px", color: "var(--text-2)", marginTop: "2px" }}>Security oracle subcontract</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TREASURY — DUAL ECONOMY */}
        <div className="stats-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="stat-cell">
            <span className="stat-label">💰 Revenue Earned</span>
            <span className="stat-value color-green">${animEarned.toFixed(2)}</span>
            <span className="stat-sub">{treasury.auditCount} audits</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">💸 Bounties Paid</span>
            <span className="stat-value color-accent">${animSpent.toFixed(2)}</span>
            <span className="stat-sub">{treasury.bountyCount} payouts</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">🏦 Net Treasury</span>
            <span className="stat-value" style={{ color: animBalance >= 500 ? "var(--green)" : animBalance > 100 ? "var(--amber)" : "var(--red)" }}>
              ${animBalance.toFixed(2)}
            </span>
            <span className="stat-sub">base: ${treasury.monthlyBudget} + earned − spent</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content">
          <div className="content-main">



            {/* ── DUAL SIMULATION PANELS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              {/* EARN SIDE */}
              <div style={{ background: "var(--bg-1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", padding: "16px" }}>
                <div className="section-header" style={{ marginBottom: "10px" }}>
                  <span className="section-title"><span className="section-icon">💰</span> Enterprise Audit (Earn)</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "10px", lineHeight: 1.5 }}>
                  Web3 startup pays RepoAngel via x402 paywall for smart contract security audit. Revenue funds OSS bounties.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                  {[
                    { id: "ent-1", name: "VaultStrategy.sol", client: "DeFiVault Labs", price: "$10.00" },
                    { id: "ent-2", name: "CrossChainRelay.sol", client: "ChainBridge Inc", price: "$15.00" },
                    { id: "ent-3", name: "RoyaltyDistributor.sol", client: "NFTMarket DAO", price: "$8.00" },
                  ].map(c => (
                    <button key={c.id} className="btn" onClick={() => simulateAudit(c.id)} disabled={processing}
                      style={{ textAlign: "left", padding: "8px 10px", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                      <span><strong style={{ color: "var(--green)" }}>{c.client}</strong> — {c.name}</span>
                      <span style={{ color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700 }}>{c.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SPEND SIDE — AUTONOMOUS GITHUB MONITOR */}
              <div style={{ background: "var(--bg-1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "8px", padding: "16px" }}>
                <div className="section-header" style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="section-title"><span className="section-icon">📡</span> GitHub Monitor (Autonomous)</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", fontFamily: "var(--mono)", color: "var(--green)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
                    Scanning
                  </span>
                </div>

                {/* Watched repos */}
                <div style={{ fontSize: "10px", color: "var(--text-2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Watched Repositories</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  {[
                    { name: "ethereum/solidity", lang: "Solidity", color: "var(--violet)" },
                    { name: "openai/openai-node", lang: "TypeScript", color: "var(--accent)" },
                    { name: "vercel/next.js", lang: "JavaScript", color: "var(--amber)" },
                    { name: "base-org/contracts", lang: "Solidity", color: "var(--green)" },
                  ].map(r => (
                    <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "var(--bg-2)", borderRadius: "4px", fontSize: "11px" }}>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--text-1)" }}>{r.name}</span>
                      <span style={{ fontSize: "9px", color: r.color, fontFamily: "var(--mono)" }}>{r.lang}</span>
                    </div>
                  ))}
                </div>

                {/* Detected PRs feed */}
                <div style={{ fontSize: "10px", color: "var(--text-2)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detected PRs</div>
                {detectedPRs.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "var(--text-2)", padding: "12px 0", textAlign: "center", fontStyle: "italic" }}>Waiting for merged PRs…</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
                    {detectedPRs.map(pr => (
                      <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "var(--bg-2)", borderRadius: "4px", fontSize: "10px", borderLeft: `2px solid ${pr.status === "paid" ? "var(--green)" : pr.status === "rejected" ? "var(--red)" : pr.status === "evaluating" ? "var(--accent)" : "var(--text-2)"}` }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: "var(--mono)", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pr.title}</div>
                          <div style={{ color: "var(--text-2)", fontSize: "9px" }}>{pr.author} · {pr.repo}</div>
                        </div>
                        <span style={{ fontSize: "9px", fontFamily: "var(--mono)", fontWeight: 600, marginLeft: "8px", flexShrink: 0, color: pr.status === "paid" ? "var(--green)" : pr.status === "rejected" ? "var(--red)" : pr.status === "evaluating" ? "var(--accent)" : "var(--text-2)" }}>
                          {pr.status === "scanning" ? "⏳ Scanning" : pr.status === "evaluating" ? "🔍 Evaluating" : pr.status === "paid" ? "✅ Paid" : "❌ Rejected"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TABS */}
            <div className="tabs">
              <button className={`tab ${mainTab === "bounties" ? "active" : ""}`} onClick={() => setMainTab("bounties")}>💸 Bounties ({evals.length})</button>
              <button className={`tab ${mainTab === "audits" ? "active" : ""}`} onClick={() => setMainTab("audits")}>💰 Audits ({audits.length})</button>
              <button className={`tab ${mainTab === "leaderboard" ? "active" : ""}`} onClick={() => setMainTab("leaderboard")}>🏆 Leaderboard</button>
            </div>

            {/* ── TAB: BOUNTIES ── */}
            {mainTab === "bounties" && (
              <>
                {evals.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">💸</div><div className="empty-text">No bounties yet</div><div className="empty-sub">Evaluate a PR to pay an OSS developer</div></div>
                ) : (
                  <div className="eval-list">
                    {evals.map(ev => {
                      const diff = findDiff(ev.pr.title);
                      const expanded = expandedDiffs.has(ev.id);
                      const hasAudit = ev.securityAudit?.triggered;
                      return (
                        <div key={ev.id} className="eval-item" style={hasAudit ? { borderColor: "rgba(239,68,68,0.3)" } : undefined}>
                          <div className="eval-item-header">
                            <div className="eval-item-left">
                              <div className="eval-item-title">{hasAudit && <span style={{ color: "var(--red)", marginRight: "4px" }}>🔒</span>}{ev.pr.title}</div>
                              <div className="eval-item-meta">{fmtTime(ev.timestamp)} · {ev.pr.author} · +{ev.pr.additions} -{ev.pr.deletions}</div>
                            </div>
                            <div className={`verdict-chip ${ev.ai.verdict === "PASS" ? "verdict-pass" : "verdict-fail"}`}>{ev.ai.verdict} · {ev.ai.score}/100</div>
                          </div>
                          <div className="eval-item-body">
                            {hasAudit && (
                              <div className="notice-box" style={{ background: "var(--red-dim)", borderColor: "rgba(239,68,68,0.2)", color: "var(--red)", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                                <span>🔒 Security Oracle Agent contracted — M2M x402</span>
                                <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>-${ev.securityAudit!.cost} USDC</span>
                              </div>
                            )}
                            <div className="score-bar-track"><div className={`score-bar-fill ${ev.ai.verdict === "PASS" ? "pass" : "fail"}`} style={{ width: `${ev.ai.score}%` }} /></div>
                            <div className="eval-reasoning" style={{ marginTop: "8px" }}>{ev.ai.reasoning}</div>
                            {(ev.ai.highlights.length > 0 || ev.ai.concerns.length > 0) && (
                              <div className="tag-list">
                                {ev.ai.highlights.map((h, i) => <span key={`h-${i}`} className="tag tag-highlight">✓ {h}</span>)}
                                {ev.ai.concerns.map((c, i) => <span key={`c-${i}`} className="tag tag-concern">⚠ {c}</span>)}
                              </div>
                            )}
                            {diff && (
                              <>
                                <button className="diff-toggle" onClick={() => toggleDiff(ev.id)}>{expanded ? "▾ Hide diff" : "▸ View diff"}</button>
                                {expanded && <div className="diff-viewer">{parseDiffLines(diff).map((l, i) => <div key={i} className={`diff-line ${l.type}`}>{l.text}</div>)}</div>}
                              </>
                            )}
                            <div className="eval-payout" style={{ marginTop: "8px" }}>
                              <span className={`payout-amount ${ev.ai.verdict === "PASS" ? "paid" : "rejected"}`}>
                                {ev.ai.verdict === "PASS" ? `💸 -$${ev.payout.amount} USDC` : "$0.00 Rejected"}
                                {ev.payout.status === "queued" && <span style={{ color: "var(--amber)", fontSize: "10px", marginLeft: "6px" }}>(queued)</span>}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="payout-hash">to: {ev.payout.toAddress ? `${ev.payout.toAddress.slice(0, 6)}…${ev.payout.toAddress.slice(-4)}` : "—"}</span>
                              </span>
                            </div>
                            {ev.payout.txHash && (
                              <a href={`https://sepolia.basescan.org/tx/${ev.payout.txHash}`} target="_blank" rel="noopener noreferrer"
                                className="basescan-link">
                                <span style={{ fontSize: "14px" }}>🔗</span>
                                <span>Verified on BaseScan</span>
                                <span className="basescan-hash">{ev.payout.txHash.slice(0, 10)}…{ev.payout.txHash.slice(-6)}</span>
                                <span className="basescan-arrow">↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── TAB: ENTERPRISE AUDITS ── */}
            {mainTab === "audits" && (
              <>
                {audits.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">💰</div><div className="empty-text">No enterprise audits yet</div><div className="empty-sub">Simulate an enterprise client to earn revenue</div></div>
                ) : (
                  <div className="eval-list">
                    {audits.map(a => (
                      <div key={a.id} className="eval-item" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
                        <div className="eval-item-header">
                          <div className="eval-item-left">
                            <div className="eval-item-title" style={{ color: "var(--green)" }}>💰 {a.client}</div>
                            <div className="eval-item-meta">{fmtTime(a.timestamp)} · {a.contractName} · {a.linesOfCode} LOC</div>
                          </div>
                          <div className={`verdict-chip ${a.verdict === "SECURE" ? "verdict-pass" : "verdict-fail"}`}>{a.verdict}</div>
                        </div>
                        <div className="eval-item-body">
                          <div className="notice-box" style={{ background: "var(--green-dim)", borderColor: "rgba(34,197,94,0.15)", color: "var(--green)", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                            <span>x402 paywall — enterprise payment received</span>
                            <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>+${a.amountCharged} USDC</span>
                          </div>
                          <div className="eval-reasoning">{a.summary}</div>
                          <div className="tag-list">
                            {a.findings.map((f, i) => (
                              <span key={i} className={`tag ${f.startsWith("✅") ? "tag-highlight" : f.startsWith("⚠") ? "tag-concern" : "tag-highlight"}`}>{f}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB: LEADERBOARD ── */}
            {mainTab === "leaderboard" && (
              <>
                {leaderboard.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🏆</div><div className="empty-text">No contributors yet</div><div className="empty-sub">Run bounty evaluations to populate the leaderboard</div></div>
                ) : (
                  <table className="leaderboard">
                    <thead><tr><th>#</th><th>Contributor</th><th>PRs</th><th>Avg Score</th><th>Earned</th></tr></thead>
                    <tbody>
                      {leaderboard.map((entry, i) => (
                        <tr key={entry.author}>
                          <td className={`lb-rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </td>
                          <td><div className="lb-author"><div className="lb-avatar">{entry.author[0].toUpperCase()}</div><div><div className="lb-name">{entry.author}</div><div className="lb-repo">{entry.repo}</div></div></div></td>
                          <td>{entry.prs}</td>
                          <td className="lb-score">{entry.avgScore}</td>
                          <td className="lb-earned">${entry.totalEarned.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="content-side">
            <div className="info-card">
              <div className="info-card-title">Live Activity</div>
              <div className="timeline">
                {timeline.slice(0, 12).map(ev => (
                  <div key={ev.id} className="tl-item">
                    <div className={`tl-dot tl-${ev.type}`} />
                    <div className="tl-content">
                      <div className="tl-text" dangerouslySetInnerHTML={{ __html: ev.text }} />
                      <div className="tl-time">{fmtShort(ev.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-title">The Robinhood Protocol</div>
              <div style={{ fontSize: "12px", color: "var(--text-1)", lineHeight: 1.7 }}>
                <p style={{ marginBottom: "8px" }}><strong style={{ color: "var(--green)" }}>EARN:</strong> Enterprise clients pay via x402 paywall for smart contract audits</p>
                <p style={{ marginBottom: "8px" }}><strong style={{ color: "var(--accent)" }}>SPEND:</strong> Revenue funds public OSS developer bounties autonomously</p>
                <p><strong style={{ color: "var(--violet)" }}>M2M:</strong> Agent hires Security Oracle for high-risk PRs via x402</p>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
