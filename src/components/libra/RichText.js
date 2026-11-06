// Libra writes light markdown: paragraphs, "- " / "1." lists, **bold**. Rendered as
// React elements (never as HTML), so nothing in a reply can inject markup.
const LIST_ITEM = /^\s*([-*•]|\d+[.)])\s+/

function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      : part,
  )
}

// Consecutive list lines become one list, anything else a paragraph, so a
// half-streamed reply already shows its bullets as bullets.
// `tail` (the streaming caret) goes at the end of the last line.
export default function RichText({ text, tail = null }) {
  const groups = []
  text.trim().split('\n').forEach((line) => {
    const isItem = LIST_ITEM.test(line)
    const last = groups[groups.length - 1]
    if (!line.trim()) {
      groups.push({ type: 'gap' })
    } else if (isItem) {
      const ordered = /^\s*\d/.test(line)
      if (last?.type === 'list' && last.ordered === ordered) last.lines.push(line.replace(LIST_ITEM, ''))
      else groups.push({ type: 'list', ordered, lines: [line.replace(LIST_ITEM, '')] })
    } else if (last?.type === 'p') {
      last.lines.push(line)
    } else {
      groups.push({ type: 'p', lines: [line] })
    }
  })

  const blocks = groups.filter((g) => g.type !== 'gap')
  return blocks.map((g, b) => {
    const end = (i) => (b === blocks.length - 1 && i === g.lines.length - 1 ? tail : null)
    if (g.type === 'list') {
      const Tag = g.ordered ? 'ol' : 'ul'
      return <Tag key={b}>{g.lines.map((l, i) => <li key={i}>{inline(l, `${b}-${i}`)}{end(i)}</li>)}</Tag>
    }
    return (
      <p key={b}>
        {g.lines.map((l, i) => <span key={i}>{i > 0 && <br />}{inline(l, `${b}-${i}`)}{end(i)}</span>)}
      </p>
    )
  })
}
