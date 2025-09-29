# Test case for stateless MCP server behavior
# This test demonstrates that the server works without session management

### Test 1: Initial MCP server initialization (should succeed in stateless mode)
POST http://localhost:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {"name": "hurl-test", "version": "0.0.1"}
  }
}

HTTP 200
[Asserts]
jsonpath "$.jsonrpc" == "2.0"
jsonpath "$.result.protocolVersion" == "2025-03-26"
jsonpath "$.result.capabilities" exists

### Test 2: Test tools/list after initialization (should succeed)
POST http://localhost:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}

HTTP 200
[Asserts]
jsonpath "$.jsonrpc" == "2.0"
jsonpath "$.result.tools" exists
jsonpath "$.result.tools" isCollection
jsonpath "$.result.tools[0].name" exists

### Test 3: Test canvas creation (should succeed)
POST http://localhost:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_canvas",
    "arguments": {
      "path": "test-canvas.canvas",
      "title": "Test Canvas",
      "nodes": [
        {
          "id": "test-node",
          "type": "text",
          "x": 0,
          "y": 0,
          "width": 200,
          "height": 100,
          "content": "Test Node"
        }
      ],
      "edges": [],
      "createDirs": true
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.jsonrpc" == "2.0"
jsonpath "$.result.content" exists
jsonpath "$.result.content[0].text" == "OK"
