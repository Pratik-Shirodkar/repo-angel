import { NextResponse } from "next/server";
import { sendUSDCOnSepolia, getSepoliaBalance } from "@/lib/sepolia-transfer";

// GET /api/test-send — Diagnostic endpoint for testing real USDC sends on Base Sepolia
export async function GET() {
    const walletAddress = process.env.AGENT_WALLET_ADDRESS || "";
    const testRecipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28";
    const results: Record<string, unknown> = {};

    // 1. Check balance on Base Sepolia
    try {
        const balance = await getSepoliaBalance(walletAddress);
        results.network = "base-sepolia";
        results.balance = balance;
    } catch (e) {
        results.balanceError = String(e);
    }

    // 2. Try sending 0.01 USDC on Base Sepolia
    try {
        console.log(`🧪 Test send: 0.01 USDC to ${testRecipient} on Sepolia`);
        const result = await sendUSDCOnSepolia(testRecipient, "0.01");
        results.sendResult = result;
        results.success = true;
    } catch (e) {
        results.sendError = String(e);
        results.success = false;
        if (e instanceof Error) {
            results.sendErrorMessage = e.message;
        }
    }

    return NextResponse.json(results);
}
