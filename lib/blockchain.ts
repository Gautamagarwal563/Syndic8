import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;
const USDC_DECIMALS = 6;

const USDC_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Real agent wallet addresses on Base Sepolia
export const AGENT_WALLETS: Record<string, `0x${string}`> = {
  "web-research":        "0xA66b832785E83992C03c463c98cE6CE41b38824B",
  "due-diligence":       "0xbD9A63cECF233b758Db7E41e7E4795aC8E6FB22f",
  "competitor-analysis": "0xF8740753e7a8F89FaCf7B9C7ef9c596687e8aD53",
  "investor-research":   "0x66620fB16E7DC40dda2b4deEBdf6c53b637dBA54",
  "lead-enrichment":     "0xFa8aC89f935040aa7f5cCD1D9622bA0B7Ab429e9",
  "startup-validator":   "0x02eDEb2b4316DD788A3BFd40c806Fe5A5d2e7617",
  "roast-startup":       "0xbCfc95235B3b812b3C81C8bdE9Cee4aa53830230",
};

export const ORCHESTRATOR_ADDRESS = "0x692705060b0E53348D6AE675E14093c7b4C76ca7" as `0x${string}`;
export const BASESCAN_URL = "https://sepolia.basescan.org";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

export async function sendUSDC(toAgentId: string, amount: number): Promise<{
  txHash: string;
  basescanUrl: string;
  from: string;
  to: string;
  amount: string;
}> {
  const privateKey = process.env.ORCHESTRATOR_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("ORCHESTRATOR_PRIVATE_KEY not set");

  const toAddress = AGENT_WALLETS[toAgentId];
  if (!toAddress) throw new Error(`No wallet for agent: ${toAgentId}`);

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  const amountInUnits = parseUnits(amount.toString(), USDC_DECIMALS);

  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "transfer",
    args: [toAddress, amountInUnits],
  });

  return {
    txHash,
    basescanUrl: `${BASESCAN_URL}/tx/${txHash}`,
    from: ORCHESTRATOR_ADDRESS,
    to: toAddress,
    amount: amount.toFixed(2),
  };
}

export async function getUSDCBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return formatUnits(balance as bigint, USDC_DECIMALS);
  } catch {
    return "0.00";
  }
}
