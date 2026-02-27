import { NextRequest, NextResponse } from "next/server";
import { addEnterpriseAudit, addRevenue, getTreasury, EnterpriseAudit } from "@/lib/evaluations";
import { bedrockChat, isBedrockConfigured } from "@/lib/bedrock.service";

// ── Mock Enterprise Contracts ──────────────────────────────────────────
const ENTERPRISE_CONTRACTS = [
    {
        id: "ent-1",
        client: "DeFiVault Labs",
        contractName: "VaultStrategy.sol",
        linesOfCode: 340,
        price: "10.00",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract VaultStrategy is Ownable, ReentrancyGuard {
    IERC20 public immutable asset;
    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public totalAssets;

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);

    constructor(address _asset) { asset = IERC20(_asset); }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        uint256 newShares = totalShares == 0
            ? amount
            : (amount * totalShares) / totalAssets;
        asset.transferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += newShares;
        totalShares += newShares;
        totalAssets += amount;
        emit Deposit(msg.sender, amount, newShares);
    }

    function withdraw(uint256 shareAmount) external nonReentrant {
        require(shareAmount > 0 && shares[msg.sender] >= shareAmount);
        uint256 assetAmount = (shareAmount * totalAssets) / totalShares;
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        totalAssets -= assetAmount;
        asset.transfer(msg.sender, assetAmount);
        emit Withdraw(msg.sender, assetAmount, shareAmount);
    }
}`,
    },
    {
        id: "ent-2",
        client: "ChainBridge Inc",
        contractName: "CrossChainRelay.sol",
        linesOfCode: 520,
        price: "15.00",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract CrossChainRelay is AccessControl, Pausable {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER");
    uint256 public nonce;
    mapping(bytes32 => bool) public processedMessages;
    mapping(uint256 => address) public chainAdapters;

    event MessageSent(uint256 indexed destChainId, bytes32 messageHash, address sender);
    event MessageReceived(uint256 indexed srcChainId, bytes32 messageHash);

    struct Message {
        uint256 srcChainId;
        uint256 destChainId;
        address sender;
        bytes payload;
        uint256 nonce;
    }

    function sendMessage(uint256 destChainId, bytes calldata payload)
        external whenNotPaused returns (bytes32) {
        require(chainAdapters[destChainId] != address(0), "Unsupported chain");
        bytes32 msgHash = keccak256(abi.encodePacked(
            block.chainid, destChainId, msg.sender, payload, nonce++
        ));
        emit MessageSent(destChainId, msgHash, msg.sender);
        return msgHash;
    }

    function receiveMessage(Message calldata msg_)
        external onlyRole(RELAYER_ROLE) whenNotPaused {
        bytes32 msgHash = keccak256(abi.encode(msg_));
        require(!processedMessages[msgHash], "Already processed");
        processedMessages[msgHash] = true;
        (bool success,) = chainAdapters[msg_.srcChainId].call(msg_.payload);
        require(success, "Execution failed");
        emit MessageReceived(msg_.srcChainId, msgHash);
    }
}`,
    },
    {
        id: "ent-3",
        client: "NFTMarket DAO",
        contractName: "RoyaltyDistributor.sol",
        linesOfCode: 280,
        price: "8.00",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RoyaltyDistributor is ReentrancyGuard {
    struct RoyaltyInfo {
        address creator;
        uint256 basisPoints; // 100 = 1%
        uint256 totalCollected;
    }

    mapping(address => mapping(uint256 => RoyaltyInfo)) public royalties;
    mapping(address => uint256) public pendingWithdrawals;

    event RoyaltyPaid(address indexed collection, uint256 indexed tokenId, uint256 amount);
    event RoyaltyWithdrawn(address indexed creator, uint256 amount);

    function registerRoyalty(address collection, uint256 tokenId, uint256 basisPoints) external {
        require(basisPoints <= 1000, "Max 10%");
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "Not owner");
        royalties[collection][tokenId] = RoyaltyInfo(msg.sender, basisPoints, 0);
    }

    function payRoyalty(address collection, uint256 tokenId) external payable nonReentrant {
        RoyaltyInfo storage info = royalties[collection][tokenId];
        require(info.creator != address(0), "No royalty set");
        uint256 royaltyAmount = (msg.value * info.basisPoints) / 10000;
        info.totalCollected += royaltyAmount;
        pendingWithdrawals[info.creator] += royaltyAmount;
        emit RoyaltyPaid(collection, tokenId, royaltyAmount);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        emit RoyaltyWithdrawn(msg.sender, amount);
    }
}`,
    },
];

const AUDIT_PROMPT = `You are RepoAngel's Enterprise Security Auditor. A Web3 company has paid you via x402 to audit their smart contract.

Analyze the Solidity code and return ONLY this JSON:
{
  "verdict": "SECURE" or "ISSUES_FOUND" or "CRITICAL",
  "severity": "low" or "medium" or "high",
  "summary": "<2-3 sentence security assessment>",
  "findings": ["<finding 1>", "<finding 2>", "<finding 3>"]
}

Focus on: reentrancy, access control, integer overflow, unchecked external calls, gas optimization, and common Solidity pitfalls.`;

function heuristicAudit(contract: typeof ENTERPRISE_CONTRACTS[0]): Omit<EnterpriseAudit, "id" | "timestamp"> {
    const code = contract.code;

    const hasReentrancyGuard = /ReentrancyGuard|nonReentrant/.test(code);
    const hasAccessControl = /Ownable|AccessControl|onlyOwner|onlyRole/.test(code);
    const hasPausable = /Pausable|whenNotPaused/.test(code);
    const hasEvents = /emit\s+\w+/.test(code);
    const hasRequire = /require\(/.test(code);
    const hasUncheckedCall = /\.call\{/.test(code);
    const hasTransfer = /\.transfer\(/.test(code);

    const findings: string[] = [];
    let severity: "low" | "medium" | "high" = "low";

    if (hasReentrancyGuard) findings.push("✅ ReentrancyGuard properly implemented — prevents reentrancy attacks");
    else { findings.push("⚠️ No ReentrancyGuard detected — vulnerable to reentrancy"); severity = "high"; }

    if (hasAccessControl) findings.push("✅ Access control implemented via " + (code.includes("Ownable") ? "Ownable" : "AccessControl"));
    else { findings.push("⚠️ No access control — all functions are publicly callable"); severity = "high"; }

    if (hasPausable) findings.push("✅ Circuit breaker (Pausable) enabled for emergency stops");

    if (hasUncheckedCall) {
        findings.push("⚠️ Low-level .call() used — ensure return value is checked");
        if (severity === "low") severity = "medium";
    }

    if (hasEvents) findings.push("✅ Events emitted for state changes — good indexing practice");
    if (hasRequire) findings.push("✅ Input validation via require statements");

    if (hasTransfer) findings.push("ℹ️ Using .transfer() — safe but limited to 2300 gas stipend");

    if (contract.linesOfCode > 400) {
        findings.push("ℹ️ Contract exceeds 400 LOC — consider splitting into smaller modules");
    }

    const verdict = severity === "high" ? "CRITICAL" as const : severity === "medium" ? "ISSUES_FOUND" as const : "SECURE" as const;

    const summary = verdict === "SECURE"
        ? `${contract.contractName} passes security review. Uses OpenZeppelin battle-tested primitives with proper access control, reentrancy protection, and event logging.`
        : verdict === "ISSUES_FOUND"
            ? `${contract.contractName} has minor issues. Core security patterns are in place but low-level calls require careful review. Recommend gas optimization pass.`
            : `${contract.contractName} has critical vulnerabilities. Missing reentrancy guards or access controls could lead to fund extraction. Do not deploy without fixes.`;

    return {
        client: contract.client,
        contractName: contract.contractName,
        linesOfCode: contract.linesOfCode,
        amountCharged: contract.price,
        verdict,
        summary,
        findings: findings.slice(0, 5),
        severity,
    };
}

// POST /api/enterprise-audit
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const contractId = body.contractId as string | undefined;

        const contract = contractId
            ? ENTERPRISE_CONTRACTS.find(c => c.id === contractId) || ENTERPRISE_CONTRACTS[Math.floor(Math.random() * ENTERPRISE_CONTRACTS.length)]
            : ENTERPRISE_CONTRACTS[Math.floor(Math.random() * ENTERPRISE_CONTRACTS.length)];

        let auditResult: Omit<EnterpriseAudit, "id" | "timestamp">;

        // Try Bedrock first for AI audit
        if (isBedrockConfigured()) {
            try {
                const prompt = `Audit this Solidity smart contract for ${contract.client}:\n\n${contract.code}`;
                const response = await bedrockChat(prompt, AUDIT_PROMPT);
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    auditResult = {
                        client: contract.client,
                        contractName: contract.contractName,
                        linesOfCode: contract.linesOfCode,
                        amountCharged: contract.price,
                        verdict: parsed.verdict || "SECURE",
                        summary: `[Bedrock Claude] ${parsed.summary}`,
                        findings: parsed.findings || [],
                        severity: parsed.severity || "low",
                    };
                } else {
                    throw new Error("Could not parse Bedrock audit");
                }
            } catch {
                auditResult = heuristicAudit(contract);
            }
        } else {
            auditResult = heuristicAudit(contract);
        }

        const audit: EnterpriseAudit = {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            ...auditResult,
        };

        addEnterpriseAudit(audit);
        addRevenue(parseFloat(contract.price));

        return NextResponse.json({
            success: true,
            audit,
            treasury: getTreasury(),
            amountCharged: contract.price,
        });
    } catch (error) {
        console.error("Enterprise audit error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Audit failed" },
            { status: 500 }
        );
    }
}
