import fs from "node:fs";
import path from "node:path";

// Blog posts live as Markdown files in apps/web/content/blog. Each file
// starts with a small header block:
//
//   ---
//   title: My post title
//   description: One sentence shown on the blog list and in search results.
//   date: 2026-10-22
//   author: Ananya Kalra
//   ---
//
// The file name (without .md) becomes the URL: my-post.md → /blog/my-post.
// Files whose name starts with "_" are drafts and are not published.

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parseFile(slug: string, raw: string): BlogPost {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const header: Record<string, string> = {};
  let body = raw;
  if (match) {
    body = match[2] ?? "";
    for (const line of (match[1] ?? "").split("\n")) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      const key = line.slice(0, i).trim().toLowerCase();
      const value = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      header[key] = value;
    }
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: header["title"] ?? slug,
    description: header["description"] ?? "",
    date: header["date"] ?? "",
    author: header["author"] ?? "The Easymarker team",
    readingMinutes: Math.max(1, Math.round(words / 220)),
    html: markdownToHtml(body),
  };
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const { html: _html, ...meta } = parseFile(f.replace(/\.md$/, ""), fs.readFileSync(path.join(BLOG_DIR, f), "utf8"));
      return meta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): BlogPost | null {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseFile(slug, fs.readFileSync(file, "utf8"));
}

export function formatPostDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// A small Markdown renderer covering what blog posts need: headings,
// paragraphs, bold/italic, links, images, inline code, code blocks, lists,
// block quotes and horizontal rules. Posts are written by the site owner,
// but HTML in them is still escaped so a stray "<" can't break the page.

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;
  return "#";
}

function inline(text: string): string {
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = escapeHtml(out);
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, alt: string, src: string) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`
  );
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const url = safeUrl(href);
    const external = /^https?:/i.test(url);
    return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? "");
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        code.push(lines[i] ?? "");
        i++;
      }
      i++;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      // A post's title is already the page's h1, so "#" maps to h2.
      const level = Math.min(heading[1]!.length + 1, 4);
      html.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push("<hr />");
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        quote.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    const ordered = /^\d+\.\s+/.test(line);
    if (ordered || /^[-*]\s+/.test(line)) {
      const tag = ordered ? "ol" : "ul";
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i] ?? "")) {
        items.push(`<li>${inline((lines[i] ?? "").replace(pattern, ""))}</li>`);
        i++;
      }
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,4}\s|```|>|[-*]\s|\d+\.\s)/.test(lines[i] ?? "")
    ) {
      para.push((lines[i] ?? "").trim());
      i++;
    }
    const text = para.join(" ");
    const onlyImage = /^!\[[^\]]*\]\([^)\s]+\)$/.test(text);
    html.push(onlyImage ? `<figure>${inline(text)}</figure>` : `<p>${inline(text)}</p>`);
  }

  return html.join("\n");
}
