import { ethers } from "ethers";

// ── Base Sepolia Constants ──────────────────────────────────────────────
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const USDC_SEPOLIA_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for transfer + balanceOf
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
];

/**
 * Send USDC directly on Base Sepolia using ethers.js.
 * Bypasses PinionOS API (which is mainnet-only).
 */
export async function sendUSDCOnSepolia(
    toRaw: string,
    amount: string
): Promise<{ txHash: string; explorerUrl: string }> {
    // Normalize checksum (ethers v6 is strict about checksums)
    const to = ethers.getAddress(toRaw.toLowerCase());
    const privateKey = process.env.PINION_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PINION_PRIVATE_KEY not set");
    }

    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC, BASE_SEPOLIA_CHAIN_ID);
    const wallet = new ethers.Wallet(privateKey, provider);

    const usdc = new ethers.Contract(USDC_SEPOLIA_ADDRESS, ERC20_ABI, wallet);

    // Convert dollar amount to USDC units (6 decimals)
    const amountInUnits = ethers.parseUnits(amount, USDC_DECIMALS);

    // Check balance first
    const balance = await usdc.balanceOf(wallet.address);
    if (balance < amountInUnits) {
        throw new Error(
            `Insufficient USDC: have ${ethers.formatUnits(balance, USDC_DECIMALS)}, need ${amount}`
        );
    }

    console.log(`💸 [Sepolia] Sending ${amount} USDC to ${to}`);
    const tx = await usdc.transfer(to, amountInUnits);
    console.log(`📦 [Sepolia] TX submitted: ${tx.hash}`);

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    console.log(`✅ [Sepolia] Confirmed in block ${receipt?.blockNumber}`);

    return {
        txHash: tx.hash,
        explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
    };
}

/**
 * Get USDC + ETH balance on Base Sepolia.
 */
export async function getSepoliaBalance(address: string): Promise<{
    ETH: string;
    USDC: string;
}> {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC, BASE_SEPOLIA_CHAIN_ID);
    const usdc = new ethers.Contract(USDC_SEPOLIA_ADDRESS, ERC20_ABI, provider);

    const [ethBal, usdcBal] = await Promise.all([
        provider.getBalance(address),
        usdc.balanceOf(address),
    ]);

    return {
        ETH: ethers.formatEther(ethBal),
        USDC: ethers.formatUnits(usdcBal, USDC_DECIMALS),
    };
}
