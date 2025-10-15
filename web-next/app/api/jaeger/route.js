import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

const MCP_BASE_URL = process.env.JAEGER_MCP_URL || process.env.NEXT_PUBLIC_MCP_URL || 'http://127.0.0.1:8888';

const ACTION_MAP = {
  health: { method: 'GET', path: '/health' },
  smart_scan: { method: 'POST', path: '/api/intelligence/smart-scan' },
  analyze_target: { method: 'POST', path: '/api/intelligence/analyze-target' },
  select_tools: { method: 'POST', path: '/api/intelligence/select-tools' },
  tech_detection: { method: 'POST', path: '/api/intelligence/technology-detection' },
  recon_workflow: { method: 'POST', path: '/api/bugbounty/reconnaissance-workflow' },
  vulnerability_hunting: { method: 'POST', path: '/api/bugbounty/vulnerability-hunting-workflow' },
  osint_workflow: { method: 'POST', path: '/api/bugbounty/osint-workflow' }
};

function sanitizePayload(action, body) {
  switch (action) {
    case 'smart_scan': {
      const payload = {
        target: (body.target || '').trim(),
        objective: body.objective || 'quick',
        max_tools: Number(body.max_tools || 5),
        context: body.context || {
          request_timeout: 180,
          retry_on_timeout: true
        }
      };
      if (Array.isArray(body.specific_tools) && body.specific_tools.length) {
        payload.specific_tools = body.specific_tools;
      }
      return payload;
    }
    case 'analyze_target':
      return {
        target: (body.target || '').trim(),
        analysis_type: body.analysis_type || 'quick'
      };
    case 'select_tools':
      return {
        target: (body.target || '').trim(),
        objective: body.objective || 'quick'
      };
    case 'tech_detection':
      return { target: (body.target || '').trim() };
    case 'recon_workflow':
      return {
        domain: (body.target || body.domain || '').trim(),
        depth: body.depth || 'standard'
      };
    case 'vulnerability_hunting':
      return {
        domain: (body.target || body.domain || '').trim(),
        focus: body.focus || 'all'
      };
    case 'osint_workflow':
      return { domain: (body.target || body.domain || '').trim() };
    default:
      return body;
  }
}

async function proxyToMcp(action, body) {
  const config = ACTION_MAP[action];
  if (!config) {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  const endpoint = `${MCP_BASE_URL}${config.path}`;
  const requestInit = {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'jaeger-web-next/5.0'
    }
  };

  if (config.method === 'POST') {
    requestInit.body = JSON.stringify(sanitizePayload(action, body));
  }

  try {
    const response = await fetch(endpoint, requestInit);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          http_code: response.status
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reach MCP server'
      },
      { status: 200 }
    );
  }
}

function runLlmAnalyzer(scanResults, target) {
  return new Promise((resolve, reject) => {
    const projectRoot = path.join(process.cwd(), '..');
    const cliPath = path.join(projectRoot, 'llm-analyzer-cli.js');

    const child = spawn(
      'node',
      [cliPath, 'analyze', target, JSON.stringify(scanResults)],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `LLM analyzer exited with code ${code}`));
        return;
      }

      const lines = stdout.split('\n').map((line) => line.trim());
      let capture = false;
      const collected = [];

      lines.forEach((line) => {
        if (line.includes('ANALYSIS_START')) {
          capture = true;
          return;
        }
        if (line.includes('ANALYSIS_END')) {
          capture = false;
          return;
        }
        if (capture) {
          collected.push(line);
        }
      });

      if (collected.length === 0) {
        resolve(stdout.trim());
        return;
      }

      resolve(collected.join('\n'));
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ success: false, error: 'Missing action parameter' }, { status: 400 });
  }

  if (body.action === 'llm_analyze') {
    const target = (body.target || '').trim();
    const scanResults = body.scan_results;

    if (!scanResults || !target) {
      return NextResponse.json(
        { success: false, error: 'Scan results and target are required' },
        { status: 200 }
      );
    }

    try {
      const analysis = await runLlmAnalyzer(scanResults, target);
      return NextResponse.json({ success: true, analysis }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'LLM analyzer execution failed'
        },
        { status: 200 }
      );
    }
  }

  return proxyToMcp(body.action, body);
}
