import { PinionClient } from "pinion-os";

// Singleton PinionClient instance
let client: PinionClient | null = null;

export function getPinionClient(): PinionClient {
  if (!client) {
    const privateKey = process.env.PINION_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "PINION_PRIVATE_KEY environment variable is required. " +
        "Set it in .env.local with your Base wallet private key (0x...)"
      );
    }
    client = new PinionClient({
      privateKey,
      network: process.env.PINION_NETWORK || "base-sepolia",
      apiKey: process.env.PINION_API_KEY,
    });
  }
  return client;
}

// --- Skill Wrappers ---

export async function getBalance(address: string) {
  const pinion = getPinionClient();
  return pinion.skills.balance(address);
}

export async function getPrice(token: string) {
  const pinion = getPinionClient();
  return pinion.skills.price(token);
}

export async function getTx(hash: string) {
  const pinion = getPinionClient();
  return pinion.skills.tx(hash);
}

export async function generateWallet() {
  const pinion = getPinionClient();
  return pinion.skills.wallet();
}

export async function chat(message: string) {
  const pinion = getPinionClient();
  return pinion.skills.chat(message);
}

export async function sendFunds(to: string, amount: string, token: "ETH" | "USDC") {
  const pinion = getPinionClient();
  return pinion.skills.send(to, amount, token);
}

export async function trade(src: string, dst: string, amount: string) {
  const pinion = getPinionClient();
  return pinion.skills.trade(src, dst, amount);
}

export async function broadcast(tx: {
  to: string;
  data?: string;
  value?: string;
  gasLimit?: string;
}) {
  const pinion = getPinionClient();
  return pinion.skills.broadcast(tx);
}

export async function getFunding(address: string) {
  const pinion = getPinionClient();
  return pinion.skills.fund(address);
}
