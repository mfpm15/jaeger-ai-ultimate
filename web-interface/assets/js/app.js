/**
 * JAEGER AI - Web Interface JavaScript
 *
 * Frontend logic untuk web interface
 */

const API_ENDPOINT = 'api/handler.php';
let currentWorkflow = 'quick';
let isScanning = false;

/**
 * Check Jaeger MCP Server Status
 */
async function checkStatus() {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'health' })
        });

        const result = await response.json();

        const statusIndicator = document.getElementById('serverStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');

        if (result.success && result.data.status === 'healthy') {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Server Online';
            addMessage('assistant', '✅ Jaeger MCP Server is online and ready!');
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Server Offline';
            addMessage('assistant', '❌ Jaeger MCP Server is offline. Please start the server.');
        }
    } catch (error) {
        console.error('Status check failed:', error);
        const statusIndicator = document.getElementById('serverStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Connection Error';
        addMessage('assistant', `⚠️ Failed to connect to Jaeger server: ${error.message}`);
    }
}

/**
 * Auto check status every 30 seconds
 */
function autoCheckStatus() {
    setInterval(checkStatus, 30000);
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
    event.preventDefault();

    if (isScanning) {
        alert('A scan is already in progress. Please wait...');
        return;
    }

    const targetInput = document.getElementById('targetInput');
    const target = targetInput.value.trim();

    if (!target) {
        alert('Please enter a target domain or IP address');
        return;
    }

    // Add user message
    addMessage('user', `🎯 Scan target: ${target}`);
    addMessage('user', `📊 Mode: ${currentWorkflow}`);

    // Clear input
    targetInput.value = '';

    // Start scanning
    startScan(target, currentWorkflow);
}

/**
 * Start scan
 */
async function startScan(target, workflow) {
    isScanning = true;
    updateSubmitButton(true);

    // Add loading message
    const loadingId = addMessage('assistant', '⚙️ Jaeger is analyzing and scanning the target<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>');

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'smart_scan',
                target: target,
                objective: workflow,
                max_tools: 5
            })
        });

        const result = await response.json();

        // Remove loading message
        removeMessage(loadingId);

        if (result.success && result.data) {
            displayScanResults(result.data, target, workflow);
        } else {
            addMessage('assistant', `❌ Scan failed: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Scan error:', error);
        removeMessage(loadingId);
        addMessage('assistant', `⚠️ Error during scan: ${error.message}`);
    } finally {
        isScanning = false;
        updateSubmitButton(false);
    }
}

/**
 * Display scan results
 */
function displayScanResults(data, target, workflow) {
    const scanResults = data.scan_results || data;
    const toolsExecuted = scanResults.tools_executed || [];
    const executionSummary = scanResults.execution_summary || {};
    const totalVulns = scanResults.total_vulnerabilities || 0;

    // Summary
    let summaryMsg = `
📊 **JAEGER Execution Summary**

🎯 **Target**: \`${target}\`
🧭 **Mode**: \`${workflow}\`
🛠️ **Tools Executed**: ${toolsExecuted.length}
⏱️ **Runtime**: ${executionSummary.total_execution_time || 'N/A'}s
🚨 **Findings**: ${totalVulns} potential issues
    `;

    addMessage('assistant', summaryMsg.trim());

    // Tool outputs
    if (toolsExecuted.length > 0) {
        addMessage('assistant', '---\n### 🔧 Tool Execution Details\n');

        toolsExecuted.forEach((tool, index) => {
            const toolName = (tool.tool || 'unknown').toUpperCase();
            const status = tool.success === false || tool.status === 'failed' ? '❌ Failed' : '✅ Success';
            const executionTime = tool.execution_time ? `${Math.round(tool.execution_time)}s` : 'N/A';

            let toolMsg = `\n**${index + 1}. ${toolName}** — ${status}\n`;
            toolMsg += `⏱️ Duration: ${executionTime}\n`;

            if (tool.command) {
                toolMsg += `💻 Command: \`${tool.command}\`\n`;
            }

            if (tool.stdout && tool.stdout.trim()) {
                const output = extractHighlights(tool.stdout);
                if (output) {
                    toolMsg += `\n📄 Output:\n\`\`\`\n${output}\n\`\`\`\n`;
                }
            }

            if (tool.error && tool.error.trim()) {
                toolMsg += `\n❗ Error: \`${tool.error}\`\n`;
            }

            addMessage('assistant', toolMsg);
        });
    }

    // Final summary
    addMessage('assistant', '\n✅ **Scan completed!** Review the results above for detailed findings.');
}

/**
 * Extract highlights from output
 */
function extractHighlights(text, maxLines = 15) {
    if (!text) return '';

    const keywords = ['critical', 'high', 'medium', 'vulnerability', 'found', 'open', 'port', 'http', 'status', 'error', 'warning'];
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('::') && !/^Progress:\s*\d+/.test(line));

    const keywordMatches = lines.filter(line => {
        const lower = line.toLowerCase();
        return keywords.some(keyword => lower.includes(keyword));
    });

    if (keywordMatches.length > 0) {
        return keywordMatches.slice(0, maxLines).join('\n');
    }

    return lines.slice(0, Math.min(lines.length, 10)).join('\n');
}

/**
 * Add message to chat
 */
function addMessage(role, content) {
    const chatContainer = document.getElementById('chatContainer');

    // Remove welcome message if exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    messageDiv.className = `message message-${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.innerHTML = `
        <span class="message-icon">${role === 'user' ? '👤' : '🤖'}</span>
        <span>${role === 'user' ? 'You' : 'JAEGER AI'}</span>
    `;

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = formatMessage(content);

    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return messageId;
}

/**
 * Remove message from chat
 */
function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

/**
 * Format message content (markdown-like)
 */
function formatMessage(content) {
    // Escape HTML
    content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bold
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    content = content.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');

    // Inline code
    content = content.replace(/`(.+?)`/g, '<code>$1</code>');

    // Line breaks
    content = content.replace(/\n/g, '<br>');

    return content;
}

/**
 * Update submit button state
 */
function updateSubmitButton(disabled) {
    const submitBtn = document.getElementById('submitButton');
    const submitText = submitBtn.querySelector('.submit-text');

    if (disabled) {
        submitBtn.disabled = true;
        submitText.textContent = 'Scanning...';
    } else {
        submitBtn.disabled = false;
        submitText.textContent = 'Scan';
    }
}

/**
 * Set workflow
 */
function setWorkflow(workflow) {
    currentWorkflow = workflow;
    document.getElementById('workflow').value = workflow;
    document.getElementById('workflowSelect').value = workflow;
    addMessage('assistant', `📊 Workflow changed to: **${workflow}**`);
}

/**
 * Update workflow from select
 */
function updateWorkflow(workflow) {
    currentWorkflow = workflow;
    document.getElementById('workflow').value = workflow;
}

/**
 * Show available tools
 */
function showTools() {
    const toolsMsg = `
🔧 **JAEGER Available Tools (60+)**

**Network Scanning:**
nmap, masscan, rustscan, zmap

**Web Security:**
nuclei, nikto, gobuster, ffuf, dirsearch, dirb, wpscan

**Vulnerability Testing:**
sqlmap, dalfox, wfuzz, httpx

**OSINT:**
subfinder, amass, theharvester, sherlock, spiderfoot

**Exploitation:**
metasploit, msfvenom, hydra, medusa

**Forensics:**
autopsy, binwalk, exiftool, foremost

**Password:**
hashcat, john, ophcrack

**Cloud Security:**
trivy, nxc

And 40+ more tools!
    `;

    addMessage('assistant', toolsMsg.trim());
}

/**
 * Clear conversation
 */
function clearConversation() {
    if (confirm('Are you sure you want to clear the conversation?')) {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h1>🤖 Welcome to JAEGER AI</h1>
                <p>Your intelligent penetration testing assistant powered by 150+ security tools</p>
                <div class="feature-cards">
                    <div class="feature-card">
                        <div class="feature-icon">🎯</div>
                        <div class="feature-title">Smart Target Analysis</div>
                        <div class="feature-desc">AI-powered target profiling and risk assessment</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔧</div>
                        <div class="feature-title">Auto Tool Selection</div>
                        <div class="feature-desc">Intelligent tool selection based on target type</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <div class="feature-title">Comprehensive Reports</div>
                        <div class="feature-desc">Detailed vulnerability reports with recommendations</div>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * Handle Enter key in textarea
 */
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('scanForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
}
