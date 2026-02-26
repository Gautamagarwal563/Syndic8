import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

const AGENT_PRICES: Record<string, { name: string; price: number; icon: string }> = {
  "web-research":    { name: "Web Research Agent",    price: 50,  icon: "🔍" },
  "due-diligence":  { name: "Due Diligence Agent",   price: 200, icon: "📊" },
  "lead-enrichment":{ name: "Lead Enrichment Agent", price: 25,  icon: "🎯" },
};

export async function POST(req: NextRequest) {
  try {
    const { agentId, input } = await req.json();
    const agent = AGENT_PRICES[agentId];
    if (!agent) return NextResponse.json({ error: "Invalid agent" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${agent.icon} ${agent.name}`,
            description: `Syndic8 · ${input.slice(0, 100)}`,
          },
          unit_amount: agent.price,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}/agent/${agentId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/agent/${agentId}`,
      metadata: { agentId, input: input.slice(0, 500) },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
