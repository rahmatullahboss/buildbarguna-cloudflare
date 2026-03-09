# Playwright MCP Server Setup Guide

## Requirements

- **Node.js 18** or newer
- **MCP Client**: VS Code, Cursor, Windsurf, Claude Desktop, Goose, or any other MCP-compatible client

---

## Standard Configuration

Most MCP clients use this standard config:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

---

## IDE & Client Setup

### **VS Code**
**Option 1 - Button Install:** Click the install button in the MCP settings

**Option 2 - Manual:** Follow the MCP install guide with standard config above

**Option 3 - CLI:**
```bash
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

### **Cursor**
**Option 1 - Button Install:** Click the install button

**Option 2 - Manual:**
1. Go to **Cursor Settings → MCP → Add new MCP Server**
2. Name it (e.g., "playwright")
3. Use command type with: `npx @playwright/mcp@latest`
4. Optionally click **Edit** to verify config or add arguments

### **Windsurf**
- Follow Windsurf MCP documentation
- Use the standard config above

### **Claude Desktop**
- Follow the MCP install guide
- Use the standard config above

### **Claude Code (CLI)**
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### **Cline**
Add to your `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "timeout": 30,
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ],
      "disabled": false
    }
  }
}
```

### **Copilot**
**Option 1 - Interactive CLI:**
```bash
/mcp add
```

**Option 2 - Manual config** (`~/.copilot/mcp-config.json`):
```json
{
  "mcpServers": {
    "playwright": {
      "type": "local",
      "command": "npx",
      "tools": ["*"],
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### **Codex**
**Option 1 - CLI:**
```bash
codex mcp add playwright npx "@playwright/mcp@latest"
```

**Option 2 - Manual** (`~/.codex/config.toml`):
```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]
```

### **Amp (VS Code Extension)**
**Option 1 - Settings UI:** Add via Amp VS Code extension settings screen

**Option 2 - settings.json:**
```json
"amp.mcpServers": {
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
}
```

**Option 3 - Amp CLI:**
```bash
amp mcp add playwright -- npx @playwright/mcp@latest
```

### **Goose**
**Option 1 - Button Install:** Click the install button

**Option 2 - Manual:**
1. Go to **Advanced settings → Extensions → Add custom extension**
2. Name it (e.g., "playwright")
3. Set **Type**: `STDIO`
4. Set **Command**: `npx @playwright/mcp`
5. Click **"Add Extension"**

### **LM Studio**
**Option 1 - Button Install:** Click the install button

**Option 2 - Manual:**
1. Go to **Program** in the right sidebar
2. Click **Install → Edit mcp.json**
3. Use the standard config above

### **Factory**
**Option 1 - CLI:**
```bash
droid mcp add playwright "npx @playwright/mcp@latest"
```

**Option 2 - Interactive UI:** Type `/mcp` within Factory droid

### **Kiro**
Add to `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### **opencode**
Add to `~/.config/opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

### **Qodo Gen**
1. Open Qodo Gen chat panel in **VSCode** or **IntelliJ**
2. Click **Connect more tools → + Add new MCP**
3. Paste the standard config
4. Click **Save**

### **Warp**
**Option 1 - UI:**
1. Go to **Settings → AI → Manage MCP Servers → + Add**
2. Use the standard config

**Option 2 - Slash Command:**
```
/add-mcp
```
Then paste the standard config

### **Antigravity**
Add via Antigravity settings or configuration file using standard config

### **Gemini CLI**
- Follow the MCP install guide
- Use the standard config

---

## CLI Configuration Options

Pass these as arguments in the `"args"` array:

| Option | Description |
|--------|-------------|
| `--browser <name>` | Browser to use: `chrome`, `firefox`, `webkit`, `msedge` |
| `--headless` | Run browser in headless mode |
| `--port <port>` | Port for SSE transport (standalone mode) |
| `--host <host>` | Host to bind (default: `localhost`, use `0.0.0.0` for all interfaces) |
| `--isolated` | Keep browser profile in memory (no disk save) |
| `--user-data-dir <path>` | Custom user data directory |
| `--storage-state <path>` | Load cookies/localStorage from file |
| `--config <path>` | Path to JSON configuration file |
| `--caps <list>` | Additional capabilities: `vision`, `pdf`, `devtools` |
| `--viewport-size <WxH>` | Viewport size in pixels (e.g., `1280x720`) |
| `--device <name>` | Device to emulate (e.g., `iPhone 15`) |
| `--proxy-server <url>` | Proxy server URL |
| `--timeout-action <ms>` | Action timeout (default: 5000ms) |
| `--timeout-navigation <ms>` | Navigation timeout (default: 60000ms) |
| `--save-video <WxH>` | Save video of session |
| `--save-trace` | Save Playwright trace |
| `--save-session` | Save session to output directory |
| `--output-dir <path>` | Directory for output files |
| `--init-page <path>` | TypeScript file evaluated on page object |
| `--init-script <path>` | JavaScript file added as initialization script |
| `--allowed-origins <list>` | Semicolon-separated trusted origins |
| `--blocked-origins <list>` | Semicolon-separated origins to block |
| `--grant-permissions <list>` | Permissions to grant (e.g., `geolocation`, `clipboard-read`) |
| `--codegen <lang>` | Code generation language: `typescript`, `none` |
| `--no-sandbox` | Disable sandbox for all processes |
| `--block-service-workers` | Block service workers |
| `--ignore-https-errors` | Ignore HTTPS errors |
| `--cdp-endpoint <url>` | CDP endpoint to connect to |
| `--extension` | Connect to existing browser via extension (Edge/Chrome only) |

---

## Standalone Server Mode

For headed browsers on systems without display or from IDE worker processes:

**Start the server:**
```bash
npx @playwright/mcp@latest --port 8931
```

**Client config:**
```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
```

---

## Docker Setup

**Standard Docker config:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

**Long-lived service:**
```bash
docker run -d -i --rm --init --pull=always \
  --entrypoint node \
  --name playwright \
  -p 8931:8931 \
  mcr.microsoft.com/playwright/mcp \
  cli.js --headless --browser chromium --no-sandbox --port 8931 --host 0.0.0.0
```

**Build your own image:**
```bash
docker build -t mcr.microsoft.com/playwright/mcp .
```

> **Note:** Docker implementation only supports headless Chromium.

---

## Configuration File

Create a JSON config file and reference it with `--config`:

```bash
npx @playwright/mcp@latest --config path/to/config.json
```

**Example config.json:**
```json
{
  "browser": {
    "browserName": "chromium",
    "isolated": true,
    "userDataDir": "/path/to/user/data",
    "launchOptions": {
      "headless": true,
      "channel": "chrome"
    },
    "contextOptions": {
      "viewport": { "width": 1280, "height": 720 }
    },
    "initPage": ["./init-page.ts"],
    "initScript": ["./init-script.js"]
  },
  "server": {
    "port": 8931,
    "host": "localhost"
  },
  "capabilities": ["core", "pdf", "vision"],
  "outputDir": "./output",
  "outputMode": "file",
  "saveTrace": true,
  "saveVideo": { "width": 800, "height": 600 },
  "timeouts": {
    "action": 5000,
    "navigation": 60000
  },
  "network": {
    "allowedOrigins": ["https://example.com"],
    "blockedOrigins": ["https://blocked.com"]
  }
}
```

---

## User Profile Modes

| Mode | Description |
|------|-------------|
| **Persistent** (default) | Stores logged-in info in persistent profile. Location: `~/.cache/ms-playwright/mcp-{channel}-profile` (Linux/macOS) or `%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile` (Windows) |
| **Isolated** | Each session starts fresh; state lost on close. Use `--isolated` flag |
| **Browser Extension** | Connect to existing browser tabs with your logged-in sessions. Requires "Playwright MCP Bridge" extension |

---

## Quick Start Commands

### VS Code (CLI)
```bash
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

### Claude Code (CLI)
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### Copilot (CLI)
```bash
/mcp add
```

### Codex (CLI)
```bash
codex mcp add playwright npx "@playwright/mcp@latest"
```

### Amp (CLI)
```bash
amp mcp add playwright -- npx @playwright/mcp@latest
```

### Factory (CLI)
```bash
droid mcp add playwright "npx @playwright/mcp@latest"
```

---

## Verification

After setup, verify the MCP server is working by:

1. Restarting your IDE/client
2. Opening the MCP panel/settings
3. Checking that "playwright" appears in the server list with a green/active status
4. Try asking your AI assistant to "open a browser" or "navigate to a URL"

---

## Troubleshooting

### Common Issues

1. **Node.js version too old**: Ensure you have Node.js 18+
   ```bash
   node --version
   ```

2. **npx not found**: Ensure npm is installed and in PATH

3. **Server not starting**: Check if port 8931 is already in use

4. **Browser not launching**: Install Playwright browsers
   ```bash
   npx playwright install
   ```

---

## Resources

- **GitHub Repository**: https://github.com/microsoft/playwright-mcp
- **Playwright Docs**: https://playwright.dev
- **MCP Specification**: https://modelcontextprotocol.io
