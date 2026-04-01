import { test, expect, describe } from "bun:test";
import { parseConversation } from "../parser.ts";
import { serializeConversation } from "../serializer.ts";

const SPEC_EXAMPLE = `---
title: Caddy reverse proxy setup
date: 2026-03-28T14:32:00+02:00
model: anthropic/claude-sonnet-4
provider: openrouter
tags:
  - vaultchat
  - caddy
  - infrastructure
context:
  - "[[Server Infrastructure]]"
---

###### context
<!-- vaultchat:auto-context — do not edit, regenerated on each send -->

**From [[Server Infrastructure]]:**
Primary server: Hetzner CAX41 ARM64, Ubuntu 24.04
Reverse proxy: Caddy 2.7
Docker network: caddy_net (bridge)

---

###### user
I need to add automatic SSL for a new subdomain pointing to a Docker container on port 8080.

---

###### assistant
Add this to your Caddyfile:

\`\`\`
newapp.don.ee {
  reverse_proxy container_name:8080 {
    transport http {
      versions 1.1 2
    }
  }
}
\`\`\`

Then reload:

\`\`\`bash
docker exec -w /etc/caddy caddy caddy reload
\`\`\`

Since you're using Caddy with Docker, make sure the container is on the \`caddy_net\` network.

-----

###### user

Can I add rate limiting to this?

-----

###### assistant

Yes, using the \`rate_limit\` directive…
`;

describe("parseConversation", () => {
  test("parses frontmatter correctly", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");

    expect(conv.frontmatter.title).toBe("Caddy reverse proxy setup");
    expect(conv.frontmatter.model).toBe("anthropic/claude-sonnet-4");
    expect(conv.frontmatter.provider).toBe("openrouter");
    expect(conv.frontmatter.tags).toEqual([
      "vaultchat",
      "caddy",
      "infrastructure",
    ]);
    expect(conv.frontmatter.context).toEqual(["[[Server Infrastructure]]"]);
    expect(conv.filePath).toBe("test.md");
  });

  test("parses all messages with correct roles", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");

    expect(conv.messages).toHaveLength(5);
    expect(conv.messages[0]!.role).toBe("context");
    expect(conv.messages[1]!.role).toBe("user");
    expect(conv.messages[2]!.role).toBe("assistant");
    expect(conv.messages[3]!.role).toBe("user");
    expect(conv.messages[4]!.role).toBe("assistant");
  });

  test("preserves message content", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");

    expect(conv.messages[1]!.content).toBe(
      "I need to add automatic SSL for a new subdomain pointing to a Docker container on port 8080."
    );
    expect(conv.messages[3]!.content).toBe(
      "Can I add rate limiting to this?"
    );
    expect(conv.messages[4]!.content).toBe(
      "Yes, using the `rate_limit` directive…"
    );
  });

  test("does not split --- inside code blocks", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");
    const assistantMsg = conv.messages[2]!;

    expect(assistantMsg.role).toBe("assistant");
    // The assistant message should contain code blocks intact
    expect(assistantMsg.content).toContain("```");
    expect(assistantMsg.content).toContain("newapp.don.ee");
    expect(assistantMsg.content).toContain("docker exec");
  });

  test("handles system prompt as first message", () => {
    const input = `---
title: Test
date: 2026-03-28T14:32:00+02:00
model: test/model
provider: openrouter
---

###### system
You are a helpful assistant.

---

###### user
Hello!

---

###### assistant
Hi there!
`;
    const conv = parseConversation(input, "test.md");

    expect(conv.messages).toHaveLength(3);
    expect(conv.messages[0]!.role).toBe("system");
    expect(conv.messages[0]!.content).toBe("You are a helpful assistant.");
    expect(conv.messages[1]!.role).toBe("user");
    expect(conv.messages[2]!.role).toBe("assistant");
  });

  test("handles empty conversation (frontmatter only)", () => {
    const input = `---
title: Empty
date: 2026-03-28T14:32:00+02:00
model: test/model
provider: openrouter
---
`;
    const conv = parseConversation(input, "empty.md");

    expect(conv.messages).toHaveLength(0);
    expect(conv.frontmatter.title).toBe("Empty");
  });

  test("handles --- in code blocks with tilde fences", () => {
    const input = `---
title: Test
date: 2026-03-28T14:32:00+02:00
model: test/model
provider: openrouter
---

###### assistant
Here is some YAML:

~~~yaml
---
key: value
nested:
  - item1
  - item2
---
~~~

That was YAML.
`;
    const conv = parseConversation(input, "test.md");

    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0]!.content).toContain("key: value");
  });
});

describe("serializeConversation", () => {
  test("produces valid frontmatter", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");
    const output = serializeConversation(conv);

    expect(output).toContain("title: Caddy reverse proxy setup");
    expect(output).toContain("model: anthropic/claude-sonnet-4");
    expect(output).toContain("provider: openrouter");
  });

  test("produces valid message markers", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");
    const output = serializeConversation(conv);

    expect(output).toContain("###### context");
    expect(output).toContain("###### user");
    expect(output).toContain("###### assistant");
  });
});

describe("round-trip", () => {
  test("parse → serialize → parse produces same messages", () => {
    const conv1 = parseConversation(SPEC_EXAMPLE, "test.md");
    const serialized = serializeConversation(conv1);
    const conv2 = parseConversation(serialized, "test.md");

    expect(conv2.messages).toHaveLength(conv1.messages.length);
    for (let i = 0; i < conv1.messages.length; i++) {
      expect(conv2.messages[i]!.role).toBe(conv1.messages[i]!.role);
      expect(conv2.messages[i]!.content).toBe(conv1.messages[i]!.content);
    }
  });

  test("frontmatter survives round-trip", () => {
    const conv1 = parseConversation(SPEC_EXAMPLE, "test.md");
    const serialized = serializeConversation(conv1);
    const conv2 = parseConversation(serialized, "test.md");

    expect(conv2.frontmatter.title).toBe(conv1.frontmatter.title);
    expect(conv2.frontmatter.model).toBe(conv1.frontmatter.model);
    expect(conv2.frontmatter.provider).toBe(conv1.frontmatter.provider);
    expect(conv2.frontmatter.tags).toEqual(conv1.frontmatter.tags);
    expect(conv2.frontmatter.context).toEqual(conv1.frontmatter.context);
  });
});

describe("original content preservation", () => {
  test("plain Obsidian file content is captured as originalContent", () => {
    const input = `---
title: My Research Notes
---

# Kubernetes Setup

We use k3s on three nodes with Longhorn for storage.

## Networking
Traefik ingress with cert-manager for TLS.
`;
    const conv = parseConversation(input, "research.md");

    expect(conv.messages).toHaveLength(0);
    expect(conv.originalContent).toContain("Kubernetes Setup");
    expect(conv.originalContent).toContain("Traefik ingress");
  });

  test("originalContent is preserved through serialize round-trip", () => {
    const input = `---
title: My Notes
---

# Important stuff

This is my note content with **bold** and [links](https://example.com).
`;
    const conv = parseConversation(input, "notes.md");
    expect(conv.originalContent).toBeTruthy();

    const serialized = serializeConversation(conv);
    const conv2 = parseConversation(serialized, "notes.md");

    expect(conv2.originalContent).toBe(conv.originalContent);
    expect(conv2.messages).toHaveLength(0);
  });

  test("originalContent preserved when messages are added", () => {
    const input = `---
title: My Notes
---

# Original content here

Some important info.
`;
    const conv = parseConversation(input, "notes.md");

    // Simulate adding chat messages
    conv.messages.push({ role: "user", content: "Tell me about this note" });
    conv.messages.push({ role: "assistant", content: "This note contains important info." });

    const serialized = serializeConversation(conv);
    const conv2 = parseConversation(serialized, "notes.md");

    expect(conv2.originalContent).toContain("Original content here");
    expect(conv2.originalContent).toContain("Some important info.");
    expect(conv2.messages).toHaveLength(2);
    expect(conv2.messages[0]!.role).toBe("user");
    expect(conv2.messages[1]!.role).toBe("assistant");
  });

  test("VaultChat-native files have no originalContent", () => {
    const conv = parseConversation(SPEC_EXAMPLE, "test.md");
    expect(conv.originalContent).toBeUndefined();
  });

  test("mixed file: content before first role marker is preserved", () => {
    const input = `---
title: Mixed File
date: 2026-03-28T14:32:00+02:00
model: test/model
provider: openrouter
---

# Project overview

This is a project overview note.

---

###### user
Summarize this for me

---

###### assistant
This is a project overview note.
`;
    const conv = parseConversation(input, "mixed.md");

    expect(conv.originalContent).toContain("Project overview");
    expect(conv.originalContent).toContain("project overview note");
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[0]!.role).toBe("user");
    expect(conv.messages[1]!.role).toBe("assistant");
  });
});
