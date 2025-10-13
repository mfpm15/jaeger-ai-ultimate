<?php
/**
 * JAEGER AI - Web Interface Configuration
 *
 * Configuration file for PHP web interface
 */

// Jaeger MCP Server Configuration
define('JAEGER_API_BASE_URL', 'http://127.0.0.1:8888');
define('JAEGER_API_TIMEOUT', 180); // 3 minutes - faster response

// Session Configuration
define('SESSION_LIFETIME', 3600); // 1 hour
define('SESSION_NAME', 'jaeger_web_session');

// Security Settings
define('CSRF_TOKEN_NAME', 'jaeger_csrf_token');
define('MAX_REQUEST_SIZE', 10485760); // 10MB

// Database Configuration (optional - for session storage)
define('DB_ENABLED', false);
define('DB_HOST', 'localhost');
define('DB_NAME', 'jaeger_web');
define('DB_USER', 'root');
define('DB_PASS', '');

// Logging
define('LOG_FILE', __DIR__ . '/../logs/jaeger-web.log');
define('LOG_LEVEL', 'INFO'); // DEBUG, INFO, WARNING, ERROR

// User Authentication (optional)
define('AUTH_ENABLED', false);
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD', password_hash('jaeger2025', PASSWORD_BCRYPT));

// API Endpoints
$JAEGER_ENDPOINTS = [
    'health' => JAEGER_API_BASE_URL . '/health',
    'analyze_target' => JAEGER_API_BASE_URL . '/api/intelligence/analyze-target',
    'select_tools' => JAEGER_API_BASE_URL . '/api/intelligence/select-tools',
    'smart_scan' => JAEGER_API_BASE_URL . '/api/intelligence/smart-scan',
    'tech_detection' => JAEGER_API_BASE_URL . '/api/intelligence/technology-detection',
    'recon_workflow' => JAEGER_API_BASE_URL . '/api/bugbounty/reconnaissance-workflow',
    'vuln_workflow' => JAEGER_API_BASE_URL . '/api/bugbounty/vulnerability-hunting-workflow',
    'osint_workflow' => JAEGER_API_BASE_URL . '/api/bugbounty/osint-workflow',
];

// Error Reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php-errors.log');

// Timezone
date_default_timezone_set('Asia/Jakarta');

// Helper Functions
function log_message($level, $message) {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] [$level] $message" . PHP_EOL;

    $log_dir = dirname(LOG_FILE);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    error_log($log_entry, 3, LOG_FILE);
}

function generate_csrf_token() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }

    return $_SESSION[CSRF_TOKEN_NAME];
}

function verify_csrf_token($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

// Initialize session
session_name(SESSION_NAME);
session_start();

// Create logs directory if not exists
$log_dir = __DIR__ . '/../logs';
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0755, true);
}
