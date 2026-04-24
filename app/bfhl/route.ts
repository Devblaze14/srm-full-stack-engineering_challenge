import { NextResponse } from "next/server";
import { processBfhl } from "@/lib/bfhl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }
  const data = (body as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    return NextResponse.json(
      { error: "'data' must be an array" },
      { status: 400, headers: corsHeaders }
    );
  }
  const result = processBfhl(data);
  return NextResponse.json(result, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { message: "POST to /bfhl with { data: string[] }" },
    { headers: corsHeaders }
  );
}
