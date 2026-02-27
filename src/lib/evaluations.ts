export interface Evaluation {
    id: string;
    timestamp: number;
    pr: {
        title: string;
        author: string;
        repo: string;
        filesChanged: number;
        additions: number;
        deletions: number;
    };
    ai: {
        verdict: "PASS" | "FAIL";
        score: number;
        reasoning: string;
        highlights: string[];
        concerns: string[];
    };
    payout: {
        amount: string;
        token: string;
        toAddress: string;
        txHash: string | null;
        status: "pending" | "sent" | "failed" | "skipped" | "queued";
    };
    source: "webhook" | "simulation";
    securityAudit?: {
        triggered: boolean;
        cost: string;
        oracleWallet: string;
    };
}

export interface EnterpriseAudit {
    id: string;
    timestamp: number;
    client: string;
    contractName: string;
    linesOfCode: number;
    amountCharged: string;
    verdict: "SECURE" | "ISSUES_FOUND" | "CRITICAL";
    summary: string;
    findings: string[];
    severity: "low" | "medium" | "high";
}

const evaluations: Evaluation[] = [];
const enterpriseAudits: EnterpriseAudit[] = [];

// ── Treasury Management (Dual Economy) ───────────────────────────────────
interface Treasury {
    monthlyBudget: number;
    // Income side (Enterprise Audits - x402 Server)
    totalEarned: number;
    auditCount: number;
    // Expenditure side (OSS Bounties - x402 Client)
    totalSpent: number;
    bountyCount: number;
    // Computed
    netBalance: number;
    maxPerPR: number;
    epoch: string;
    securityAuditSpend: number;
}

const treasury: Treasury = {
    monthlyBudget: 500.0,
    totalEarned: 0,
    auditCount: 0,
    totalSpent: 0,
    bountyCount: 0,
    netBalance: 500.0,
    maxPerPR: 50.0,
    epoch: "Feb 2026",
    securityAuditSpend: 0,
};

export function getTreasury(): Treasury {
    return { ...treasury };
}

// Enterprise audit earned revenue
export function addRevenue(amount: number): void {
    treasury.totalEarned += amount;
    treasury.auditCount++;
    treasury.netBalance = treasury.monthlyBudget + treasury.totalEarned - treasury.totalSpent;
}

// OSS bounty expenditure
export function deductTreasury(amount: number): void {
    treasury.totalSpent += amount;
    treasury.bountyCount++;
    treasury.netBalance = treasury.monthlyBudget + treasury.totalEarned - treasury.totalSpent;
}

export function deductSecurityAudit(amount: number): void {
    treasury.securityAuditSpend += amount;
    deductTreasury(amount);
}

export const remaining = () => treasury.netBalance;

// ── Enterprise Audits Store ──────────────────────────────────────────────
export function addEnterpriseAudit(audit: EnterpriseAudit): void {
    enterpriseAudits.unshift(audit);
    if (enterpriseAudits.length > 50) enterpriseAudits.pop();
}

export function getEnterpriseAudits(): EnterpriseAudit[] {
    return [...enterpriseAudits];
}

// ── Evaluations Store ────────────────────────────────────────────────────
export function addEvaluation(evaluation: Evaluation): void {
    evaluations.unshift(evaluation);
    if (evaluations.length > 50) evaluations.pop();
}

export function getEvaluations(): Evaluation[] {
    return [...evaluations];
}

export function getStats() {
    const total = evaluations.length;
    const passed = evaluations.filter((e) => e.ai.verdict === "PASS").length;
    const failed = total - passed;
    const totalPaid = evaluations
        .filter((e) => e.ai.verdict === "PASS")
        .reduce((sum, e) => sum + parseFloat(e.payout.amount), 0);
    const avgScore =
        total > 0
            ? evaluations.reduce((sum, e) => sum + e.ai.score, 0) / total
            : 0;

    return {
        totalEvaluated: total,
        passed,
        failed,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : "0",
        totalPaidUSDC: totalPaid.toFixed(2),
        averageScore: avgScore.toFixed(1),
    };
}
