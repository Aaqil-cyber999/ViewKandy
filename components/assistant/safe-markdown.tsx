import type { ReactNode } from "react";

const TOKEN = /(\*\*[^*]+\*\*|_[^_\n]+_|`[^`\n]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN.lastIndex = 0;

  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-ink-700/80 px-1 py-0.5 font-mono text-[11px] text-accent">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline decoration-accent/40 underline-offset-2 hover:text-sky-300"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <em key={key} className="text-slate-300">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Minimal, safe Markdown renderer for assistant output. It never uses
 * dangerouslySetInnerHTML: only bold, italics, inline code, http(s) links,
 * headings, lists and paragraphs are rendered.
 */
export function SafeMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const content = paragraph.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[13px] leading-6 text-slate-300">
        {renderInline(content, `p-${blocks.length}`)}
      </p>,
    );
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const items = list.items.map((item, index) => (
      <li key={index} className="pl-1">
        {renderInline(item, `li-${blocks.length}-${index}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`ol-${blocks.length}`} className="ml-4 list-decimal space-y-1 text-[13px] leading-6 text-slate-300">
          {items}
        </ol>
      ) : (
        <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-1 text-[13px] leading-6 text-slate-300">
          {items}
        </ul>
      ),
    );
    list = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1]!.length;
      blocks.push(
        <p
          key={`h-${blocks.length}`}
          className={
            level === 1
              ? "pt-1 text-base font-semibold text-white"
              : "pt-1 text-[13px] font-semibold text-white"
          }
        >
          {renderInline(heading[2]!, `h-${blocks.length}`)}
        </p>,
      );
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-line/70" />);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const orderedMode = Boolean(ordered);
      if (!list || list.ordered !== orderedMode) {
        flushList();
        list = { ordered: orderedMode, items: [] };
      }
      list.items.push((bullet?.[1] ?? ordered?.[1]) as string);
      continue;
    }

    if (list) {
      // Continuation of the previous list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <div className="space-y-2.5">{blocks}</div>;
}
