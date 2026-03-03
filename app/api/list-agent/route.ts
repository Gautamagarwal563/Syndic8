import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, icon, description, category, pricePerTask,
      apiEndpoint, examples, contactEmail, website, howItWorks,
    } = body;

    // Basic validation
    if (!name || !description || !contactEmail || !apiEndpoint) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), "data");
    await mkdir(dataDir, { recursive: true });

    const filePath = path.join(dataDir, "agent-submissions.json");
    let existing: unknown[] = [];
    try {
      const raw = await readFile(filePath, "utf-8");
      existing = JSON.parse(raw);
    } catch { /* file doesn't exist yet */ }

    const submission = {
      id: `agent-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: "pending_review",
      name, icon: icon || "🤖", description, category, pricePerTask,
      apiEndpoint, examples, contactEmail, website, howItWorks,
    };

    existing.push(submission);
    await writeFile(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error("list-agent error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
