export async function GET() {
  return Response.json({
    ok: true,
    service: "vocs-db",
    timestamp: new Date().toISOString()
  });
}
