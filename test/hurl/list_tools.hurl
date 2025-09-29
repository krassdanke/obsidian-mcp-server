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

# Create test files for listing
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
      "path": "HurlTest/list_tools/note1.md",
      "content": "# Note 1\n\nThis is a test note.",
      "createDirs": true,
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Create another markdown file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "add_file",
    "arguments": {
      "path": "HurlTest/list_tools/note2.md",
      "content": "# Note 2\n\nAnother test note.",
      "createDirs": true,
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Create a non-markdown file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "add_file",
    "arguments": {
      "path": "HurlTest/list_tools/data.txt",
      "content": "This is a text file, not markdown.",
      "createDirs": true,
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test list_files tool - should return all files
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "list_files",
    "arguments": {
      "dir": "HurlTest/list_tools"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note1.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note2.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/data.txt"

# Test list_notes tool - should return only markdown files
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "list_notes",
    "arguments": {
      "dir": "HurlTest/list_tools"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note1.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note2.md"
jsonpath "$.result.content[0].text" not contains "HurlTest/list_tools/data.txt"

# Test list_files with root directory
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "list_files",
    "arguments": {
      "dir": "."
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note1.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note2.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/data.txt"

# Test list_notes with root directory
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "list_notes",
    "arguments": {
      "dir": "."
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note1.md"
jsonpath "$.result.content[0].text" contains "HurlTest/list_tools/note2.md"
jsonpath "$.result.content[0].text" not contains "HurlTest/list_tools/data.txt"

# Clean up test files
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "delete_file",
    "arguments": {
      "path": "HurlTest/list_tools/note1.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "delete_file",
    "arguments": {
      "path": "HurlTest/list_tools/note2.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "delete_file",
    "arguments": {
      "path": "HurlTest/list_tools/data.txt"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Note: HurlTest directory will be cleaned up by the test script after execution
