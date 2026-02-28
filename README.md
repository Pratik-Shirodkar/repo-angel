# 😇 RepoAngel — Autonomous Open-Source Sponsor

> **AI that autonomously evaluates and pays developers for quality open-source contributions — and earns revenue by selling enterprise security audits.**

RepoAngel is an autonomous agent powered by [PinionOS](https://github.com/chu2bard/pinion-os) on Base L2. It runs a **self-sustaining economic loop**: it **spends USDC** to reward developers for quality PRs, and **earns USDC** by selling AI-powered smart contract security audits to Web3 companies via x402 micropayments.

No human middleman. No grant applications. Merge good code → get paid.

---

## 🏗️ Architecture

```
                ┌──────────────────────────────────────────────┐
                │              RepoAngel Agent                 │
                │                                              │
  GitHub PR ──▶ │  /api/evaluate ──▶ AI Code Eval ──▶ USDC Pay │ ◀── SPEND
                │                                              │
  Web3 Co.  ──▶ │  /api/enterprise-audit ──▶ AI Audit ──▶ $$$  │ ◀── EARN
                │                                              │
                │  /api/status    ──▶ Wallet + Telemetry       │
                │  /api/webhook   ──▶ GitHub Webhook Listener  │
                │  Dashboard      ──▶ Mission Control UI       │
                └──────────────────────────────────────────────┘
                          ↕ x402 Micropayments ↕
                     ┌──────────────────────────┐
                     │  Base L2 · USDC · EIP-3009│
                     └──────────────────────────┘
```

### The Economic Loop

1. **SPEND** — GitHub PR merged → AI evaluates code → dynamically prices the contribution ($0.50–$50) → sends USDC to contributor
2. **EARN** — Web3 companies request smart contract audits → pay $8–$15 USDC via x402 → AI analyzes Solidity code → returns security report
3. **TREASURY** — Tracks budget, spending, revenue, and net balance across epochs

---

## 🚀 Quick Start

```bash
git clone https://github.com/Pratik-Shirodkar/repo-angel.git
cd repo-angel

npm install

cp .env.example .env.local
# Edit .env.local with your keys

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Landing page  
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) → Mission Control

---

## ⚙️ Configuration

Create a `.env.local` file:

```env
# Required: Base wallet private key (needs ETH for gas + USDC for payments)
PINION_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Agent wallet address (for dashboard display)
AGENT_WALLET_ADDRESS=0xYOUR_WALLET_ADDRESS

# AWS Bedrock (AI fallback when PinionOS chat is unavailable)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Optional: GitHub webhook secret
GITHUB_WEBHOOK_SECRET=your_secret
```

---

## 🎮 Features

### 1. OSS Bounty System (Spend)
- Select from 4 realistic mock PRs or trigger via GitHub webhook
- AI evaluates code quality, security, impact, and best practices (0-100 score)
- **Dynamic pricing**: AI calculates payout based on complexity × impact × quality ($0.50–$50)
- USDC sent directly to contributor's wallet on Base Sepolia
- Auto-fail on hardcoded secrets, console.log spam, unjustified `@ts-ignore`

### 2. Enterprise Security Audits (Earn)
- 3 pre-built Solidity contracts (VaultStrategy, CrossChainRelay, RoyaltyDistributor)
- AI analyzes for reentrancy, access control, integer overflow, unchecked calls
- Clients pay $8–$15 USDC via x402 → revenue flows into agent treasury
- Returns verdict (SECURE / ISSUES_FOUND / CRITICAL) with detailed findings

### 3. Auto-Demo Mode
- One-click automated sequence: Earn (audit) → Spend (bounty) → repeat
- Shows the full economic loop in action with live timeline updates
- Animated progress indicators for each step

### 4. Mission Control Dashboard
- Live agent wallet balance (ETH + USDC)
- Treasury tracker: monthly budget, total earned, total spent, net balance
- Evaluation history with expandable diff viewer
- Real-time activity timeline
- Animated counters and visual feedback

---

## 🔌 PinionOS Skills Used

| Skill | Purpose | Cost |
|---|---|---|
| `chat()` | AI code quality evaluation | $0.01 |
| `send()` | Construct USDC transfer transactions | $0.01 |
| `broadcast()` | Sign and broadcast on Base | $0.01 |
| `balance()` | Check agent wallet ETH/USDC | $0.01 |
| `price()` | Fetch live ETH price | $0.01 |
| `fund()` | Check wallet funding status | $0.01 |
| `wallet()` | Generate Base wallet keypairs | $0.01 |

**7 out of 10** PinionOS skills deeply integrated. AWS Bedrock used as AI fallback.

---

## 🤖 AI Evaluation Criteria

| Criteria | Weight | Description |
|---|---|---|
| **Code Quality** | 0-25 | Clean, readable, well-structured |
| **Security** | 0-25 | No hardcoded secrets, proper validation |
| **Impact** | 0-25 | Meaningful improvement to codebase |
| **Best Practices** | 0-25 | Follows conventions, typed, error handling |

**Dynamic Pricing Tiers:**
| Contribution Type | Payout Range |
|---|---|
| Typo / comment fix | $0.50 – $2.00 |
| Bug fix / config change | $2.00 – $8.00 |
| New endpoint / utility | $8.00 – $20.00 |
| New module / refactor | $20.00 – $35.00 |
| Critical security fix | $35.00 – $50.00 |

---

## 📁 Project Structure

```
repo-angel/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with SEO
│   │   ├── globals.css                 # Cyberpunk design system
│   │   ├── page.tsx                    # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Mission Control dashboard
│   │   └── api/
│   │       ├── evaluate/route.ts       # Core: AI eval + USDC payout
│   │       ├── enterprise-audit/route.ts # Enterprise audit (earn revenue)
│   │       ├── webhook/route.ts        # GitHub webhook handler
│   │       ├── evaluations/route.ts    # Evaluation history + stats
│   │       ├── status/route.ts         # Agent wallet status
│   │       └── test-send/route.ts      # Direct USDC transfer test
│   └── lib/
│       ├── pinion.service.ts           # PinionOS SDK singleton
│       ├── bedrock.service.ts          # AWS Bedrock AI fallback
│       ├── sepolia-transfer.ts         # Direct USDC transfers on Sepolia
│       ├── mock-diffs.ts               # 4 realistic mock PR diffs
│       └── evaluations.ts              # In-memory evaluation + treasury store
├── .env.example
├── package.json
└── README.md
```

---

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Blockchain**: Base L2 Sepolia (USDC via x402 + direct EIP-3009)
- **AI**: PinionOS chat skill + AWS Bedrock (Claude) fallback
- **Styling**: Vanilla CSS (cyberpunk dark theme)
- **Fonts**: Outfit + JetBrains Mono
- **Payment**: x402 Protocol (EIP-3009 TransferWithAuthorization)

---

## 🏆 PinionOS Hackathon

Built for the first PinionOS Hackathon (Feb 22 – Mar 1, 2026).

RepoAngel demonstrates PinionOS's core vision: **agents that control wallets, AI that makes payments, and software that earns on its own** — a fully autonomous economic entity.

**What makes RepoAngel unique:**
- 🔄 **Self-sustaining economy** — earns revenue from audits, spends on bounties
- 💰 **Dynamic pricing** — AI calculates payout based on contribution quality
- 🛡️ **Enterprise audits** — real Solidity security analysis, paid via x402
- 🤖 **Dual AI** — PinionOS chat + AWS Bedrock fallback for reliability

---

## 🔗 Links

- [PinionOS SDK](https://www.npmjs.com/package/pinion-os)
- [PinionOS GitHub](https://github.com/chu2bard/pinion-os)
- [PinionOS Twitter](https://twitter.com/PinionOS)

---

## 📄 License

MIT
