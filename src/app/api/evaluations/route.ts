import { NextResponse } from "next/server";
import { getEvaluations, getStats, getTreasury, getEnterpriseAudits } from "@/lib/evaluations";

// GET /api/evaluations — Return all evaluations, stats, treasury, and enterprise audits
export async function GET() {
    try {
        const evaluations = getEvaluations();
        const stats = getStats();
        const treasury = getTreasury();
        const enterpriseAudits = getEnterpriseAudits();

        return NextResponse.json({
            success: true,
            evaluations,
            stats,
            treasury,
            enterpriseAudits,
        });
    } catch (error) {
        console.error("Error fetching evaluations:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch evaluations" },
            { status: 500 }
        );
    }
}
