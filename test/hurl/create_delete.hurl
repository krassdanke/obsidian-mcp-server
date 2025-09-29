# Initialize session (stateless mode)
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {},
    "clientInfo": {"name": "hurl-test", "version": "0.0.1"}
  }
}
HTTP/1.1 200

# Create file using add_file (creates parent dirs)
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "add_file",
    "arguments": {
      "path": "HurlTest/create_delete/Test.md",
      "content": "hello from hurl\n",
      "createDirs": true,
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Read file back with get_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/create_delete/Test.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "hello from hurl\n"

# Delete the file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "delete_file",
    "arguments": {
      "path": "HurlTest/create_delete/Test.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Verify file is gone (tool should return error result)
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/create_delete/Test.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.isError" == true

# Note: HurlTest directory will be cleaned up by the test script after execution
