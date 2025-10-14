#!/usr/bin/env node

/**
 * LLM Analyzer CLI - Wrapper for web interface
 *
 * Usage: node llm-analyzer-cli.js analyze <target> <json_scan_results>
 */

// Load environment variables from .env file
require('dotenv').config({ path: __dirname + '/.env' });

const LLMAnalyzer = require('./llm-analyzer.js');

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3 || args[0] !== 'analyze') {
        console.error('Usage: node llm-analyzer-cli.js analyze <target> <json_scan_results>');
        process.exit(1);
    }

    const target = args[1];
    const scanResultsJson = args[2];

    try {
        const scanResults = JSON.parse(scanResultsJson);

        // Initialize LLM Analyzer with OpenRouter/DeepSeek
        const analyzer = new LLMAnalyzer({
            maxTokens: 8000
        });

        // Analyze scan results
        console.log('ANALYSIS_START');
        const analysis = await analyzer.analyzeScanResults(scanResults, target);

        // Clean up the response - remove "Berikut adalah..." and similar phrases
        let cleanedAnalysis = analysis
            .replace(/^Berikut adalah.*?\n+/gmi, '')
            .replace(/^Berikut laporan.*?\n+/gmi, '')
            .replace(/^Berikut ini adalah.*?\n+/gmi, '')
            .replace(/^Berikut hasil.*?\n+/gmi, '')
            .trim();

        console.log(cleanedAnalysis);
        console.log('ANALYSIS_END');

        process.exit(0);
    } catch (error) {
        console.error('Error during LLM analysis:', error.message);
        process.exit(1);
    }
}

main();
