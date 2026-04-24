import { analyzeEdges } from "@/lib/bfhl";
import { withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, withCors({ status: 204 }));
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, withCors({ status: 400 }));
  }

  const data = (body as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    return Response.json({ error: "'data' must be an array" }, withCors({ status: 400 }));
  }

  return Response.json(analyzeEdges(data), withCors());
}

export function GET() {
  return Response.json(
    { message: "POST /bfhl with { data: string[] }" },
    withCors()
  );
}
