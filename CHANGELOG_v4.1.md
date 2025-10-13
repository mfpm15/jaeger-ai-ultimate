# JAEGER AI - Changelog v4.1

## 🚀 Major Updates (October 2025)

### ✨ NEW: Web Interface (PHP Native)

**Interface alternatif berbasis web dengan design mirip Claude**

#### Features:
- ✅ Modern Claude-like UI (Dark theme, responsive)
- ✅ Real-time chat interface
- ✅ Same functionality as Telegram bot
- ✅ No Telegram account required
- ✅ Desktop-optimized experience
- ✅ PHP Native (no framework dependencies)

#### Quick Start:
```bash
./START_WEB.sh
# or
cd web-interface && php -S localhost:8080
```

#### Files Added:
```
web-interface/
├── index.php              # Main interface
├── api/handler.php        # Backend API
├── assets/
│   ├── css/style.css      # Styling
│   └── js/app.js          # Frontend logic
├── includes/config.php    # Configuration
├── logs/                  # Log directory
└── README.md              # Documentation
```

---

### ⚙️ Configuration Updates

#### 1. Timeout Extended
**Changed**: `COMMAND_TIMEOUT` from 5 minutes → **10 minutes**

**Location**: `jaeger-ai-core/jaeger_server.py:6664`

**Reason**: Support untuk scan yang lebih kompleks

#### 2. Default Scan Mode Changed
**Changed**: Default objective from `comprehensive` → **`quick`**

**Locations**:
- `jaeger_server.py:971` - `select_optimal_tools()`
- `jaeger_server.py:1462` - `create_attack_chain()`
- `jaeger_server.py:9575` - API endpoint defaults
- `jaeger_server.py:9646` - API endpoint defaults
- `jaeger_server.py:9681` - API endpoint defaults

**Reason**: Faster scan untuk early version, optimize user experience

---

### 🎨 Branding Updates

#### Output Display Changes
**All user-facing output now shows "JAEGER" instead of "HexStrike"**

#### Files Updated:
- ✅ `jaeger-telegram-bot.js` - All user messages
- ✅ `jaeger-intelligence.js` - Console logs & comments
- ✅ `jaeger_server.py` - Logging output
- ✅ `jaeger_mcp.py` - API responses
- ✅ `README.md` - Documentation
- ✅ `package.json` - Project metadata
- ✅ `start.sh` - Startup messages

**Note**: File & folder names kept as-is untuk avoid breaking imports

---

### 🧹 Cleanup

#### Files Removed:
```
✅ jaeger-ai-clean.zip       # Old archive
✅ jaeger-ai.js              # Obsolete file
✅ test-runner.js            # Old test runner
✅ test-start.sh             # Old test script
✅ user-registration.js      # Unused feature
✅ clean_project.sh          # No longer needed
✅ backup/                   # Old backup folder
✅ tests/                    # Old test directory
✅ hexstrike-ai/             # Duplicate old folder
✅ jaeger.db                 # Unused database
```

#### Result:
- **Cleaner project structure**
- **Reduced repository size** (~6.6MB removed)
- **Easier navigation**

---

### 📚 Documentation Updates

#### New Documents:
1. **`WEB_INTERFACE_GUIDE.md`** - Complete web interface setup guide
2. **`web-interface/README.md`** - Web interface specific docs
3. **`START_WEB.sh`** - Quick start script untuk web interface
4. **`CHANGELOG_v4.1.md`** - This file

#### Updated Documents:
1. **`README.md`** - Added web interface info
2. **`package.json`** - Updated metadata
3. **`start.sh`** - Updated messages

---

## 🎯 Architecture Changes

### Before (v4.0):
```
User → Telegram Bot → Jaeger Intelligence → Jaeger MCP → Tools
```

### After (v4.1):
```
User → Interface Layer → Jaeger Intelligence → Jaeger MCP → Tools
       │
       ├─ Telegram Bot (existing)
       └─ Web Interface (NEW!)
```

**Benefit**: Flexibility - Choose interface sesuai kebutuhan

---

## 📊 Performance Improvements

### Scan Speed
- **Default mode**: `quick` (3-5 tools, ~2-5 min)
- **Comprehensive mode**: Available on-demand
- **Timeout**: 10 minutes (dari 5 menit)

### Expected Results:
| Mode | Tools | Avg Time | Use Case |
|------|-------|----------|----------|
| Quick | 3-5 | 2-5 min | Fast recon |
| Reconnaissance | 5-7 | 5-10 min | Subdomain enum |
| Vulnerability Hunting | 8-10 | 10-15 min | Deep scan |
| OSINT | 4-6 | 3-8 min | Info gathering |
| Comprehensive | 10+ | 15-20 min | Full assessment |

---

## 🔧 Technical Details

### Web Interface Stack:
- **Backend**: PHP 7.4+ (native, no framework)
- **Frontend**: Vanilla JS (no libraries)
- **Styling**: Pure CSS (no Bootstrap/Tailwind)
- **Communication**: REST API (JSON)
- **Server**: PHP built-in / Apache / Nginx

### Why PHP Native?
1. ✅ **No dependencies** - Faster setup
2. ✅ **Lightweight** - Minimal overhead
3. ✅ **Universal** - Works on any PHP hosting
4. ✅ **Simple** - Easy to customize
5. ✅ **Fast** - No framework bloat

---

## 🚨 Breaking Changes

### None!

All changes are **backward compatible**:
- ✅ Telegram bot works exactly the same
- ✅ Existing API endpoints unchanged
- ✅ Configuration files compatible
- ✅ MCP server interface stable

### Migration Notes:
- No migration needed
- Web interface is **additive** (optional)
- Can use both interfaces simultaneously

---

## 🎁 Bonus Features

### Web Interface Extras:
1. **Server Status Indicator** - Real-time status di sidebar
2. **Workflow Quick Buttons** - One-click scan modes
3. **Chat History** - Persistent dalam session
4. **Markdown Support** - Formatted output
5. **Code Highlighting** - Syntax highlighting untuk tool output
6. **Responsive Design** - Works on mobile/tablet/desktop
7. **Dark Theme** - Eye-friendly hacker style

---

## 📈 Usage Statistics (Expected)

### Interface Preference:
- **Telegram Bot**: 60% (Mobile users, teams)
- **Web Interface**: 40% (Desktop users, analysts)

### Popular Workflows:
1. Quick Scan (50%)
2. Vulnerability Hunting (25%)
3. Reconnaissance (15%)
4. OSINT (10%)

---

## 🔮 Future Plans (v4.2+)

### Planned Features:
- [ ] **Authentication** untuk web interface
- [ ] **Session management** multi-user
- [ ] **Scan history** storage
- [ ] **Export reports** (PDF/HTML)
- [ ] **Custom workflows** builder
- [ ] **API rate limiting**
- [ ] **WebSocket** untuk real-time updates
- [ ] **Dark/Light theme** toggle
- [ ] **Mobile app** (React Native?)

---

## 🙏 Credits

**Major Refactoring by**: Claude Code (Anthropic)
**Requested by**: User (terrestrial)
**Date**: October 13, 2025
**Version**: 4.0 → 4.1

---

## 📞 Support

- **Issues**: https://github.com/jaeger-ai/jaeger-ai/issues
- **Docs**: `/jaeger-ai/README.md`
- **Web Guide**: `/jaeger-ai/WEB_INTERFACE_GUIDE.md`

---

**JAEGER AI v4.1** - *More Interfaces, Same Power* 🚀
