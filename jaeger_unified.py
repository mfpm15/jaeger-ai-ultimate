#!/usr/bin/env python3
"""
JAEGER AI - Unified Service Manager v4.1
=====================================
Runs ALL services in ONE process:
- Jaeger MCP Server (Python Flask)
- Telegram Bot (Node.js subprocess)
- Web Interface (PHP subprocess)

Features:
- Single command startup: python3 jaeger_unified.py
- Automatic dependency check
- Graceful shutdown
- Log aggregation
- Health monitoring

Usage:
    python3 jaeger_unified.py [options]

Options:
    --no-telegram    Skip Telegram bot
    --no-web         Skip web interface
    --mcp-only       Run only MCP server
"""

import os
import sys
import time
import signal
import subprocess
import threading
import json
from pathlib import Path
from datetime import datetime

# Colors for console output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

# Configuration
PROJECT_ROOT = Path(__file__).parent
MCP_SERVER_SCRIPT = PROJECT_ROOT / 'jaeger-ai-core' / 'jaeger_server.py'
TELEGRAM_BOT_SCRIPT = PROJECT_ROOT / 'jaeger-telegram-bot.js'
WEB_INTERFACE_DIR = PROJECT_ROOT / 'web-interface'
PYTHON_VENV = PROJECT_ROOT / 'jaeger-ai-core' / 'jaeger-env'

# Process tracking
processes = {}
running = True

def log(level, service, message):
    """Unified logging"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    colors = {
        'INFO': Colors.CYAN,
        'SUCCESS': Colors.GREEN,
        'WARNING': Colors.YELLOW,
        'ERROR': Colors.RED
    }
    color = colors.get(level, Colors.RESET)
    print(f"{Colors.BOLD}[{timestamp}]{Colors.RESET} {color}[{level}]{Colors.RESET} {Colors.MAGENTA}[{service}]{Colors.RESET} {message}")

def check_dependencies():
    """Check if all dependencies are installed"""
    log('INFO', 'SYSTEM', 'Checking dependencies...')

    issues = []

    # Check Python venv
    if not PYTHON_VENV.exists():
        issues.append('Python virtual environment not found at jaeger-ai-core/jaeger-env')

    # Check MCP server script
    if not MCP_SERVER_SCRIPT.exists():
        issues.append(f'MCP server script not found: {MCP_SERVER_SCRIPT}')

    # Check if Node.js is installed
    try:
        subprocess.run(['node', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        issues.append('Node.js not installed (required for Telegram bot)')

    # Check if PHP is installed
    try:
        subprocess.run(['php', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        issues.append('PHP not installed (required for web interface)')

    # Check .env file
    env_file = PROJECT_ROOT / '.env'
    if not env_file.exists():
        log('WARNING', 'SYSTEM', '.env file not found - Telegram bot may not work')

    if issues:
        log('ERROR', 'SYSTEM', 'Dependency check failed:')
        for issue in issues:
            print(f'  {Colors.RED}✗{Colors.RESET} {issue}')
        return False

    log('SUCCESS', 'SYSTEM', 'All dependencies OK!')
    return True

def start_mcp_server():
    """Start Jaeger MCP Server"""
    log('INFO', 'MCP', 'Starting Jaeger MCP Server...')

    python_bin = PYTHON_VENV / 'bin' / 'python3'

    try:
        proc = subprocess.Popen(
            [str(python_bin), str(MCP_SERVER_SCRIPT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        processes['mcp'] = proc
        log('SUCCESS', 'MCP', f'Started with PID {proc.pid}')

        # Start log streaming thread
        threading.Thread(target=stream_logs, args=('MCP', proc), daemon=True).start()

        # Wait for server to be ready
        time.sleep(8)

        # Health check
        import urllib.request
        try:
            with urllib.request.urlopen('http://127.0.0.1:8888/health', timeout=5) as response:
                if response.status == 200:
                    log('SUCCESS', 'MCP', 'Server is healthy and ready!')
                    return True
        except Exception as e:
            log('WARNING', 'MCP', f'Health check failed: {e}')

        return True

    except Exception as e:
        log('ERROR', 'MCP', f'Failed to start: {e}')
        return False

def start_telegram_bot():
    """Start Telegram Bot"""
    log('INFO', 'TELEGRAM', 'Starting Telegram Bot...')

    # Check if BOT_TOKEN is in .env
    env_file = PROJECT_ROOT / '.env'
    if env_file.exists():
        with open(env_file) as f:
            if 'BOT_TOKEN' not in f.read():
                log('WARNING', 'TELEGRAM', 'BOT_TOKEN not found in .env - skipping')
                return False
    else:
        log('WARNING', 'TELEGRAM', '.env file not found - skipping')
        return False

    try:
        proc = subprocess.Popen(
            ['node', str(TELEGRAM_BOT_SCRIPT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(PROJECT_ROOT)
        )

        processes['telegram'] = proc
        log('SUCCESS', 'TELEGRAM', f'Started with PID {proc.pid}')

        # Start log streaming thread
        threading.Thread(target=stream_logs, args=('TELEGRAM', proc), daemon=True).start()

        time.sleep(3)
        return True

    except Exception as e:
        log('ERROR', 'TELEGRAM', f'Failed to start: {e}')
        return False

def start_web_interface():
    """Start Web Interface"""
    log('INFO', 'WEB', 'Starting Web Interface...')

    try:
        proc = subprocess.Popen(
            ['php', '-S', 'localhost:8080'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(WEB_INTERFACE_DIR)
        )

        processes['web'] = proc
        log('SUCCESS', 'WEB', f'Started with PID {proc.pid}')

        # Start log streaming thread
        threading.Thread(target=stream_logs, args=('WEB', proc), daemon=True).start()

        time.sleep(2)
        return True

    except Exception as e:
        log('ERROR', 'WEB', f'Failed to start: {e}')
        return False

def stream_logs(service, process):
    """Stream logs from subprocess"""
    for line in process.stdout:
        line = line.rstrip()
        if line:
            # Filter out noise
            if 'deprecation' in line.lower() or 'warning' in line.lower():
                continue
            print(f"  {Colors.MAGENTA}[{service}]{Colors.RESET} {line}")

def monitor_processes():
    """Monitor running processes"""
    while running:
        time.sleep(10)
        for name, proc in list(processes.items()):
            if proc.poll() is not None:
                log('ERROR', name.upper(), f'Process died unexpectedly! Exit code: {proc.poll()}')
                # Could implement auto-restart here


def shutdown(signum=None, frame=None):
    """Graceful shutdown"""
    global running
    running = False

    print()  # New line
    log('INFO', 'SYSTEM', 'Shutting down all services...')

    # Stop processes in reverse order
    for name in ['web', 'telegram', 'mcp']:
        if name in processes:
            proc = processes[name]
            log('INFO', name.upper(), f'Stopping (PID {proc.pid})...')
            try:
                proc.terminate()
                proc.wait(timeout=5)
                log('SUCCESS', name.upper(), 'Stopped')
            except subprocess.TimeoutExpired:
                log('WARNING', name.upper(), 'Force killing...')
                proc.kill()
            except Exception as e:
                log('ERROR', name.upper(), f'Error stopping: {e}')

    log('SUCCESS', 'SYSTEM', 'All services stopped')
    sys.exit(0)

def print_banner():
    """Print startup banner"""
    banner = f"""
{Colors.CYAN}╔═══════════════════════════════════════════════════════╗
║     JAEGER AI - Unified Service Manager v4.1         ║
║                                                       ║
║  🎯 MCP Server     → http://127.0.0.1:8888           ║
║  🤖 Telegram Bot   → Polling mode                    ║
║  🌐 Web Interface  → http://localhost:8080           ║
╚═══════════════════════════════════════════════════════╝{Colors.RESET}
"""
    print(banner)

def print_summary():
    """Print service status summary"""
    print()
    log('INFO', 'SYSTEM', '═' * 50)
    log('SUCCESS', 'SYSTEM', 'All services started successfully!')
    log('INFO', 'SYSTEM', '═' * 50)
    print()

    print(f"{Colors.CYAN}📊 Service Status:{Colors.RESET}")
    for name, proc in processes.items():
        status = f"{Colors.GREEN}✅ Running{Colors.RESET}" if proc.poll() is None else f"{Colors.RED}❌ Stopped{Colors.RESET}"
        print(f"   {Colors.MAGENTA}•{Colors.RESET} {name.upper():12} {status} (PID: {proc.pid})")

    print()
    print(f"{Colors.CYAN}🔗 Access Points:{Colors.RESET}")
    print(f"   {Colors.GREEN}•{Colors.RESET} Web UI:  {Colors.CYAN}http://localhost:8080{Colors.RESET}")
    print(f"   {Colors.GREEN}•{Colors.RESET} API:     {Colors.CYAN}http://127.0.0.1:8888/health{Colors.RESET}")
    if 'telegram' in processes:
        print(f"   {Colors.GREEN}•{Colors.RESET} Telegram: {Colors.CYAN}Send /start to your bot{Colors.RESET}")

    print()
    print(f"{Colors.YELLOW}💡 Press Ctrl+C to stop all services{Colors.RESET}")
    print()

def main():
    """Main entry point"""
    # Parse arguments
    skip_telegram = '--no-telegram' in sys.argv
    skip_web = '--no-web' in sys.argv
    mcp_only = '--mcp-only' in sys.argv

    # Setup signal handlers
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Print banner
    print_banner()

    # Check dependencies
    if not check_dependencies():
        log('ERROR', 'SYSTEM', 'Please fix dependency issues before starting')
        sys.exit(1)

    print()
    log('INFO', 'SYSTEM', 'Starting services...')
    print()

    # Start MCP Server (required)
    if not start_mcp_server():
        log('ERROR', 'SYSTEM', 'Failed to start MCP server - aborting')
        sys.exit(1)

    # Start Telegram Bot (optional)
    if not skip_telegram and not mcp_only:
        if not start_telegram_bot():
            log('WARNING', 'SYSTEM', 'Telegram bot not started (continuing...)')

    # Start Web Interface (optional)
    if not skip_web and not mcp_only:
        if not start_web_interface():
            log('WARNING', 'SYSTEM', 'Web interface not started (continuing...)')

    # Print summary
    print_summary()

    # Start monitoring
    monitor_thread = threading.Thread(target=monitor_processes, daemon=True)
    monitor_thread.start()

    # Keep main thread alive
    try:
        while running:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()

if __name__ == '__main__':
    main()
