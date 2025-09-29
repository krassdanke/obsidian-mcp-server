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

# Create test notes for medium priority features
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
      "path": "HurlTest/medium_priority/source_note.md",
      "body": "# Source Note\n\nThis is a source note for testing embeds.\n\n## Section 1\n\nContent in section 1.\n\n## Section 2\n\nContent in section 2.\n\n- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3",
      "frontmatter": {
        "title": "Source Note",
        "tags": ["source", "test"],
        "status": "active",
        "priority": "high",
        "created": "2024-01-01"
      },
      "createDirs": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test create_callout - basic note callout
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_callout",
    "arguments": {
      "type": "note",
      "content": "This is a note callout with some important information."
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" contains "> [!note]+"

# Test create_callout - warning with title
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_callout",
    "arguments": {
      "type": "warning",
      "title": "Important Warning",
      "content": "This is a warning callout with a title."
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" contains "> [!warning]+ Important Warning"

# Test create_callout - collapsed tip
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "create_callout",
    "arguments": {
      "type": "tip",
      "title": "Pro Tip",
      "content": "This is a collapsed tip callout.",
      "collapsed": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" contains "> [!tip]- Pro Tip"

# Test create_embed - basic embed
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "create_embed",
    "arguments": {
      "target": "source_note"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "![[source_note]]"

# Test create_embed - with heading
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "create_embed",
    "arguments": {
      "target": "source_note",
      "heading": "Section 1"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "![[source_note#Section 1]]"

# Test create_embed - with display text and size
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "create_embed",
    "arguments": {
      "target": "source_note",
      "displayText": "Custom Display",
      "width": 400,
      "height": 300
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "![[source_note|Custom Display]]|400x300"

# Test execute_dataview - TABLE query
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "execute_dataview",
    "arguments": {
      "query": "TABLE title, status, priority, created FROM \"HurlTest/medium_priority\"",
      "source": "HurlTest/medium_priority"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "TABLE"

# Test execute_dataview - TASK query
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "execute_dataview",
    "arguments": {
      "query": "TASK FROM \"HurlTest/medium_priority\"",
      "source": "HurlTest/medium_priority"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "TASK"

# Test create_canvas - basic canvas
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "create_canvas",
    "arguments": {
      "path": "HurlTest/medium_priority/test_canvas.canvas",
      "title": "Test Canvas",
      "nodes": [
        {
          "id": "node1",
          "type": "text",
          "x": 100,
          "y": 100,
          "width": 300,
          "height": 200,
          "content": "This is a text node"
        }
      ],
      "createDirs": true
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_templates - create template
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "manage_templates",
    "arguments": {
      "action": "create",
      "name": "meeting_notes",
      "content": "# Meeting Notes Template\n\n**Date:** \n**Attendees:** \n\n## Notes\n\n## Action Items\n\n- [ ] ",
      "templateDir": "HurlTest/medium_priority/Templates"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Test manage_templates - list templates
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "manage_templates",
    "arguments": {
      "action": "list",
      "name": "meeting_notes",
      "templateDir": "HurlTest/medium_priority/Templates"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "meeting_notes"

# Test manage_templates - apply template
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "manage_templates",
    "arguments": {
      "action": "apply",
      "name": "meeting_notes",
      "outputPath": "HurlTest/medium_priority/applied_meeting.md",
      "variables": {
        "title": "Project Planning",
        "attendees": "Alice, Bob, Charlie"
      },
      "templateDir": "HurlTest/medium_priority/Templates"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" == "OK"

# Verify applied template exists and has correct content
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/medium_priority/applied_meeting.md"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "Meeting Notes Template"

# Verify canvas file was created
POST http://127.0.0.1:8765/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "get_file",
    "arguments": {
      "path": "HurlTest/medium_priority/test_canvas.canvas"
    }
  }
}
HTTP/1.1 200
[Asserts]
jsonpath "$.result.content[0].text" exists
jsonpath "$.result.content[0].text" contains "Test Canvas"

# Note: HurlTest directory will be cleaned up by the test script after execution
