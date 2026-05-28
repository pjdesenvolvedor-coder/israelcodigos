import { NextRequest, NextResponse } from "next/server";

// Note: In a real app, this would push to a database or a real-time service like Ably/Pusher.
// For this studio demo, we'll return success and the user handles local simulation or 
// we could potentially use a global variable if this was a long-running process (not ideal in serverless).
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Log for debugging/visibility in server logs
    console.log("Received Webhook:", payload);

    return NextResponse.json({ 
      status: "success", 
      received: true,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ 
      status: "error", 
      message: "Invalid payload" 
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "WebhookPulse Endpoint Ready", 
    method: "POST required" 
  });
}
