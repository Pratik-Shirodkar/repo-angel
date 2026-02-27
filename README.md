# 😇 RepoAngel — Autonomous Open-Source Sponsor

> **AI that autonomously evaluates and pays developers for quality open-source contributions.**

RepoAngel is an autonomous agent powered by [PinionOS](https://github.com/chu2bard/pinion-os) that watches for GitHub Pull Request merges, evaluates the code quality using AI, and instantly sends USDC micro-grants to contributors on Base via x402 micropayments.

No human middleman. No grant applications. Just merge good code and get paid.

---

## 🏗️ Architecture

```
GitHub PR Merge / Simulate Button
        ↓
  /api/evaluate (Next.js API route)
        ↓
  AI Code Evaluation (PinionOS skills.chat)
        ↓
  Quality Score (0-100)
        ↓
  Pass? → USDC Payout (PinionOS skills.send + skills.broadcast)
        ↓
  Mission Control Dashboard (live feed)
```

Three layers:
1. **The Trigger** — GitHub webhook or the "Simulate PR" button fires a PR payload
2. **The Brain** — AI evaluates code quality, security, impact, and best practices
3. **The Wallet** — PinionOS sends USDC on Base to the contributor's wallet

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/repo-angel.git
cd repo-angel

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your PINION_PRIVATE_KEY

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the Mission Control dashboard.

---

## ⚙️ Configuration

Create a `.env.local` file:

```env
# Required: Base wallet private key (needs ETH for gas + USDC for payments)
PINION_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Optional: Agent wallet address (for balance display on dashboard)
AGENT_WALLET_ADDRESS=0xYOUR_WALLET_ADDRESS

# Optional: GitHub webhook secret (for production webhook verification)
GITHUB_WEBHOOK_SECRET=your_secret
```

---

## 🎮 How to Use

### Simulation Mode (Demo)
1. Open the dashboard at `http://localhost:3000`
2. Select one of four realistic mock PRs:
   - ✅ **Rate Limiter** — Clean middleware implementation
   - ✅ **XSS Fix** — Security vulnerability patch
   - ❌ **Console.log Spam** — Contains hardcoded API key + debug logs
   - ✅ **WebSocket Pool** — Production-quality connection management
3. Click **"Evaluate Selected PR"** or **"Random PR"**
4. Watch the AI evaluate the code and (if it passes) send a USDC payout

### Production Mode (GitHub Webhook)
1. Set up a GitHub webhook pointing to `https://your-domain.com/api/webhook`
2. Set event type to `Pull requests`
3. Set the webhook secret in `.env.local`
4. Contributors add their wallet address (0x...) to the PR description
5. When a PR is merged, RepoAngel automatically evaluates and pays

---

## 🔌 PinionOS Skills Used

| Skill | Purpose |
|---|---|
| `skills.chat()` | AI code quality evaluation |
| `skills.send()` | Construct USDC transfer transactions |
| `skills.broadcast()` | Sign and broadcast transactions on Base |
| `skills.balance()` | Check agent wallet ETH/USDC balances |
| `skills.price()` | Fetch live ETH price |
| `skills.fund()` | Check wallet funding status |
| `skills.wallet()` | Generate Base wallet keypairs |

**7 out of 10** PinionOS skills deeply integrated.

---

## 🤖 AI Evaluation Criteria

RepoAngel scores PRs on four dimensions (25 points each, 100 total):

| Criteria | Weight | Description |
|---|---|---|
| **Code Quality** | 0-25 | Clean, readable, well-structured |
| **Security** | 0-25 | No hardcoded secrets, proper validation |
| **Impact** | 0-25 | Meaningful improvement to the codebase |
| **Best Practices** | 0-25 | Follows conventions, typed, error handling |

**Auto-fail rules:**
- Hardcoded API keys or secrets → Automatic FAIL
- Excessive `console.log` debugging → FAIL
- `@ts-ignore` without justification → -10 points

---

## 📁 Project Structure

```
repo-angel/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with SEO
│   │   ├── globals.css             # Cyberpunk design system
│   │   ├── page.tsx                # Mission Control dashboard
│   │   └── api/
│   │       ├── evaluate/route.ts   # Core: AI eval + USDC payout
│   │       ├── webhook/route.ts    # GitHub webhook handler
│   │       ├── evaluations/route.ts # Evaluation history + stats
│   │       └── status/route.ts     # Agent wallet status
│   └── lib/
│       ├── pinion.service.ts       # PinionOS SDK singleton
│       ├── mock-diffs.ts           # 4 realistic mock PR diffs
│       └── evaluations.ts          # In-memory evaluation store
├── .env.example                    # Environment template
├── package.json
└── README.md
```

---

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Blockchain**: Base L2 (USDC via x402)
- **AI**: PinionOS chat skill (Anthropic)
- **Styling**: Vanilla CSS (cyberpunk dark theme)
- **Font**: Outfit + JetBrains Mono

---

## 🏆 PinionOS Hackathon

Built for the first PinionOS Hackathon (Feb 22 – Mar 1, 2026).

RepoAngel demonstrates PinionOS's core vision: **agents that control wallets, AI that makes payments, software that earns on its own.**

- 🐦 [@PinionOS](https://twitter.com/PinionOS)
- 📦 [pinion-os on npm](https://www.npmjs.com/package/pinion-os)
- 🔗 [PinionOS GitHub](https://github.com/chu2bard/pinion-os)

---

## 📄 License

MIT
