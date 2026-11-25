/**
 * Lightweight markdown renderer for NexMessAI chat bubbles.
 * Handles: bold, headers, tables, bullet lists, and inline code.
 * No external dependencies — keeps the bundle lean.
 */

interface MarkdownRendererProps {
  text: string
  className?: string
}

export default function MarkdownRenderer({ text, className = '' }: MarkdownRendererProps) {
  const blocks = parseBlocks(text)

  return (
    <div className={`markdown-content ${className}`}>
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
  | { type: 'paragraph'; text: string }

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
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

    // Table: starts with |
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
      !/^[-•*]\s/.test(lines[i].trim()) &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !/^\*\*(.+?)\*\*\s*[-—:]?\s*$/.test(lines[i].trim())
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
      .slice(1, -1) // remove first/last empty from leading/trailing |
      .map((c) => c.trim())

  const headers = parseLine(lines[0])

  // Check if line[1] is a separator (---|---), if so skip it
  const startRow = lines[1].includes('---') ? 2 : 1
  const rows = lines.slice(startRow).map(parseLine)

  if (headers.length === 0) return null

  return { type: 'table', headers, rows }
}

// ─── Inline Rendering ───────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Process bold (**text**), inline code (`code`), and italic (*text*)
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)/g
  let lastIdx = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }

    if (match[1]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-bold">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code
          key={match.index}
          className="bg-nex-elevated rounded px-1.5 py-0.5 font-mono text-[11px]"
        >
          {match[4]}
        </code>
      )
    } else if (match[5]) {
      // Italic
      parts.push(
        <em key={match.index} className="italic">
          {match[6]}
        </em>
      )
    }

    lastIdx = match.index + match[0].length
  }

  // Push remaining text
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
          className={`font-bold ${
            block.level === 1
              ? 'text-nex-text mt-2 mb-1.5 text-sm'
              : block.level === 2
                ? 'text-nex-text mt-2 mb-1 text-[13px]'
                : 'text-nex-text mt-1.5 mb-0.5 text-xs'
          }`}
        >
          {renderInline(block.text)}
        </div>
      )

    case 'table':
      return (
        <div className="border-nex-border my-2.5 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-nex-elevated/80">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-nex-text border-nex-border border-b px-2.5 py-1.5 text-left text-[11px] font-semibold whitespace-nowrap"
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
                  className="border-nex-border/50 even:bg-nex-elevated/25 border-b last:border-0"
                >
                  {block.headers.map((_, ci) => (
                    <td key={ci} className="text-nex-text px-2.5 py-1.5 align-top text-[11px]">
                      {row[ci] ? renderInline(row[ci]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'bullet':
      return (
        <ul className="my-1 space-y-0.5 pl-4">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="text-nex-text relative text-[11.5px] leading-relaxed before:absolute before:-left-3 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-current before:opacity-40"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )

    case 'paragraph':
      return (
        <p className="text-nex-text my-0.5 text-[11.5px] leading-relaxed">
          {renderInline(block.text)}
        </p>
      )
  }
}
