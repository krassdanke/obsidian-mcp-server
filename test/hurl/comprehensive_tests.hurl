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

# Create test files for comprehensive testing
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
      "path": "HurlTest/comprehensive/test1.md",
      "content": "# Test File 1\n\nThis is a test file with some content.\n\n## Section A\n\nContent in section A.\n\n## Section B\n\nContent in section B.\n\n#tag1 #tag2",
      "createDirs": true,
      "overwrite": true
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
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "add_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test2.md",
      "content": "# Test File 2\n\nThis file references [[test1]] and [[test1|Custom Text]].\n\nIt also links to [[test1#Section A]].\n\n#tag2 #tag3",
      "createDirs": true,
      "overwrite": true
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
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "add_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test3.txt",
      "content": "This is a plain text file for testing file operations.",
      "createDirs": true,
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test create_wikilink - basic link
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
      "target": "test1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[test1]]"

# Test create_wikilink - with display text
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "test1",
      "displayText": "Custom Display"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[test1|Custom Display]]"

# Test create_wikilink - with heading
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "test1",
      "heading": "Section A"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[test1#Section A]]"

# Test create_wikilink - with block reference
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "test1",
      "block": "block-id"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[test1#^block-id]]"

# Test create_wikilink - with all options
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "create_wikilink",
    "arguments": {
      "target": "test1",
      "displayText": "Full Link",
      "heading": "Section B",
      "block": "block-id"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "[[test1#Section B#^block-id|Full Link]]"

# Test find_backlinks for test1
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "find_backlinks",
    "arguments": {
      "target": "test1"
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
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/comprehensive/test1.md",
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
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/comprehensive/test1.md",
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
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "manage_tags",
    "arguments": {
      "path": "HurlTest/comprehensive/test1.md",
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
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "tag:tag1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test search_advanced - search by file name
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "file:test1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test search_advanced - search by path
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "path:comprehensive"
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
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "content:test file"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test search_advanced - case sensitive search
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "search_advanced",
    "arguments": {
      "query": "Test File",
      "caseSensitive": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test search_notes - basic search
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "search_notes",
    "arguments": {
      "query": "test"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test read_note
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 20,
  "method": "tools/call",
  "params": {
    "name": "read_note",
    "arguments": {
      "path": "HurlTest/comprehensive/test1.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test get_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 21,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test3.txt"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test list_files
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 22,
  "method": "tools/call",
  "params": {
    "name": "list_files",
    "arguments": {
      "dir": "HurlTest/comprehensive"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test list_notes
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 23,
  "method": "tools/call",
  "params": {
    "name": "list_notes",
    "arguments": {
      "dir": "HurlTest/comprehensive"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test write_note with frontmatter
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 24,
  "method": "tools/call",
  "params": {
    "name": "write_note",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
      "body": "# Frontmatter Test\n\nThis note has frontmatter.",
      "frontmatter": {
        "title": "Frontmatter Test",
        "tags": ["test", "frontmatter"],
        "date": "2024-01-01"
      },
      "createDirs": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_frontmatter - get all frontmatter
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 25,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
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
  "id": 26,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
      "action": "get",
      "property": "title"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists

# Test manage_frontmatter - set properties (replace all)
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 27,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
      "action": "set",
      "properties": {
        "title": "New Title",
        "status": "updated"
      }
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_frontmatter - update properties
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 28,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
      "action": "update",
      "properties": {
        "updated": "2024-01-02",
        "version": "1.0"
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
  "id": 29,
  "method": "tools/call",
  "params": {
    "name": "manage_frontmatter",
    "arguments": {
      "path": "HurlTest/comprehensive/frontmatter_test.md",
      "action": "remove",
      "property": "version"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test append_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 30,
  "method": "tools/call",
  "params": {
    "name": "append_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test1.md",
      "content": "\n\n## Appended Section\n\nThis content was appended."
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test change_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 31,
  "method": "tools/call",
  "params": {
    "name": "change_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test3.txt",
      "content": "This is the completely new content for the file."
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
  "id": 32,
  "method": "tools/call",
  "params": {
    "name": "rename_file",
    "arguments": {
      "oldPath": "HurlTest/comprehensive/test3.txt",
      "newPath": "HurlTest/comprehensive/renamed_test3.txt"
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
  "id": 33,
  "method": "tools/call",
  "params": {
    "name": "move_file",
    "arguments": {
      "sourcePath": "HurlTest/comprehensive/renamed_test3.txt",
      "destinationPath": "HurlTest/comprehensive/moved_test3.txt"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test move_file with overwrite
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 34,
  "method": "tools/call",
  "params": {
    "name": "move_file",
    "arguments": {
      "sourcePath": "HurlTest/comprehensive/moved_test3.txt",
      "destinationPath": "HurlTest/comprehensive/test1.md",
      "overwrite": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test delete_file
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 35,
  "method": "tools/call",
  "params": {
    "name": "delete_file",
    "arguments": {
      "path": "HurlTest/comprehensive/test2.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test delete_directory (recursive)
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 36,
  "method": "tools/call",
  "params": {
    "name": "delete_directory",
    "arguments": {
      "path": "HurlTest/comprehensive",
      "recursive": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Note: HurlTest directory will be cleaned up by the test script after execution
