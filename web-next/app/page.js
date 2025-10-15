'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_ENDPOINT = '/api/jaeger';
const DEFAULT_WORKFLOW = 'quick';

const WORKFLOW_OPTIONS = [
  { id: 'quick', icon: '⚡', title: 'Quick Scan', description: 'Fast triage with essential tools', maxTools: 3 },
  { id: 'reconnaissance', icon: '🔍', title: 'Reconnaissance', description: 'Surface mapping & tech fingerprinting', maxTools: 6 },
  { id: 'vulnerability_hunting', icon: '🎯', title: 'Vuln Hunting', description: 'Aggressive vulnerability discovery', maxTools: 8 },
  { id: 'osint', icon: '🕵️', title: 'OSINT', description: 'Open Source Intelligence collection', maxTools: 4 },
  { id: 'comprehensive', icon: '🚀', title: 'Comprehensive', description: 'Full-spectrum, high-depth workflow', maxTools: 10 }
];

const SUPPORTED_TOOLS = [
  'nmap',
  'amass',
  'subfinder',
  'httpx',
  'nuclei',
  'gobuster',
  'feroxbuster',
  'ffuf',
  'sqlmap',
  'nikto',
  'wpscan',
  'dirsearch',
  'katana',
  'arjun',
  'paramspider',
  'dalfox'
];

const KNOWN_TOOL_KEYWORDS = Array.from(
  new Set([
    ...SUPPORTED_TOOLS,
    'masscan',
    'rustscan',
    'zmap',
    'gau',
    'naabu',
    'whatweb',
    'wafw00f',
    'dirb',
    'dnsenum',
    'hydra',
    'john',
    'hashcat'
  ])
);

function formatMessage(content) {
  if (!content) return '';
  let output = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*(.+?)\*/g, '<em>$1</em>');
  output = output.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
  output = output.replace(/`(.+?)`/g, '<code>$1</code>');
  output = output.replace(/\n/g, '<br>');

  return output;
}

function parseUserInput(raw) {
  const inputLower = raw.toLowerCase().trim();
  const requestedTools = [];

  KNOWN_TOOL_KEYWORDS.forEach((tool) => {
    if (inputLower.includes(tool)) {
      requestedTools.push(tool);
    }
  });

  const removeWords = [
    'scan', 'coba', 'test', 'check', 'analyze', 'please', 'tolong', 'dong', 'ya', 'aja', 'deh',
    'try', 'run', 'execute', 'pakai', 'gunakan', 'dengan', 'pake', 'use', 'with'
  ].concat(KNOWN_TOOL_KEYWORDS);

  let cleaned = raw.trim();
  removeWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  const target = cleaned || raw.trim();

  const uniqueRequested = Array.from(new Set(requestedTools));

  return {
    target,
    requestedTools: uniqueRequested.length ? uniqueRequested : null
  };
}

function extractHighlights(text, maxLines = 15) {
  if (!text) return '';

  const keywords = ['critical', 'high', 'medium', 'vulnerability', 'found', 'open', 'port', 'http', 'status', 'error', 'warning'];
  const lines = text
    .split('\n')
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
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [workflow, setWorkflow] = useState(DEFAULT_WORKFLOW);
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState({ label: 'Checking...', state: 'unknown' });
  const chatEndRef = useRef(null);
  const initialStatusRef = useRef(false);

  useEffect(() => {
    checkStatus();
    const timer = setInterval(checkStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const addMessage = useCallback((role, content) => {
    const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        role,
        html: formatMessage(content)
      }
    ]);
    return id;
  }, []);

  const removeMessage = useCallback((id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health' })
      });

      const data = await res.json();
      if (data.success && data.data?.status === 'healthy') {
        setStatus({ label: 'Server Online', state: 'online' });
        if (!initialStatusRef.current) {
          addMessage('assistant', '✅ Jaeger MCP Server is online and ready!');
          initialStatusRef.current = true;
        }
      } else {
        setStatus({ label: 'Server Offline', state: 'offline' });
        if (!initialStatusRef.current) {
          addMessage('assistant', '❌ Jaeger MCP Server is offline. Please start the server.');
          initialStatusRef.current = true;
        }
      }
    } catch (error) {
      setStatus({ label: 'Connection Error', state: 'offline' });
      addMessage('assistant', `⚠️ Failed to connect to Jaeger server: ${error.message}`);
    }
  }, [addMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    initialStatusRef.current = false;
  }, []);

  const showTools = useCallback(() => {
    const bulletList = SUPPORTED_TOOLS.map((tool) => `├─ 🔧 ${tool.toUpperCase()}`).join('\n');
    addMessage(
      'assistant',
      `╔═══════════════════════════════════════╗\n║ 🔧 AVAILABLE SECURITY TOOLS ║\n╚═══════════════════════════════════════╝\n\n${bulletList}\n└─ ✨ Total: ${SUPPORTED_TOOLS.length} tools siap dijalankan`
    );
  }, [addMessage]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isScanning) return;

      const raw = inputValue.trim();
      if (!raw) {
        return;
      }

      const parsed = parseUserInput(raw);
      addMessage('user', `🎯 Scan target: ${parsed.target}`);
      if (parsed.requestedTools) {
        const supported = parsed.requestedTools.filter((tool) => SUPPORTED_TOOLS.includes(tool));
        const unsupported = parsed.requestedTools.filter((tool) => !SUPPORTED_TOOLS.includes(tool));
        if (supported.length) {
          addMessage('user', `🔧 Tools siap jalan: ${supported.map((tool) => tool.toUpperCase()).join(', ')}`);
        }
        if (unsupported.length) {
          addMessage('assistant', `⚠️ ${unsupported.map((tool) => tool.toUpperCase()).join(', ')} belum tersedia di server. Jaeger akan memilih pengganti otomatis.`);
        }
      }
      addMessage('user', `📊 Mode: ${workflow}`);

      setInputValue('');
      await startScan(parsed.target, workflow, parsed.requestedTools || undefined);
    },
    [addMessage, inputValue, isScanning, workflow]
  );

  const startScan = useCallback(
    async (target, currentWorkflow, requestedTools) => {
      setIsScanning(true);
      const loadingId = addMessage(
        'assistant',
        '🚀 Jaeger AI is analyzing your target...\n⚙️ Preparing security tools<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>'
      );

      const workflowConfig = WORKFLOW_OPTIONS.find((item) => item.id === currentWorkflow);
      let maxTools = workflowConfig?.maxTools ?? 5;

      try {
        const requestBody = {
          action: 'smart_scan',
          target,
          objective: currentWorkflow,
          max_tools: maxTools
        };

        if (requestedTools?.length) {
          requestBody.specific_tools = requestedTools;
          requestBody.max_tools = requestedTools.length;
        }

        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await res.json();
        removeMessage(loadingId);

        if (!data.success || !data.data) {
          addMessage('assistant', `❌ Scan failed: ${data.error || 'Unknown error'}`);
          return;
        }

        await displayScanResults(data.data, target, currentWorkflow);
        await analyzeScanWithLLM(data.data, target);
      } catch (error) {
        removeMessage(loadingId);
        addMessage('assistant', `⚠️ Error during scan: ${error.message}`);
      } finally {
        setIsScanning(false);
      }
    },
    [addMessage, removeMessage]
  );

  const displayScanResults = useCallback(
    async (payload, target, currentWorkflow) => {
      const scanResults = payload.scan_results || payload;
      const toolsExecuted = scanResults.tools_executed || [];
      const executionSummary = scanResults.execution_summary || {};
      const totalVulns = scanResults.total_vulnerabilities || 0;
      const unsupportedTools = Array.isArray(scanResults.unsupported_tools) ? scanResults.unsupported_tools : [];
      const recommendedAlternatives = Array.isArray(scanResults.recommended_alternatives)
        ? scanResults.recommended_alternatives
        : [];

      const workflowEmoji = {
        quick: '⚡',
        reconnaissance: '🔍',
        vulnerability_hunting: '🎯',
        osint: '🕵️',
        comprehensive: '🚀'
      }[currentWorkflow] || '🔬';

      let severityEmoji = '✅';
      if (totalVulns > 10) severityEmoji = '🔴';
      else if (totalVulns > 5) severityEmoji = '🟠';
      else if (totalVulns > 0) severityEmoji = '🟡';

      let report = `
╔════════════════════════════════════════╗
║   📊 JAEGER AI - SCAN COMPLETE   ║
╚════════════════════════════════════════╝

🎯 **Target Domain**: \`${target}\`
${workflowEmoji} **Scan Mode**: \`${currentWorkflow.toUpperCase()}\`
🛠️ **Tools Executed**: **${toolsExecuted.length}** security tools
⏱️ **Total Runtime**: **${executionSummary.total_execution_time || 'N/A'}s**
${severityEmoji} **Security Findings**: **${totalVulns}** potential issues

💡 **Status**: ${totalVulns === 0 ? '✅ No critical issues found' : `⚠️ ${totalVulns} findings require review`}

${
        unsupportedTools.length
          ? `⚠️ **Skipped Tools**: ${unsupportedTools.map((tool) => tool.toUpperCase()).join(', ')} (tidak tersedia di server)`
          : ''
      }
${
        recommendedAlternatives.length
          ? `✅ **Pengganti Otomatis**: ${recommendedAlternatives
              .map((tool) => tool.toUpperCase())
              .join(', ')}`
          : ''
      }

═══════════════════════════════════════
## 🔧 **Detailed Tool Execution Report**
`;

      if (toolsExecuted.length > 0) {
        toolsExecuted.forEach((tool, index) => {
          const toolName = (tool.tool || 'unknown').toUpperCase();
          const isSuccess = tool.success !== false && tool.status !== 'failed';
          const status = isSuccess ? '✅ SUCCESS' : '❌ FAILED';
          const executionTime = tool.execution_time ? `${Math.round(tool.execution_time)}s` : 'N/A';

          const toolEmoji = {
            NMAP: '🔍',
            SUBFINDER: '🌐',
            HTTPX: '📡',
            NUCLEI: '💣',
            FFUF: '🔨',
            SQLMAP: '💉',
            NIKTO: '🔎',
            WPSCAN: '📝',
            GOBUSTER: '🚪',
            DALFOX: '🦊'
          }[toolName] || '🔧';

          report += `\n${toolEmoji} **Tool #${index + 1}: ${toolName}**\n`;
          report += `├─ 📊 Status: **${status}**\n`;
          report += `├─ ⏱️ Duration: **${executionTime}**\n`;

          if (tool.command) {
            const shortCmd = tool.command.length > 80 ? `${tool.command.substring(0, 80)}...` : tool.command;
            report += `└─ 💻 Command: \`${shortCmd}\`\n`;
          }

          if (tool.stdout && tool.stdout.trim()) {
            const highlights = extractHighlights(tool.stdout, 10);
            if (highlights) {
              report += `\n📄 **Output Highlights:**\n\`\`\`\n${highlights}\n\`\`\`\n`;
            }
          }

          if (tool.vulnerabilities_found && tool.vulnerabilities_found > 0) {
            report += `\n🚨 **Vulnerabilities Found**: **${tool.vulnerabilities_found}**\n`;
          }

          if (tool.error && tool.error.trim()) {
            report += `\n❗ **Error**: \`${tool.error.substring(0, 150)}...\`\n`;
          }

          report += '\n';
        });
      } else {
        report += '\n⚠️ **No tools were executed**. This might indicate a configuration issue.\n';
      }

      report += `
═══════════════════════════════════════
✨ **SCAN COMPLETE** ✨

${
        totalVulns > 0
          ? '🔍 **Next Steps:**\n   • Review findings above\n   • Verify vulnerabilities\n   • Apply recommended fixes\n   • Run deeper scans if needed'
          : '🎉 **Great News!**\n   No immediate security concerns detected.\n   Continue monitoring for new threats.'
      }

═══════════════════════════════════════

📚 **Report Generated By:**
**JAEGER AI, Your Cyber Security Partner**
🤖 Powered by Advanced AI Security Intelligence
`;

      addMessage('assistant', report.trim());
    },
    [addMessage]
  );

  const analyzeScanWithLLM = useCallback(
    async (payload, target) => {
      const scanResults = payload.scan_results || payload;
      const toolsExecuted = scanResults.tools_executed || [];
      const totalVulns = scanResults.total_vulnerabilities || 0;
      const unsupportedTools = Array.isArray(scanResults.unsupported_tools) ? scanResults.unsupported_tools : [];
      const recommendedAlternatives = Array.isArray(scanResults.recommended_alternatives)
        ? scanResults.recommended_alternatives
        : [];
      const executionSummary = scanResults.execution_summary || {};
      const combinedOutput = typeof scanResults.combined_output === 'string'
        ? scanResults.combined_output.slice(0, 6000)
        : '';

      const compactData = {
        target,
        total_vulnerabilities: totalVulns,
        tools: toolsExecuted.slice(0, 8).map((tool) => ({
          tool: tool.tool,
          success: tool.success,
          highlights: tool.stdout ? tool.stdout.substring(0, 600) : '',
          vulnerabilities_found: tool.vulnerabilities_found || 0
        })),
        execution_summary: executionSummary,
        unsupported_tools: unsupportedTools,
        recommended_alternatives: recommendedAlternatives,
        available_tools: Array.isArray(scanResults.available_tools) && scanResults.available_tools.length
          ? scanResults.available_tools
          : SUPPORTED_TOOLS,
        combined_output: combinedOutput
      };

      const loadingId = addMessage(
        'assistant',
        '🧠 **AI Analyzing Results...**\n\n🔍 Jaeger AI sedang menganalisis hasil scan dengan teknologi LLM...\n⏳ Please wait, this may take 10-30 seconds<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>'
      );

      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'llm_analyze',
            scan_results: compactData,
            target
          })
        });

        const data = await res.json();
        removeMessage(loadingId);

        if (!data.success) {
          throw new Error(data.error || 'LLM analysis failed');
        }

        const analysisText = data.analysis || '';
        if (analysisText) {
          addMessage('assistant', `╔═══════════════════════════════════════╗\n║  🧠 AI SECURITY ANALYSIS  ║\n╚═══════════════════════════════════════╝\n\n${analysisText}`);
        } else {
          throw new Error('Empty AI response');
        }
      } catch (error) {
        removeMessage(loadingId);
        addMessage(
          'assistant',
          `⚠️ **AI Analysis Unavailable**\n\nThe AI analysis could not be generated at this time.\nError: ${error.message}\n\nPlease review the scan results above for security findings.`
        );
      }
    },
    [addMessage, removeMessage]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event);
      }
    },
    [handleSubmit]
  );

  const welcomeVisible = messages.length === 0;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src="/jaeger-logo.png" alt="JAEGER AI" className="logo-image" />
            <span className="logo-text">JAEGER AI</span>
          </div>
          <div className="version">v5.0</div>
        </div>

        <div className="sidebar-content">
          <div className="menu-section">
            <div className="menu-title">Quick Actions</div>
            {WORKFLOW_OPTIONS.slice(0, 4).map((item) => (
              <button
                key={item.id}
                className={`menu-item ${workflow === item.id ? 'active' : ''}`}
                onClick={() => setWorkflow(item.id)}
              >
                <span className="item-icon">{item.icon}</span>
                <span className="item-text">{item.title}</span>
              </button>
            ))}
          </div>

          <div className="menu-section">
            <div className="menu-title">Tools</div>
            <button className="menu-item" onClick={checkStatus}>
              <span className="item-icon">💚</span>
              <span className="item-text">Server Status</span>
            </button>
            <button className="menu-item" onClick={showTools}>
              <span className="item-icon">🔧</span>
              <span className="item-text">Available Tools</span>
            </button>
            <button className="menu-item" onClick={clearConversation}>
              <span className="item-icon">🗑️</span>
              <span className="item-text">Clear Chat</span>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="status-indicator" id="serverStatus">
            <span className={`status-dot ${status.state}`}></span>
            <span className="status-text">{status.label}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="chat-container" id="chatContainer">
          {welcomeVisible && (
            <div className="welcome-message">
              <h1>🤖 Welcome to JAEGER AI</h1>
              <p>Your intelligent penetration testing assistant powered by 150+ security tools</p>
              <div className="feature-cards">
                <div className="feature-card">
                  <div className="feature-icon">🎯</div>
                  <div className="feature-title">Smart Target Analysis</div>
                  <div className="feature-desc">AI-powered target profiling and risk assessment</div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔧</div>
                  <div className="feature-title">Auto Tool Selection</div>
                  <div className="feature-desc">Intelligent tool selection based on target type</div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📊</div>
                  <div className="feature-title">Comprehensive Reports</div>
                  <div className="feature-desc">Detailed vulnerability reports with recommendations</div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message message-${message.role}`}>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-icon">{message.role === 'user' ? '👤' : '🤖'}</span>
                  <span>{message.role === 'user' ? 'You' : 'JAEGER AI'}</span>
                </div>
                <div className="message-text" dangerouslySetInnerHTML={{ __html: message.html }} />
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-container">
          <form id="scanForm" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <textarea
                id="targetInput"
                placeholder="Enter target domain or IP (e.g., example.com or 192.168.1.1)"
                rows={1}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isScanning}
              />
              <button type="submit" id="submitButton" className="submit-btn" disabled={isScanning}>
                <span className="submit-icon">{isScanning ? '⏳' : '🚀'}</span>
                <span className="submit-text">{isScanning ? 'Scanning...' : 'Scan'}</span>
              </button>
            </div>
            <div className="input-footer">
              <div className="workflow-selector">
                <span className="workflow-label">Mode:</span>
                <select
                  id="workflowSelect"
                  value={workflow}
                  onChange={(event) => setWorkflow(event.target.value)}
                  disabled={isScanning}
                >
                  {WORKFLOW_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.icon} {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
