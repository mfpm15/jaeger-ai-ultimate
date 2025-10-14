import { NextResponse } from 'next/server';

const JAEGER_MCP_URL = process.env.JAEGER_MCP_URL || 'http://127.0.0.1:8888';

export async function GET() {
  try {
    const response = await fetch(`${JAEGER_MCP_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to connect to Jaeger server',
    }, { status: 500 });
  }
}
