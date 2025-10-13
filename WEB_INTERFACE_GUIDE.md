# 🌐 JAEGER AI - Web Interface Setup Guide

## Overview

JAEGER AI sekarang hadir dengan **2 Interface**:
1. **Telegram Bot** - Interface via Telegram (existing)
2. **Web Interface** - Interface via browser (NEW! PHP Native)

Kedua interface memiliki fitur yang sama dan terhubung ke Jaeger MCP Server yang sama.

---

## 🚀 Quick Start - Web Interface

### Prerequisites

- PHP 7.4+ dengan curl extension
- Apache atau Nginx web server
- Jaeger MCP Server harus running

### Option 1: PHP Built-in Server (Development)

Cara tercepat untuk testing:

```bash
cd /home/terrestrial/Desktop/jaeger-ai

# Start Jaeger MCP Server (terminal 1)
./start.sh

# Start PHP web server (terminal 2)
cd web-interface
php -S localhost:8080

# Open browser
# http://localhost:8080
```

### Option 2: Apache Web Server (Production)

```bash
# 1. Copy ke Apache directory
sudo cp -r web-interface /var/www/html/jaeger

# 2. Set permissions
sudo chown -R www-data:www-data /var/www/html/jaeger
sudo chmod 755 /var/www/html/jaeger
sudo mkdir -p /var/www/html/jaeger/logs
sudo chmod 777 /var/www/html/jaeger/logs

# 3. Enable Apache modules (if needed)
sudo a2enmod rewrite
sudo systemctl restart apache2

# 4. Access
# http://localhost/jaeger
# atau http://your-server-ip/jaeger
```

### Option 3: Nginx Web Server (Production)

```bash
# 1. Copy ke Nginx directory
sudo cp -r web-interface /usr/share/nginx/html/jaeger

# 2. Set permissions
sudo chown -R nginx:nginx /usr/share/nginx/html/jaeger
sudo chmod 755 /usr/share/nginx/html/jaeger
sudo mkdir -p /usr/share/nginx/html/jaeger/logs
sudo chmod 777 /usr/share/nginx/html/jaeger/logs

# 3. Configure Nginx (optional - edit /etc/nginx/sites-available/default)
location /jaeger {
    try_files $uri $uri/ /jaeger/index.php?$query_string;
}

# 4. Restart Nginx
sudo systemctl restart nginx

# 5. Access
# http://localhost/jaeger
```

---

## 🎯 Usage Comparison

### Telegram Bot
```
User → Telegram → Bot → Jaeger MCP → Results → Bot → Telegram → User
```

**Pros:**
- Mobile-friendly
- Notifications
- Group support
- No web server needed

**Usage:**
```
/start
"scan example.com"
/vulnhunt target.com
```

### Web Interface
```
User → Browser → PHP API → Jaeger MCP → Results → PHP API → Browser → User
```

**Pros:**
- Better visualization
- Desktop-friendly
- No Telegram required
- Claude-like UX

**Usage:**
1. Open http://localhost:8080
2. Select scan mode
3. Enter target
4. View results in chat interface

---

## 📊 Features Matrix

| Feature | Telegram Bot | Web Interface |
|---------|--------------|---------------|
| Smart Scan | ✅ | ✅ |
| Quick Scan | ✅ | ✅ |
| Reconnaissance | ✅ | ✅ |
| Vuln Hunting | ✅ | ✅ |
| OSINT | ✅ | ✅ |
| Real-time Status | ✅ | ✅ |
| Tool Selection | ✅ | ✅ |
| Results Display | Text | Formatted HTML |
| Mobile Support | ✅ Excellent | ✅ Good |
| Desktop Support | ✅ Good | ✅ Excellent |
| Multi-user | ✅ Native | ⚠️ Needs session mgmt |

---

## 🔧 Configuration

### Web Interface Settings

Edit `web-interface/includes/config.php`:

```php
// Jaeger MCP Server URL
define('JAEGER_API_BASE_URL', 'http://127.0.0.1:8888');

// API Timeout (10 minutes)
define('JAEGER_API_TIMEOUT', 600);

// Optional: Enable authentication
define('AUTH_ENABLED', false);
```

### Telegram Bot Settings

Edit `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_key
```

---

## 🎨 Web Interface UI

### Layout

```
┌─────────────────────────────────────────────┐
│ Sidebar │ Main Content Area                 │
│         │ ┌─────────────────────────────┐   │
│ Quick   │ │                             │   │
│ Actions │ │   Chat Messages             │   │
│         │ │   (User & Assistant)        │   │
│ Tools   │ │                             │   │
│         │ └─────────────────────────────┘   │
│         │ ┌─────────────────────────────┐   │
│ Status  │ │ [Input Box]  [Scan Button] │   │
│         │ └─────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Theme Colors

- **Dark Theme**: Modern hacker-style
- **Accent Color**: Red (#ff6b6b) - matches JAEGER branding
- **Responsive**: Works on desktop, tablet, mobile

---

## 🚨 Security Considerations

### ⚠️ IMPORTANT

**Web Interface** lebih exposed dibanding Telegram Bot:

1. **Authentication**: Enable authentication untuk production
   ```php
   // includes/config.php
   define('AUTH_ENABLED', true);
   define('ADMIN_USERNAME', 'admin');
   define('ADMIN_PASSWORD', password_hash('strong_password', PASSWORD_BCRYPT));
   ```

2. **HTTPS**: Gunakan SSL certificate untuk production
   ```bash
   # Let's Encrypt example
   sudo certbot --apache -d your-domain.com
   ```

3. **Firewall**: Restrict access jika perlu
   ```bash
   # UFW example - only allow from specific IP
   sudo ufw allow from 192.168.1.0/24 to any port 80
   sudo ufw allow from 192.168.1.0/24 to any port 443
   ```

4. **Logs**: Monitor access logs
   ```bash
   tail -f web-interface/logs/jaeger-web.log
   ```

---

## 🐛 Troubleshooting

### Web Interface Issues

#### "Failed to connect to Jaeger server"

```bash
# Check if Jaeger MCP running
curl http://127.0.0.1:8888/health

# If not running, start it
cd /home/terrestrial/Desktop/jaeger-ai
./start.sh
```

#### PHP cURL error

```bash
# Install PHP curl extension
sudo apt-get install php-curl
sudo systemctl restart apache2
```

#### Permission denied on logs

```bash
cd web-interface
sudo chmod 777 logs
```

### Telegram Bot Issues

#### Bot not responding

```bash
# Check if bot running
ps aux | grep jaeger-telegram-bot

# Restart bot
./start.sh
```

---

## 📈 Performance Tips

### Web Interface

1. **Enable caching** di PHP
2. **Use reverse proxy** (Nginx) jika high traffic
3. **Limit concurrent scans** per session
4. **Use async loading** untuk large results

### Telegram Bot

1. **Already optimized** dengan async messaging
2. **Progress updates** setiap 60 detik
3. **Automatic timeout** 10 menit

---

## 🎯 Use Cases

### When to use Telegram Bot:
- Mobile testing
- Quick scans on-the-go
- Team collaboration (group chats)
- Automated notifications

### When to use Web Interface:
- Desktop workstation
- Detailed report analysis
- Better visualization
- No Telegram account

### Recommendation:
**Use both!** Telegram untuk mobile, Web untuk desktop.

---

## 📞 Support & Resources

- **Main README**: `/jaeger-ai/README.md`
- **Web Interface README**: `/web-interface/README.md`
- **GitHub Issues**: https://github.com/jaeger-ai/jaeger-ai/issues

---

**JAEGER AI** - *Choose Your Interface, Same Powerful Engine* 🚀
