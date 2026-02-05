#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".tdp-lite.json");

interface Config {
  apiKey?: string;
  endpoint?: string;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = loadConfig();
  if (!config.endpoint) {
    throw new Error("Endpoint not configured. Run: tdp config set endpoint <url>");
  }
  if (!config.apiKey) {
    throw new Error("API key not configured. Run: tdp config set api-key <key>");
  }

  const url = `${config.endpoint}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    ...(options.headers as Record<string, string>),
  };

  return fetch(url, { ...options, headers });
}

async function uploadFile(filePath: string): Promise<{ url: string }> {
  const config = loadConfig();
  const file = readFileSync(filePath);
  const filename = filePath.split("/").pop() || "file";

  const formData = new FormData();
  formData.append("file", new Blob([file]), filename);

  const res = await fetch(`${config.endpoint}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  return res.json();
}

// Commands
const commands: Record<string, (args: string[]) => Promise<void>> = {
  async config(args) {
    const [action, key, value] = args;

    if (action === "set") {
      const config = loadConfig();
      if (key === "api-key") {
        config.apiKey = value;
      } else if (key === "endpoint") {
        config.endpoint = value.replace(/\/$/, "");
      } else {
        console.error(`Unknown config key: ${key}`);
        process.exit(1);
      }
      saveConfig(config);
      console.log(`✓ Set ${key}`);
    } else if (action === "get") {
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log("Usage: tdp config <set|get> [key] [value]");
    }
  },

  async moment(args) {
    let content = "";
    let locale = "en";
    const media: { type: string; url: string }[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-l" || arg === "--locale") {
        locale = args[++i];
      } else if (arg === "-i" || arg === "--image") {
        const imagePath = args[++i];
        console.log(`Uploading ${imagePath}...`);
        const result = await uploadFile(imagePath);
        media.push({ type: "image", url: result.url });
      } else if (arg === "-v" || arg === "--video") {
        const videoPath = args[++i];
        console.log(`Uploading ${videoPath}...`);
        const result = await uploadFile(videoPath);
        media.push({ type: "video", url: result.url });
      } else {
        content = arg;
      }
    }

    if (!content) {
      console.error("Usage: tdp moment <content> [-i image] [-v video] [-l locale]");
      process.exit(1);
    }

    const res = await request("/api/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, media, locale }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed:", error.error);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`✓ Moment created: ${data.moment.id}`);
  },

  async post(args) {
    let filePath = "";
    let locale = "en";
    let publish = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-l" || arg === "--locale") {
        locale = args[++i];
      } else if (arg === "--publish") {
        publish = true;
      } else {
        filePath = arg;
      }
    }

    if (!filePath) {
      console.error("Usage: tdp post <file.md> [--publish] [-l locale]");
      process.exit(1);
    }

    const content = readFileSync(filePath, "utf-8");

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    let title = "";
    let slug = "";
    let excerpt = "";
    let tags: string[] = [];
    let body = content;

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      body = frontmatterMatch[2];

      for (const line of frontmatter.split("\n")) {
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":").trim();
        if (key === "title") title = value.replace(/^["']|["']$/g, "");
        if (key === "slug") slug = value;
        if (key === "excerpt") excerpt = value.replace(/^["']|["']$/g, "");
        if (key === "tags") tags = value.replace(/[\[\]]/g, "").split(",").map((t) => t.trim());
      }
    }

    if (!title) {
      // Extract title from first heading
      const headingMatch = body.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1] : filePath.split("/").pop()?.replace(".md", "") || "Untitled";
    }

    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    const res = await request("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        excerpt,
        content: body,
        tags,
        locale,
        status: publish ? "published" : "draft",
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed:", error.error);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`✓ Post created: ${data.post.slug} (${publish ? "published" : "draft"})`);
  },

  async upload(args) {
    for (const filePath of args) {
      console.log(`Uploading ${filePath}...`);
      const result = await uploadFile(filePath);
      console.log(`✓ ${result.url}`);
    }
  },

  async help() {
    console.log(`
TDP Lite CLI

Usage: tdp <command> [options]

Commands:
  config set api-key <key>    Set API key
  config set endpoint <url>   Set API endpoint
  config get                  Show current config

  moment <content>            Create a moment
    -i, --image <path>        Attach image
    -v, --video <path>        Attach video
    -l, --locale <en|zh>      Set locale (default: en)

  post <file.md>              Create a post from markdown
    --publish                 Publish immediately
    -l, --locale <en|zh>      Set locale (default: en)

  upload <file>...            Upload files to R2

Examples:
  tdp config set api-key tdp_sk_xxxxx
  tdp config set endpoint https://blog.example.com
  tdp moment "Hello world" -i ./photo.jpg -l zh
  tdp post ./article.md --publish
  tdp upload ./photos/*.jpg
`);
  },
};

// Main
const [, , command, ...args] = process.argv;

if (!command || !commands[command]) {
  commands.help([]);
} else {
  commands[command](args).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
