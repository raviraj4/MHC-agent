import React from 'react'

type FormattedTextProps = {
  text: string
  className?: string
}

function formatInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (/^\*[^*]+\*$/.test(part)) {
      // ASA commonly uses single asterisks for emphasis; render them boldly.
      return <strong key={key}>{part.slice(1, -1)}</strong>
    }
    if (/^__[^_]+__$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (/^_[^_]+_$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

export default function FormattedText({ text, className }: FormattedTextProps) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  return (
    <div className={className}>
      {lines.map((line, index) => {
        const trimmed = line.trim()
        const key = `line-${index}`

        if (!trimmed) {
          return <div key={key} className="h-2" aria-hidden="true" />
        }
        if (/^#{1,3}\s+/.test(trimmed)) {
          return <h4 key={key} className="mt-3 font-semibold first:mt-0">{formatInline(trimmed.replace(/^#{1,3}\s+/, ''), key)}</h4>
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return <div key={key} className="flex gap-2"><span aria-hidden="true">•</span><span>{formatInline(trimmed.replace(/^[-*]\s+/, ''), key)}</span></div>
        }
        return <div key={key}>{formatInline(line, key)}</div>
      })}
    </div>
  )
}
