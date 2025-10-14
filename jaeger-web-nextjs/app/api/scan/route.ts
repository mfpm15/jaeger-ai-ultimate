import { NextResponse } from 'next/server';

const JAEGER_MCP_URL = process.env.JAEGER_MCP_URL || 'http://127.0.0.1:8888';
const API_TIMEOUT = 180000; // 3 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, target, objective, max_tools, specific_tools } = body;

    if (!action || !target) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }

    const requestBody: any = {
      target,
      objective: objective || 'quick',
      max_tools: max_tools || 5,
      context: {
        request_timeout: 180,
        retry_on_timeout: true,
      },
    };

    if (specific_tools && Array.isArray(specific_tools)) {
      requestBody.specific_tools = specific_tools;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${JAEGER_MCP_URL}/api/intelligence/smart-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Scan failed',
        http_code: response.status,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Scan API error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Request timeout - scan took too long',
        details: 'Consider using a shorter scan or check MCP server',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}
