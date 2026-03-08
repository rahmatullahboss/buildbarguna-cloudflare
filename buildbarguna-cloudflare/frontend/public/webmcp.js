// WebMCP Client Script
// Connects your website to WebMCP for AI agent interaction

(function() {
  // Configuration - Set to false to disable WebMCP
  window.WEBMCP_CONFIG = {
    enabled: false,  // Set to true when you have a WebMCP server running
    serverUrl: '',    // Your WebMCP WebSocket server URL
    token: ''         // Your WebMCP token
  };
  
  function getConfig() {
    return window.WEBMCP_CONFIG || { enabled: false, serverUrl: '', token: '' };
  }
  
  function init() {
    const config = getConfig();
    
    if (!config.enabled || !config.serverUrl) {
      console.log('WebMCP: Disabled or not configured. Set window.WEBMCP_CONFIG to enable.');
      return;
    }
    
    const TOKEN = config.token;
    let ws = null;
    let messageId = 0;
    let pendingRequests = new Map();
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    function connect() {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('WebMCP: Max reconnection attempts reached. Stopping.');
        return;
      }
      
      console.log('WebMCP: Connecting to ' + config.serverUrl + '...');
      
      try {
        ws = new WebSocket(config.serverUrl);
      } catch (e) {
        console.error('WebMCP: Failed to create WebSocket:', e);
        return;
      }
      
      ws.onopen = function() {
        console.log('WebMCP: Connected!');
        reconnectAttempts = 0;
        
        ws.send(JSON.stringify({
          type: 'handshake',
          token: TOKEN
        }));
        
        if (typeof window.__webmcp_ready === 'function') {
          window.__webmcp_ready();
        }
        window.dispatchEvent(new Event('webmcp-ready'));
      };
      
      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          
          if (data.id && pendingRequests.has(data.id)) {
            const resolve = pendingRequests.get(data.id);
            resolve(data.result);
            pendingRequests.delete(data.id);
          }
        } catch (e) {
          console.error('WebMCP: Parse error:', e);
        }
      };
      
      ws.onerror = function(error) {
        console.error('WebMCP: Error:', error);
      };
      
      ws.onclose = function() {
        console.log('WebMCP: Disconnected');
        reconnectAttempts++;
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log('WebMCP: Reconnecting in ' + delay + 'ms...');
          setTimeout(connect, delay);
        }
      };
    }
    
    // Expose function to call MCP tools
    window.webmcp = {
      call: function(toolName, args) {
        return new Promise(function(resolve, reject) {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebMCP: Not connected'));
            return;
          }
          
          const id = ++messageId;
          pendingRequests.set(id, resolve);
          
          ws.send(JSON.stringify({
            type: 'call',
            id: id,
            tool: toolName,
            args: args
          }));
          
          setTimeout(function() {
            if (pendingRequests.has(id)) {
              pendingRequests.delete(id);
              reject(new Error('WebMCP: Request timeout'));
            }
          }, 30000);
        });
      },
      
      isConnected: function() {
        return ws && ws.readyState === WebSocket.OPEN;
      },
      
      onReady: function(callback) {
        if (typeof callback === 'function') {
          if (ws && ws.readyState === WebSocket.OPEN) {
            callback();
          } else {
            window.addEventListener('webmcp-ready', callback);
          }
        }
      }
    };
    
    connect();
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  console.log('WebMCP: Script loaded (disabled by default)');
})();
