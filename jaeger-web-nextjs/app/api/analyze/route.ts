import { NextResponse } from 'next/server';

// LLM Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function POST(request: Request) {
  try {
    const { result, target } = await request.json();

    if (!result || !target) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }

    // Build analysis payload
    const toolsExecuted = result.tools_executed || [];
    const totalVulns = result.total_vulnerabilities || 0;
    const executionTime = result.execution_summary?.total_execution_time || 0;

    const toolSummaries = toolsExecuted.map((tool: any) => ({
      tool: tool.tool,
      status: tool.status,
      success: tool.success,
      execution_time: tool.execution_time,
      vulnerabilities_found: tool.vulnerabilities_found,
      highlights: extractHighlights(tool.stdout, 10),
    }));

    // Create prompt for LLM
    const prompt = `Analyze the following security scan results for target: ${target}

Total Vulnerabilities Found: ${totalVulns}
Total Tools Executed: ${toolsExecuted.length}
Execution Time: ${executionTime}s

Tools Executed:
${JSON.stringify(toolSummaries, null, 2)}

Please provide:
1. Executive Summary (brief overview)
2. Key Findings (most important vulnerabilities/issues)
3. Risk Assessment (severity levels)
4. Recommendations (actionable steps)
5. Next Steps (what to do next)

Format your response in markdown with appropriate emoji for readability.
Use Indonesian language if the scan shows Indonesian context, otherwise use English.
Keep the response concise and actionable.`;

    // Call Gemini API
    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        analysis: generateFallbackAnalysis(result, target),
      });
    }

    const geminiResponse = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text());
      return NextResponse.json({
        success: true,
        analysis: generateFallbackAnalysis(result, target),
      });
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      return NextResponse.json({
        success: true,
        analysis: generateFallbackAnalysis(result, target),
      });
    }

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error: any) {
    console.error('Analysis API error:', error);
    
    // Return fallback analysis on error
    const { result, target } = await request.json().catch(() => ({ result: {}, target: 'unknown' }));
    
    return NextResponse.json({
      success: true,
      analysis: generateFallbackAnalysis(result, target),
    });
  }
}

function extractHighlights(text: string, maxLines: number = 10): string {
  if (!text) return '';

  const keywords = ['critical', 'high', 'medium', 'vulnerability', 'found', 'open', 'port'];
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('::'));

  const keywordMatches = lines.filter(line => {
    const lower = line.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword));
  });

  if (keywordMatches.length > 0) {
    return keywordMatches.slice(0, maxLines).join('\n');
  }

  return lines.slice(0, Math.min(lines.length, 5)).join('\n');
}

function generateFallbackAnalysis(result: any, target: string): string {
  const toolsExecuted = result.tools_executed || [];
  const totalVulns = result.total_vulnerabilities || 0;
  const successfulTools = toolsExecuted.filter((t: any) => t.success !== false);

  let severityLevel = 'Low';
  let severityEmoji = '✅';
  
  if (totalVulns > 10) {
    severityLevel = 'Critical';
    severityEmoji = '🔴';
  } else if (totalVulns > 5) {
    severityLevel = 'High';
    severityEmoji = '🟠';
  } else if (totalVulns > 0) {
    severityLevel = 'Medium';
    severityEmoji = '🟡';
  }

  return `
## 📊 **Executive Summary**

${severityEmoji} **Overall Risk Level**: **${severityLevel}**

Target \`${target}\` was scanned using **${toolsExecuted.length}** security tools. The scan completed with **${successfulTools.length}** successful tool executions and identified **${totalVulns}** potential security findings.

---

## 🔍 **Key Findings**

${totalVulns > 0 ? `
⚠️ **${totalVulns} Security Issues Detected**
- Review detailed tool outputs above for specific vulnerabilities
- Focus on findings from tools like Nuclei, Nmap, and WPScan
- Verify each finding before taking action
` : `
✅ **No Critical Issues Found**
- All security tools completed successfully
- No immediate vulnerabilities detected
- Continue regular monitoring
`}

---

## 🎯 **Risk Assessment**

**Severity Distribution:**
${totalVulns > 10 ? '🔴 Critical - Immediate attention required' : totalVulns > 5 ? '🟠 High - Address within 24 hours' : totalVulns > 0 ? '🟡 Medium - Address within a week' : '✅ Low - No immediate action needed'}

**Tool Coverage:**
- Network scanning: ${toolsExecuted.some((t: any) => ['nmap', 'masscan', 'rustscan'].includes(t.tool)) ? '✅' : '❌'}
- Web security: ${toolsExecuted.some((t: any) => ['nuclei', 'nikto', 'wpscan'].includes(t.tool)) ? '✅' : '❌'}
- OSINT gathering: ${toolsExecuted.some((t: any) => ['subfinder', 'amass', 'theharvester'].includes(t.tool)) ? '✅' : '❌'}

---

## 💡 **Recommendations**

${totalVulns > 0 ? `
1. **Immediate Actions:**
   - Review all identified vulnerabilities above
   - Verify findings to eliminate false positives
   - Prioritize based on severity and exploitability

2. **Short-term Actions:**
   - Patch vulnerable services and applications
   - Update outdated software versions
   - Implement security best practices

3. **Long-term Actions:**
   - Establish regular security scanning schedule
   - Implement security monitoring and alerting
   - Conduct security awareness training
` : `
1. **Maintain Current Security Posture:**
   - Continue regular security assessments
   - Monitor for new vulnerabilities
   - Keep systems updated

2. **Enhance Security:**
   - Consider deeper penetration testing
   - Implement additional security controls
   - Review and update security policies
`}

---

## 🚀 **Next Steps**

${totalVulns > 0 ? `
1. ⚠️ Validate all ${totalVulns} findings
2. 🔧 Apply security patches and updates
3. 🔄 Re-scan after remediation
4. 📊 Document findings and actions taken
5. 🎯 Run deeper scans if needed
` : `
1. ✅ No immediate action required
2. 📅 Schedule next security scan
3. 📊 Review security monitoring logs
4. 🔄 Continue regular assessments
`}

---

**📚 Report Generated By:**
**JAEGER AI, Your Cyber Security Partner**
🤖 Powered by AI Security Intelligence

*Note: This is an automated analysis. For critical systems, consult with security professionals.*
`;
}
