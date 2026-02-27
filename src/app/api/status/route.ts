import { NextResponse } from "next/server";
import { getPrice, getFunding } from "@/lib/pinion.service";
import { getSepoliaBalance } from "@/lib/sepolia-transfer";

// GET /api/status — Return agent wallet status
export async function GET() {
    try {
        const walletAddress = (process.env.AGENT_WALLET_ADDRESS || "").trim();

        let balance = null;
        let ethPrice = null;
        let funding = null;

        // Fetch balance if wallet address is configured
        if (walletAddress) {
            try {
                const sepBalance = await getSepoliaBalance(walletAddress);
                balance = sepBalance;
            } catch (e) {
                console.error("Balance fetch error:", e);
            }

            try {
                funding = await getFunding(walletAddress);
            } catch (e) {
                console.error("Funding fetch error:", e);
            }
        }

        // Fetch ETH price
        try {
            ethPrice = await getPrice("ETH");
        } catch (e) {
            console.error("Price fetch error:", e);
        }

        return NextResponse.json({
            success: true,
            agent: {
                name: "RepoAngel",
                version: "1.0.0",
                status: "online",
                walletAddress: walletAddress || "Not configured",
                balance: balance || null,
                ethPrice: ethPrice?.data || null,
                funding: funding?.data || null,
            },
        });
    } catch (error) {
        console.error("Status error:", error);
        return NextResponse.json({
            success: true,
            agent: {
                name: "RepoAngel",
                version: "1.0.0",
                status: "degraded",
                walletAddress: "Error loading",
                balance: null,
                ethPrice: null,
                funding: null,
            },
        });
    }
}
