import { instagramEmbedUrl, normalizeInstagramUrl } from '../../../lib/storyBlocks'

type Variant = 'editor' | 'view'

/**
 * Single Instagram preview (iframe only — do not also render blockquote/embed.js,
 * or Instagram will paint a second preview).
 */
export function InstagramEmbed({
  src,
  className,
  variant = 'view',
  'data-testid': testId = 'blog-instagram-embed',
}: {
  src: string
  className?: string
  variant?: Variant
  'data-testid'?: string
}) {
  const permalink = normalizeInstagramUrl(src) || src.trim()
  const embedSrc = instagramEmbedUrl(src)

  if (!permalink) return null

  if (!embedSrc) {
    return (
      <div
        className={className}
        data-testid={testId}
        data-instagram-src={permalink}
        style={{
          maxWidth: 540,
          margin: '0 auto',
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          padding: '16px 18px',
          textAlign: 'center',
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Instagram post</div>
        <a href={permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#0f766e' }}>
          Open on Instagram
        </a>
      </div>
    )
  }

  return (
    <div
      className={className}
      data-testid={testId}
      data-instagram-src={permalink}
      data-variant={variant}
      style={{ maxWidth: 540, margin: '0 auto' }}
    >
      <iframe
        key={embedSrc}
        src={`${embedSrc}/captioned`}
        title="Instagram post"
        loading="lazy"
        allow="encrypted-media; clipboard-write; web-share"
        allowFullScreen
        scrolling="no"
        className="story-instagram-iframe"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 540,
          minHeight: variant === 'editor' ? 560 : 680,
          margin: '0 auto',
          border: 0,
          borderRadius: 12,
          background: '#fafafa',
          overflow: 'hidden',
        }}
      />
      <p className="story-instagram-fallback" style={{ margin: '0.5rem 0 0', textAlign: 'center', fontSize: '0.8rem' }}>
        <a href={permalink} target="_blank" rel="noopener noreferrer">
          Open on Instagram
        </a>
      </p>
    </div>
  )
}
