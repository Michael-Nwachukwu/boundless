export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: "Boundless API - See documentation above" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

export async function POST(request: Request) {
  return new Response(JSON.stringify({ message: "POST method not allowed on root endpoint" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  })
}
