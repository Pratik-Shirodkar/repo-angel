import { NextRequest, NextResponse } from "next/server";
import { chat, sendFunds, broadcast } from "@/lib/pinion.service";
import { addEvaluation, Evaluation } from "@/lib/evaluations";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

function verifyGitHubSignature(
    payload: string,
    signature: string | null
): boolean {
    if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET; // Skip if no secret configured
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    hmac.update(payload);
    const expected = `sha256=${hmac.digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// POST /api/webhook — Handle real GitHub webhook events
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-hub-signature-256");
        const event = req.headers.get("x-github-event");

        // Verify webhook signature
        if (!verifyGitHubSignature(rawBody, signature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Only process PR merge events
        if (event !== "pull_request") {
            return NextResponse.json({ message: "Event ignored", event });
        }

        const payload = JSON.parse(rawBody);

        // Only process merged PRs
        if (payload.action !== "closed" || !payload.pull_request?.merged) {
            return NextResponse.json({ message: "Not a merged PR" });
        }

        const pr = payload.pull_request;

        // Extract wallet address from PR body (look for 0x... pattern)
        const walletMatch = pr.body?.match(/0x[a-fA-F0-9]{40}/);
        const walletAddress = walletMatch
            ? walletMatch[0]
            : null;

        if (!walletAddress) {
            return NextResponse.json({
                message: "No wallet address found in PR description. Skipping payout.",
                tip: "Add your wallet address (0x...) to the PR description to receive rewards.",
            });
        }

        // Get the diff
        const diffUrl = pr.diff_url;
        let diff = "";
        try {
            const diffResponse = await fetch(diffUrl);
            diff = await diffResponse.text();
            // Truncate very long diffs
            if (diff.length > 5000) {
                diff = diff.substring(0, 5000) + "\n... [truncated]";
            }
        } catch {
            diff = `[Could not fetch diff. PR: ${pr.title}]`;
        }

        // Evaluate with AI
        const SYSTEM_PROMPT = `You are RepoAngel, an autonomous AI code evaluator. Evaluate this merged PR and respond in JSON: {"verdict":"PASS"|"FAIL","score":0-100,"reasoning":"...","highlights":[],"concerns":[],"suggestedPayout":"5.00"}`;

        let aiResult: Evaluation["ai"];
        let payoutAmount = "0";

        try {
            const response = await chat(
                `${SYSTEM_PROMPT}\n\nPR: ${pr.title}\nAuthor: ${pr.user?.login}\nRepo: ${pr.base?.repo?.full_name}\nDiff:\n${diff}`
            );

            const responseText =
                typeof response === "string"
                    ? response
                    : response?.data?.response || JSON.stringify(response);

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                aiResult = {
                    verdict: parsed.verdict === "PASS" ? "PASS" : "FAIL",
                    score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
                    reasoning: parsed.reasoning || "Evaluation complete.",
                    highlights: parsed.highlights || [],
                    concerns: parsed.concerns || [],
                };
                payoutAmount = parsed.suggestedPayout || "0";
            } else {
                throw new Error("Could not parse AI response");
            }
        } catch {
            aiResult = {
                verdict: "PASS",
                score: 70,
                reasoning: "AI evaluation unavailable. Default approval for merged PR.",
                highlights: ["Merged PR"],
                concerns: ["Manual review recommended"],
            };
            payoutAmount = "2.00";
        }

        // Execute payout
        let txHash: string | null = null;
        let payoutStatus: Evaluation["payout"]["status"] = "skipped";

        if (aiResult.verdict === "PASS" && parseFloat(payoutAmount) > 0) {
            payoutStatus = "pending";
            try {
                console.log(`💸 Webhook: Sending REAL $${payoutAmount} USDC to ${walletAddress}`);
                const sendResult = await sendFunds(walletAddress, payoutAmount, "USDC");
                if (sendResult?.data?.tx) {
                    const broadcastResult = await broadcast(sendResult.data.tx);
                    txHash = broadcastResult?.data?.txHash || null;
                    payoutStatus = txHash ? "sent" : "failed";
                    if (txHash) console.log(`✅ Webhook TX: https://sepolia.basescan.org/tx/${txHash}`);
                }
            } catch (e) {
                console.log("Webhook payout failed:", e);
                payoutStatus = "failed";
            }
        }

        const evaluation: Evaluation = {
            id: `eval-${Date.now()}`,
            timestamp: Date.now(),
            pr: {
                title: pr.title,
                author: pr.user?.login || "unknown",
                repo: pr.base?.repo?.full_name || "unknown",
                filesChanged: pr.changed_files || 0,
                additions: pr.additions || 0,
                deletions: pr.deletions || 0,
            },
            ai: aiResult,
            payout: {
                amount: payoutAmount,
                token: "USDC",
                toAddress: walletAddress,
                txHash,
                status: payoutStatus,
            },
            source: "webhook",
        };

        addEvaluation(evaluation);

        return NextResponse.json({ success: true, evaluation });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
