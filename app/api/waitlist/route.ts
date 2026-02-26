import { NextRequest } from "next/server";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim() || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400 });
    }

    const dir = join(process.cwd(), "data");
    try { mkdirSync(dir, { recursive: true }); } catch { /* exists */ }

    const line = `${new Date().toISOString()},${email.trim()}\n`;
    appendFileSync(join(dir, "waitlist.csv"), line);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500 });
  }
}
