/**
 * Lightweight markdown renderer for NexMessAI chat bubbles.
 * Handles: bold, headers, tables, bullet lists, blockquotes/notices, and inline code.
 * No external dependencies — keeps the bundle lean.
 */

interface MarkdownRendererProps {
  text: string
  className?: string
}

export default function MarkdownRenderer({ text, className = '' }: MarkdownRendererProps) {
  const blocks = parseBlocks(text)

  return (
    <div className={`markdown-content space-y-1.5 ${className}`}>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </div>
  )
}

// ─── Block Parser ───────────────────────────────────────

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'bullet'; items: string[] }
  | { type: 'notice'; text: string }
  | { type: 'paragraph'; text: string }

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    // Heading: ### / ## / #
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] })
      i++
      continue
    }

    // Bold-only lines as pseudo-headers (e.g., "**Today's Menu**")
    const boldLineMatch = trimmed.match(/^\*\*(.+?)\*\*\s*[-—:]?\s*$/)
    if (boldLineMatch && trimmed.length < 80) {
      blocks.push({ type: 'heading', level: 3, text: boldLineMatch[1] })
      i++
      continue
    }

    // Table: starts and ends with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      const parsed = parseTable(tableLines)
      if (parsed) {
        blocks.push(parsed)
      }
      continue
    }

    // Blockquote (> ...) or parenthesized notice line
    if (trimmed.startsWith('>') || /^\*?Notice:/i.test(trimmed) || /^\(Notice:/i.test(trimmed)) {
      const noticeText = trimmed.replace(/^>\s?/, '')
      blocks.push({ type: 'notice', text: noticeText })
      i++
      continue
    }

    // Bullet list: - or • or *
    if (/^[-•*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'bullet', items })
      continue
    }

    // Numbered list: 1. 2. etc — treat as bullet
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ type: 'bullet', items })
      continue
    }

    // Default: paragraph (group consecutive non-empty lines)
    let paraText = trimmed
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-•*]\s/.test(lines[i].trim()) &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !/^\*\*(.+?)\*\*\s*[-—:]?\s*$/.test(lines[i].trim()) &&
      !/^\(Notice:/i.test(lines[i].trim())
    ) {
      paraText += ' ' + lines[i].trim()
      i++
    }
    blocks.push({ type: 'paragraph', text: paraText })
  }

  return blocks
}

function parseTable(lines: string[]): Block | null {
  if (lines.length < 2) return null

  const parseLine = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())

  const headers = parseLine(lines[0])
  const startRow = lines[1].includes('---') ? 2 : 1
  const rows = lines.slice(startRow).map(parseLine)

  if (headers.length === 0) return null

  return { type: 'table', headers, rows }
}

// ─── Inline Rendering ───────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)/g
  let lastIdx = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }

    if (match[1]) {
      parts.push(
        <strong key={match.index} className="text-nex-text font-semibold">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          className="bg-nex-elevated text-nex-text rounded px-1.5 py-0.5 font-mono text-[11px]"
        >
          {match[4]}
        </code>
      )
    } else if (match[5]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[6]}
        </em>
      )
    }

    lastIdx = match.index + match[0].length
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  return parts.length > 0 ? parts : [text]
}

// ─── Block Rendering ────────────────────────────────────

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return (
        <div
          className={`text-nex-text font-bold ${
            block.level === 1
              ? 'mt-2.5 mb-1 text-[15px]'
              : block.level === 2
                ? 'mt-2 mb-1 text-sm'
                : 'mt-1.5 mb-0.5 text-[13px]'
          }`}
        >
          {renderInline(block.text)}
        </div>
      )

    case 'table':
      return (
        <div className="border-nex-border my-2 overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-nex-elevated/90">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-nex-text border-nex-border border-b px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-nex-border/50 even:bg-nex-elevated/35 border-b last:border-0"
                >
                  {block.headers.map((_, ci) => (
                    <td key={ci} className="text-nex-text px-3 py-2 align-top text-xs">
                      {row[ci] ? renderInline(row[ci]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'notice':
      return (
        <div className="border-nex-border bg-nex-elevated/60 text-nex-muted my-1.5 rounded-lg border-l-2 border-l-amber-500/70 px-3 py-1.5 text-[11.5px] leading-relaxed">
          {renderInline(block.text)}
        </div>
      )

    case 'bullet':
      return (
        <ul className="my-1 space-y-1 pl-4">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="text-nex-text relative text-[13px] leading-relaxed before:absolute before:-left-3 before:top-[9px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-500/70"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )

    case 'paragraph':
      return (
        <p className="text-nex-text text-[13px] leading-relaxed">
          {renderInline(block.text)}
        </p>
      )
  }
}
