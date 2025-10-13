# JAEGER AI - Web Interface

**PHP Native Web Interface** untuk JAEGER AI Penetration Testing Platform

## 🎯 Features

- **Claude-like UI**: Modern, responsive interface mirip Claude
- **Real-time Status**: Monitor Jaeger MCP server status
- **Multiple Scan Modes**: Quick, Reconnaissance, Vulnerability Hunting, OSINT, Comprehensive
- **Interactive Chat**: Chat-based interface untuk security testing
- **Tool Management**: View available tools dan execution results

## 📋 Requirements

- PHP 7.4+ dengan extension:
  - `php-curl`
  - `php-json`
  - `php-session`
- Web server (Apache/Nginx)
- Jaeger MCP Server running pada `http://127.0.0.1:8888`

## 🚀 Installation

### 1. Copy ke Web Server Directory

```bash
# Apache
sudo cp -r web-interface /var/www/html/jaeger

# Nginx
sudo cp -r web-interface /usr/share/nginx/html/jaeger
```

### 2. Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/html/jaeger
sudo chmod 755 /var/www/html/jaeger
sudo mkdir -p /var/www/html/jaeger/logs
sudo chmod 777 /var/www/html/jaeger/logs
```

### 3. Configure

Edit `includes/config.php` jika perlu mengubah:
- Jaeger MCP URL (default: `http://127.0.0.1:8888`)
- Timeout settings
- Security settings

## 🎮 Usage

### Start Jaeger MCP Server

```bash
cd /path/to/jaeger-ai
./start.sh
```

### Access Web Interface

```
http://localhost/jaeger
# atau
http://your-server-ip/jaeger
```

### Scan Target

1. Pilih scan mode dari sidebar atau dropdown
2. Enter target domain/IP di input box
3. Click "Scan" atau tekan Enter
4. Lihat hasil scan real-time di chat interface

## 📁 Directory Structure

```
web-interface/
├── index.php              # Main interface
├── api/
│   └── handler.php        # Backend API handler
├── assets/
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── app.js         # Frontend logic
├── includes/
│   └── config.php         # Configuration
└── logs/                  # Log files
```

## 🔧 API Endpoints

Backend PHP API (`api/handler.php`) mendukung:

- `health` - Check server status
- `smart_scan` - Intelligent scan dengan auto tool selection
- `analyze_target` - Analyze target profile
- `select_tools` - Get optimal tools untuk target
- `recon_workflow` - Reconnaissance workflow
- `vuln_workflow` - Vulnerability hunting workflow
- `osint_workflow` - OSINT workflow
- `tech_detection` - Technology detection

## 🎨 UI Features

### Sidebar Menu
- Quick Actions (Quick Scan, Recon, Vuln Hunt, OSINT)
- Tools (Server Status, Available Tools, Clear Chat)
- Real-time server status indicator

### Main Chat Interface
- Welcome screen dengan feature cards
- Message bubbles (user & assistant)
- Markdown-like formatting
- Code syntax highlighting
- Real-time scan progress

### Input Area
- Auto-resizing textarea
- Workflow selector dropdown
- Submit button dengan loading state
- Keyboard shortcuts (Enter to submit)

## ⚙️ Configuration

### Customize Timeout

Edit `includes/config.php`:
```php
define('JAEGER_API_TIMEOUT', 600); // 10 minutes
```

### Enable Authentication

Edit `includes/config.php`:
```php
define('AUTH_ENABLED', true);
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD', password_hash('your_password', PASSWORD_BCRYPT));
```

### Change Theme Colors

Edit `assets/css/style.css`:
```css
:root {
    --primary-bg: #1a1a1a;
    --accent-color: #ff6b6b;
    /* ... */
}
```

## 🐛 Troubleshooting

### Connection Error

```
⚠️ Failed to connect to Jaeger server
```
**Solution**: Pastikan Jaeger MCP server running:
```bash
curl http://127.0.0.1:8888/health
```

### PHP Errors

Check logs:
```bash
tail -f web-interface/logs/php-errors.log
tail -f web-interface/logs/jaeger-web.log
```

### Permissions Issue

```bash
sudo chown -R www-data:www-data /var/www/html/jaeger
sudo chmod -R 755 /var/www/html/jaeger
sudo chmod -R 777 /var/www/html/jaeger/logs
```

## 🔒 Security Notes

⚠️ **PENTING**:
- Jangan expose web interface ke public internet tanpa authentication
- Gunakan HTTPS untuk production
- Set strong password jika enable authentication
- Hanya test pada target yang authorized
- Review security settings di `includes/config.php`

## 📞 Support

- Issues: https://github.com/jaeger-ai/jaeger-ai/issues
- Documentation: `/jaeger-ai/README.md`

---

**JAEGER AI Web Interface** - *Security Testing Made Simple* 🎯
