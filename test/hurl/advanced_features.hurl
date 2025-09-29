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

# Create test notes for advanced features
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "write_note",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "body": "# Note 1\n\nThis is a test note with some content.\n\n## Section 1\n\nSome content here.\n\n## Section 2\n\nMore content here.",
      "frontmatter": {
        "title": "Test Note 1",
        "tags": ["test", "advanced"],
        "created": "2024-01-01",
        "status": "active"
      },
      "createDirs": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Create second note with wikilink to first
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "write_note",
    "arguments": {
      "path": "HurlTest/advanced_features/note2.md",
      "body": "# Note 2\n\nThis note references [[note1]] and also [[note1|Note 1 with custom text]].\n\nIt also has a link to [[note1#Section 1]].\n\n#advanced #test #linking",
      "frontmatter": {
        "title": "Test Note 2",
        "tags": ["test", "linking"],
        "created": "2024-01-02"
      },
      "createDirs": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test create_wikilink tool
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "note1",
      "displayText": "Custom Display Text"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[note1|Custom Display Text]]"

# Test create_wikilink with heading
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "note1",
      "heading": "Section 1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[note1#Section 1]]"

# Test find_backlinks for note1
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "find_backlinks",
    "arguments": {
      "target": "note1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_tags - add tags
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "add",
      "tags": ["new-tag", "another-tag"]
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_tags - list tags
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "list"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_tags - remove tags
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "remove",
      "tags": ["new-tag"]
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test search_advanced - search by tag
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "tag:test"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test search_advanced - search by content
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "content:test note"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_frontmatter - get all frontmatter
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "get"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_frontmatter - get specific property
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "get",
      "property": "title"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_frontmatter - update properties
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "update",
      "properties": {
        "updated": "2024-01-03",
        "status": "completed"
      }
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_frontmatter - remove property
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/advanced_features/note1.md",
      "action": "remove",
      "property": "status"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test rename_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "rename_file",
    "arguments": {
      "oldPath": "HurlTest/advanced_features/note1.md",
      "newPath": "HurlTest/advanced_features/renamed_note1.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test move_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "move_file",
    "arguments": {
      "sourcePath": "HurlTest/advanced_features/note2.md",
      "destinationPath": "HurlTest/advanced_features/moved_note2.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Verify files exist in new locations
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/advanced_features/renamed_note1.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/advanced_features/moved_note2.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Note: HurlTest directory will be cleaned up by the test script after execution
