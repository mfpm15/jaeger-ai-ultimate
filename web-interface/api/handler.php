<?php
/**
 * JAEGER AI - Web API Handler (IMPROVED v4.1)
 *
 * Backend API handler untuk communicate dengan Jaeger MCP Server
 * - Fixed: PHP curl dependency removed (uses file_get_contents as primary)
 * - Improved: Better error handling and logging
 * - Enhanced: Connection timeout handling
 */

require_once __DIR__ . '/../includes/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Send request to Jaeger MCP Server - NOW CURL-FREE!
 * Uses file_get_contents as primary method (no curl dependency needed)
 */
function send_jaeger_request($endpoint, $data = [], $method = 'POST') {
    global $JAEGER_ENDPOINTS;

    $url = $JAEGER_ENDPOINTS[$endpoint] ?? null;
    if (!$url) {
        log_message('ERROR', "Invalid endpoint requested: $endpoint");
        return ['success' => false, 'error' => 'Invalid endpoint'];
    }

    log_message('INFO', "Sending $method request to Jaeger MCP: $endpoint");

    // Primary method: file_get_contents (works without curl extension!)
    try {
        $context_options = [
            'http' => [
                'method' => $method,
                'header' => "Content-Type: application/json\r\nConnection: close\r\n",
                'timeout' => JAEGER_API_TIMEOUT,
                'ignore_errors' => true
            ]
        ];

        if ($method === 'POST' && !empty($data)) {
            $json_data = json_encode($data);
            $context_options['http']['content'] = $json_data;
            $context_options['http']['header'] .= "Content-Length: " . strlen($json_data) . "\r\n";
            log_message('DEBUG', "Request payload: " . substr($json_data, 0, 200));
        }

        $context = stream_context_create($context_options);

        // Suppress warnings and capture them in error handler
        set_error_handler(function($errno, $errstr) {
            log_message('WARNING', "HTTP request warning: $errstr");
        });

        $response = file_get_contents($url, false, $context);

        restore_error_handler();

        if ($response === false) {
            $error = error_get_last();
            $error_msg = $error['message'] ?? 'Unknown connection error';
            log_message('ERROR', "Connection failed: $error_msg");

            // Check if server is likely down
            if (strpos($error_msg, 'Connection refused') !== false) {
                return [
                    'success' => false,
                    'error' => 'Jaeger MCP Server is offline. Please start: ./START_ALL.sh',
                    'details' => 'Connection refused - server not running'
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to connect to Jaeger server',
                'details' => $error_msg
            ];
        }

        // Parse HTTP response code
        $http_code = 200;
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                    $http_code = intval($matches[1]);
                    break;
                }
            }
        }

        log_message('DEBUG', "HTTP response code: $http_code");

        // Parse JSON response
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $json_error = json_last_error_msg();
            log_message('ERROR', "JSON decode error: $json_error. Response: " . substr($response, 0, 500));
            return [
                'success' => false,
                'error' => 'Invalid JSON response from server',
                'details' => $json_error,
                'raw_response' => substr($response, 0, 200)
            ];
        }

        // Check HTTP status
        if ($http_code !== 200) {
            $error_msg = $result['error'] ?? $result['message'] ?? 'Unknown error';
            log_message('ERROR', "HTTP $http_code: $error_msg");
            return [
                'success' => false,
                'error' => $error_msg,
                'http_code' => $http_code
            ];
        }

        log_message('INFO', "Request successful");
        return ['success' => true, 'data' => $result];

    } catch (Exception $e) {
        log_message('ERROR', "Request exception: " . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Request failed: ' . $e->getMessage(),
            'exception' => get_class($e)
        ];
    }
}

/**
 * Main request handler with improved error handling
 */
try {
    $request_body = file_get_contents('php://input');
    $request = json_decode($request_body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    if (!$request || empty($request['action'])) {
        throw new Exception('Missing action parameter');
    }
} catch (Exception $e) {
    log_message('ERROR', "Request parsing error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit;
}

$action = $request['action'];
log_message('INFO', "Processing action: $action");

switch ($action) {
    case 'health':
        $response = send_jaeger_request('health', [], 'GET');
        echo json_encode($response);
        break;

    case 'smart_scan':
        $target = $request['target'] ?? '';
        $objective = $request['objective'] ?? 'quick';
        $specific_tools = $request['specific_tools'] ?? [];
        $max_tools = $request['max_tools'] ?? 5;

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        // Validate target format
        $target = filter_var($target, FILTER_SANITIZE_STRING);

        $data = [
            'target' => $target,
            'objective' => $objective,
            'max_tools' => intval($max_tools),
            'context' => [
                'request_timeout' => 180,
                'retry_on_timeout' => true
            ]
        ];

        if (!empty($specific_tools) && is_array($specific_tools)) {
            $data['specific_tools'] = $specific_tools;
        }

        log_message('INFO', "Starting smart scan: $target (objective: $objective, max_tools: $max_tools)");
        $response = send_jaeger_request('smart_scan', $data);
        echo json_encode($response);
        break;

    case 'analyze_target':
        $target = $request['target'] ?? '';
        $analysis_type = $request['analysis_type'] ?? 'quick';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('analyze_target', [
            'target' => filter_var($target, FILTER_SANITIZE_STRING),
            'analysis_type' => $analysis_type
        ]);
        echo json_encode($response);
        break;

    case 'select_tools':
        $target = $request['target'] ?? '';
        $objective = $request['objective'] ?? 'quick';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('select_tools', [
            'target' => filter_var($target, FILTER_SANITIZE_STRING),
            'objective' => $objective
        ]);
        echo json_encode($response);
        break;

    case 'recon_workflow':
        $target = $request['target'] ?? '';
        $depth = $request['depth'] ?? 'standard';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('recon_workflow', [
            'domain' => filter_var($target, FILTER_SANITIZE_STRING),
            'depth' => $depth
        ]);
        echo json_encode($response);
        break;

    case 'vuln_workflow':
        $target = $request['target'] ?? '';
        $focus = $request['focus'] ?? 'all';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('vuln_workflow', [
            'domain' => filter_var($target, FILTER_SANITIZE_STRING),
            'focus' => $focus
        ]);
        echo json_encode($response);
        break;

    case 'osint_workflow':
        $target = $request['target'] ?? '';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('osint_workflow', [
            'domain' => filter_var($target, FILTER_SANITIZE_STRING)
        ]);
        echo json_encode($response);
        break;

    case 'tech_detection':
        $target = $request['target'] ?? '';

        if (empty($target)) {
            echo json_encode(['success' => false, 'error' => 'Target is required']);
            exit;
        }

        $response = send_jaeger_request('tech_detection', [
            'target' => filter_var($target, FILTER_SANITIZE_STRING)
        ]);
        echo json_encode($response);
        break;

    default:
        log_message('WARNING', "Invalid action requested: $action");
        echo json_encode([
            'success' => false,
            'error' => 'Invalid action',
            'available_actions' => ['health', 'smart_scan', 'analyze_target', 'select_tools', 'recon_workflow', 'vuln_workflow', 'osint_workflow', 'tech_detection']
        ]);
        break;
}
