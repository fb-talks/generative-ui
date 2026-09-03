
const SERVER_URL = 'http://localhost:3010/mcp';

async function main() {
  console.log('Connecting to MCP server...');
  
  // 1. Initialize
  const initResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    })
  });

  const sessionId = initResponse.headers.get('mcp-session-id');
  console.log('Session ID:', sessionId);
  
  const initResult = await initResponse.json();
  console.log('Init Result:', JSON.stringify(initResult, null, 2));

  // 2. Notifications initialized
  const notifResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    })
  });
  console.log('Notif Response Status:', notifResponse.status);

  // 3. List Tools
  const listToolsResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    })
  });
  
  const listToolsResult = await listToolsResponse.json();
  console.log('Tools:', JSON.stringify(listToolsResult, null, 2));

  // 4. Call Tool
  const callToolResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'greet',
        arguments: {}
      }
    })
  });

  const callToolResult = await callToolResponse.json();
  console.log('Call Tool Result:', JSON.stringify(callToolResult, null, 2));

  // 5. Read Resource
  console.log('Reading resource ui://greeting...');
  const readResourceResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: {
        uri: 'ui://greeting'
      }
    })
  });

  const readResourceResult = await readResourceResponse.json();
  console.log('Read Resource Result:', JSON.stringify(readResourceResult, null, 2));
}

main().catch(console.error);
