import { NextRequest, NextResponse } from "next/server";

const RAG_CHAT_API_URL =
  process.env.RAG_CHAT_API_URL ??
  process.env.NEXT_PUBLIC_CHAT_API_URL ??
  "http://localhost:8000/tenants/aeme/agents/support_agent/knowledge-bases/landing/query";

export async function POST(request: NextRequest) {
  let payload: { question?: unknown };

  try {
    payload = (await request.json()) as { question?: unknown };
  } catch {
    return NextResponse.json({ message: "Invalid chat request" }, { status: 400 });
  }

  if (typeof payload.question !== "string" || payload.question.trim().length === 0) {
    return NextResponse.json({ message: "Question is required" }, { status: 400 });
  }

  const response = await fetch(RAG_CHAT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: payload.question.trim() }),
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    return NextResponse.json(
      typeof body === "string" ? { message: body } : body,
      { status: response.status }
    );
  }

  return NextResponse.json(body);
}
