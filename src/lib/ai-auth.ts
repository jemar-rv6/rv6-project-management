import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function requireAiConnector(request: Request) {
  const expected = process.env.AI_CONNECTOR_API_KEY;
  if (!expected) return NextResponse.json({ error: "AI connector is not configured." }, { status: 503 });

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const provided = bearerToken ?? request.headers.get("x-api-key");
  if (!provided) return NextResponse.json({ error: "Missing AI connector credentials." }, { status: 401 });

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  const valid = expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
  return valid ? null : NextResponse.json({ error: "Invalid AI connector credentials." }, { status: 401 });
}