export function handleHealthCheck(_req: Request): Response {
  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "z-cal-api",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

