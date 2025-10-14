'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ScanResult {
  tools_executed: ToolExecution[];
  execution_summary?: {
    total_execution_time?: number;
  };
  total_vulnerabilities?: number;
  target?: string;
}

interface ToolExecution {
  tool: string;
  success?: boolean;
  status?: string;
  execution_time?: number;
  command?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  vulnerabilities_found?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [workflow, setWorkflow] = useState('quick');
  const [isScanning, setIsScanning] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setServerStatus(data.success && data.data?.status === 'healthy' ? 'online' : 'offline');

      if (messages.length === 0 && data.success) {
        addMessage('assistant', '✅ Jaeger MCP Server is online and ready!');
      }
    } catch (error) {
      setServerStatus('offline');
      if (messages.length === 0) {
        addMessage('assistant', '❌ Failed to connect to Jaeger server. Please start the server.');
      }
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isScanning) return;

    const parsed = parseUserInput(input.trim());

    addMessage('user', `🎯 Scan target: ${parsed.target}`);
    if (parsed.requestedTools && parsed.requestedTools.length > 0) {
      addMessage('user', `🔧 Requested tools: ${parsed.requestedTools.join(', ').toUpperCase()}`);
    }
    addMessage('user', `📊 Mode: ${workflow}`);

    setInput('');
    setIsScanning(true);

    let loadingMsg = '🚀 Jaeger AI is analyzing your target...\n⚙️ Preparing security tools';
    if (parsed.requestedTools && parsed.requestedTools.length > 0) {
      loadingMsg += `\n🔧 Executing: ${parsed.requestedTools.join(', ').toUpperCase()}`;
    }
    addMessage('assistant', loadingMsg);

    try {
      const maxTools = workflow === 'comprehensive' ? 10 : workflow === 'vulnerability_hunting' ? 8 : workflow === 'reconnaissance' ? 6 : workflow === 'osint' ? 4 : 3;

      const requestBody: any = {
        action: 'smart_scan',
        target: parsed.target,
        objective: workflow,
        max_tools: maxTools,
      };

      if (parsed.requestedTools && parsed.requestedTools.length > 0) {
        requestBody.specific_tools = parsed.requestedTools;
        requestBody.max_tools = parsed.requestedTools.length;
      }

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success && result.data) {
        displayScanResults(result.data, parsed.target, workflow);

        // Add LLM Analysis
        addMessage('assistant', '🧠 Analyzing results with AI...');
        await analyzeScanResults(result.data, parsed.target);
      } else {
        addMessage('assistant', `❌ Scan failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addMessage('assistant', `⚠️ Error during scan: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const parseUserInput = (input: string) => {
    const inputLower = input.toLowerCase().trim();
    const allTools = ['nmap', 'subfinder', 'httpx', 'nuclei', 'ffuf', 'sqlmap', 'nikto', 'wpscan', 'gobuster', 'dirb', 'hydra', 'john', 'hashcat', 'masscan', 'rustscan', 'dirsearch', 'feroxbuster', 'wafw00f', 'katana', 'dalfox', 'amass', 'dnsenum'];

    const requestedTools: string[] = [];
    allTools.forEach((tool) => {
      if (inputLower.includes(tool)) {
        requestedTools.push(tool);
      }
    });

    const removeWords = ['scan', 'coba', 'test', 'check', 'analyze', 'please', 'tolong', 'dong', 'ya', 'aja', 'deh', 'try', 'run', 'execute', 'pakai', 'gunakan', 'dengan', 'pake', 'use', 'with'].concat(allTools);

    let cleaned = input.trim();
    removeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    const target = cleaned || input.trim();

    return {
      target,
      requestedTools: requestedTools.length > 0 ? requestedTools : null,
    };
  };

  const displayScanResults = (data: ScanResult, target: string, workflow: string) => {
    const toolsExecuted = data.tools_executed || [];
    const totalVulns = data.total_vulnerabilities || 0;
    const executionTime = data.execution_summary?.total_execution_time || 0;

    let severityEmoji = '✅';
    if (totalVulns > 10) severityEmoji = '🔴';
    else if (totalVulns > 5) severityEmoji = '🟠';
    else if (totalVulns > 0) severityEmoji = '🟡';

    const workflowEmoji: any = {
      'quick': '⚡',
      'reconnaissance': '🔍',
      'vulnerability_hunting': '🎯',
      'osint': '🕵️',
      'comprehensive': '🚀'
    };

    let report = `
╔════════════════════════════════════════╗
║   📊 JAEGER AI - SCAN COMPLETE   ║
╚════════════════════════════════════════╝

🎯 **Target Domain**: \`${target}\`
${workflowEmoji[workflow] || '🔬'} **Scan Mode**: \`${workflow.toUpperCase()}\`
🛠️ **Tools Executed**: **${toolsExecuted.length}** security tools
⏱️ **Total Runtime**: **${Math.round(executionTime)}s**
${severityEmoji} **Security Findings**: **${totalVulns}** potential issues

💡 **Status**: ${totalVulns === 0 ? '✅ No critical issues found' : `⚠️ ${totalVulns} findings require review`}

═══════════════════════════════════════
## 🔧 **Detailed Tool Execution Report**
`;

    toolsExecuted.forEach((tool, index) => {
      const toolName = (tool.tool || 'unknown').toUpperCase();
      const isSuccess = tool.success !== false && tool.status !== 'failed';
      const status = isSuccess ? '✅ SUCCESS' : '❌ FAILED';
      const executionTime = tool.execution_time ? `${Math.round(tool.execution_time)}s` : 'N/A';

      const toolEmoji: any = {
        'NMAP': '🔍', 'SUBFINDER': '🌐', 'HTTPX': '📡', 'NUCLEI': '💣',
        'FFUF': '🔨', 'SQLMAP': '💉', 'NIKTO': '🔎', 'WPSCAN': '📝',
        'GOBUSTER': '🚪', 'DALFOX': '🔧', 'MASSCAN': '⚡', 'RUSTSCAN': '🦀',
        'AMASS': '🕸️', 'THEHARVESTER': '🌾', 'SHERLOCK': '🔍', 'HYDRA': '💪',
        'HASHCAT': '🔐', 'JOHN': '🗝️', 'METASPLOIT': '💥', 'BURPSUITE': '🔥'
      };

      report += `\n${toolEmoji[toolName] || '🔧'} **Tool #${index + 1}: ${toolName}**\n`;
      report += `├─ 📊 Status: **${status}**\n`;
      report += `├─ ⏱️ Duration: **${executionTime}**\n`;

      if (tool.command) {
        const shortCmd = tool.command.length > 80 ? tool.command.substring(0, 80) + '...' : tool.command;
        report += `└─ 💻 Command: \`${shortCmd}\`\n`;
      }

      if (tool.stdout && tool.stdout.trim()) {
        const output = extractHighlights(tool.stdout, 10);
        if (output) {
          report += `\n📄 **Output Highlights:**\n\`\`\`\n${output}\n\`\`\`\n`;
        }
      }

      if (tool.vulnerabilities_found && tool.vulnerabilities_found > 0) {
        report += `\n🚨 **Vulnerabilities Found**: **${tool.vulnerabilities_found}**\n`;
      }

      if (tool.error && tool.error.trim()) {
        report += `\n❗ **Error**: \`${tool.error.substring(0, 150)}...\`\n`;
      }

      report += `\n`;
    });

    report += `
═══════════════════════════════════════
✨ **SCAN COMPLETE** ✨

${totalVulns > 0 ? '🔍 **Next Steps:**\n   • Review findings above\n   • Verify vulnerabilities\n   • Apply recommended fixes\n   • Run deeper scans if needed' : '🎉 **Great News!**\n   No immediate security concerns detected.\n   Continue monitoring for new threats.'}

═══════════════════════════════════════

📚 **Report Generated By:**
**JAEGER AI, Your Cyber Security Partner**
🤖 Powered by Advanced AI Security Intelligence
`;

    addMessage('assistant', report.trim());
  };

  const analyzeScanResults = async (data: ScanResult, target: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: data, target }),
      });

      const result = await response.json();

      if (result.success && result.analysis) {
        addMessage('assistant', result.analysis);
      } else {
        addMessage('assistant', '⚠️ AI analysis unavailable at this time.');
      }
    } catch (error: any) {
      addMessage('assistant', `⚠️ AI analysis failed: ${error.message}`);
    }
  };

  const extractHighlights = (text: string, maxLines: number = 15): string => {
    if (!text) return '';

    const keywords = ['critical', 'high', 'medium', 'vulnerability', 'found', 'open', 'port', 'http', 'status', 'error', 'warning'];
    const lines = text.split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('::') && !/^Progress:\s*\d+/.test(line));

    const keywordMatches = lines.filter((line) => {
      const lower = line.toLowerCase();
      return keywords.some((keyword) => lower.includes(keyword));
    });

    if (keywordMatches.length > 0) {
      return keywordMatches.slice(0, maxLines).join('\n');
    }

    return lines.slice(0, Math.min(lines.length, 10)).join('\n');
  };

  const formatMessage = (content: string) => {
    // Convert markdown to HTML
    let html = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-purple-900/50 px-1 py-0.5 rounded">$1</code>')
      .replace(/\n/g, '<br>');

    // Code blocks
    html = html.replace(/```(.+?)```/gs, '<pre class="bg-black/50 p-3 rounded my-2 overflow-x-auto"><code>$1</code></pre>');

    return html;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🤖</div>
              <div>
                <h1 className="text-2xl font-bold text-white">JAEGER AI</h1>
                <p className="text-sm text-purple-300">Intelligent Penetration Testing Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-300">
                {serverStatus === 'online' ? 'Server Online' : serverStatus === 'offline' ? 'Server Offline' : 'Checking...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Workflow Selector */}
          <div className="mb-6 p-4 bg-black/30 backdrop-blur-md rounded-lg border border-purple-500/20">
            <label className="text-sm text-purple-300 mb-2 block">Scan Mode:</label>
            <select
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
              disabled={isScanning}
            >
              <option value="quick">⚡ Quick Scan (3 tools)</option>
              <option value="reconnaissance">🔍 Reconnaissance (6 tools)</option>
              <option value="vulnerability_hunting">🎯 Vulnerability Hunting (10 tools)</option>
              <option value="osint">🕵️ OSINT Gathering (4 tools)</option>
              <option value="comprehensive">🚀 Comprehensive Scan (10+ tools)</option>
            </select>
          </div>

          {/* Chat Container */}
          <div
            ref={chatContainerRef}
            className="h-[500px] overflow-y-auto mb-6 p-6 bg-black/30 backdrop-blur-md rounded-lg border border-purple-500/20 space-y-4 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to JAEGER AI</h2>
                <p className="text-purple-300 mb-6">Your intelligent penetration testing assistant powered by 150+ security tools</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="p-4 bg-purple-900/30 rounded-lg">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-white font-semibold mb-1">Smart Target Analysis</div>
                    <div className="text-sm text-purple-300">AI-powered target profiling and risk assessment</div>
                  </div>
                  <div className="p-4 bg-purple-900/30 rounded-lg">
                    <div className="text-3xl mb-2">🔧</div>
                    <div className="text-white font-semibold mb-1">Auto Tool Selection</div>
                    <div className="text-sm text-purple-300">Intelligent tool selection based on target type</div>
                  </div>
                  <div className="p-4 bg-purple-900/30 rounded-lg">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-white font-semibold mb-1">Comprehensive Reports</div>
                    <div className="text-sm text-purple-300">Detailed vulnerability reports with recommendations</div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-purple-600/80' : 'bg-gray-800/80'} backdrop-blur-sm rounded-lg p-4 shadow-lg`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{message.role === 'user' ? '👤' : '🤖'}</span>
                    <span className="text-sm font-semibold text-white">
                      {message.role === 'user' ? 'You' : 'JAEGER AI'}
                    </span>
                  </div>
                  <div
                    className="text-white text-sm whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter target (e.g., example.com) or 'coba nmap indibizbarito.com'"
              className="w-full px-6 py-4 bg-black/30 backdrop-blur-md text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none pr-24 placeholder-purple-400/50"
              disabled={isScanning}
            />
            <button
              type="submit"
              disabled={isScanning || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-purple-300">
            <p>🤖 JAEGER AI, Your Cyber Security Partner</p>
            <p className="text-xs mt-1">Powered by Advanced AI Security Intelligence</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }

        code {
          font-family: 'Courier New', Courier, monospace;
        }

        pre {
          font-family: 'Courier New', Courier, monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
