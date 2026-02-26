import { NextRequest } from "next/server";
import { sendUSDC, getUSDCBalance, ORCHESTRATOR_ADDRESS } from "../../../lib/blockchain";

export async function POST(req: NextRequest) {
  try {
    const { agentId, amount } = await req.json();
    if (!agentId || !amount) {
      return new Response(JSON.stringify({ error: "agentId and amount required" }), { status: 400 });
    }

    const result = await sendUSDC(agentId, amount);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error("Payment failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Payment failed" }),
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const balance = await getUSDCBalance(ORCHESTRATOR_ADDRESS);
    return new Response(JSON.stringify({ address: ORCHESTRATOR_ADDRESS, balance }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch balance" }), { status: 500 });
  }
}
