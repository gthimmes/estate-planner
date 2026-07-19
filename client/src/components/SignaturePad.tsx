import { useEffect, useRef, useState } from 'react'

/**
 * Signature capture modal — a React port of `sigpad.js` from the user's own
 * e-sign (InkWell) project (MIT). Draw on a DPR-scaled canvas or type your
 * name rendered in a script font; either way the result is a trimmed
 * transparent PNG data URL.
 */

const INK = '#0b1f45'

function trimCanvas(canvas: HTMLCanvasElement): string {
  const g = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  const data = g.getImageData(0, 0, w, h).data
  let top = h,
    left = w,
    right = 0,
    bottom = 0,
    found = false
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        found = true
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (!found) return canvas.toDataURL('image/png')
  const pad = 6
  left = Math.max(0, left - pad)
  top = Math.max(0, top - pad)
  right = Math.min(w, right + pad)
  bottom = Math.min(h, bottom + pad)
  const out = document.createElement('canvas')
  out.width = right - left
  out.height = bottom - top
  out.getContext('2d')!.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

function typedToPng(text: string): string {
  const c = document.createElement('canvas')
  c.width = 600
  c.height = 200
  const g = c.getContext('2d')!
  g.fillStyle = INK
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  let size = 90
  g.font = `${size}px "Segoe Script","Brush Script MT",cursive`
  while (g.measureText(text).width > 560 && size > 24) {
    size -= 4
    g.font = `${size}px "Segoe Script","Brush Script MT",cursive`
  }
  g.fillText(text, 300, 105)
  return trimCanvas(c)
}

export function SignaturePad({
  defaultName,
  onApply,
  onCancel,
}: {
  defaultName: string
  onApply: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typed, setTyped] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)
  const hasInk = useRef(false)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || mode !== 'draw') return
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = r.width * dpr
    canvas.height = r.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK
    hasInk.current = false
  }, [mode])

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function apply() {
    if (mode === 'draw') {
      if (!hasInk.current) {
        setError('Please draw your signature.')
        return
      }
      onApply(trimCanvas(canvasRef.current!))
    } else {
      const t = typed.trim()
      if (!t) {
        setError('Please type your name.')
        return
      }
      onApply(typedToPng(t))
    }
  }

  function clear() {
    setError(null)
    setTyped('')
    const canvas = canvasRef.current
    if (canvas) {
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
      hasInk.current = false
    }
  }

  return (
    <div className="modal-bg" role="presentation">
      <div className="modal card" role="dialog" aria-modal="true" aria-label="Adopt your signature">
        <h2>Adopt your signature</h2>
        <p className="hint">Draw it, or type your name — it becomes part of your signing record.</p>
        <div className="sigpad-tabs" role="tablist" aria-label="Signature mode">
          <button
            role="tab"
            aria-selected={mode === 'draw'}
            className={mode === 'draw' ? 'active' : ''}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
          <button
            role="tab"
            aria-selected={mode === 'type'}
            className={mode === 'type' ? 'active' : ''}
            onClick={() => setMode('type')}
          >
            Type
          </button>
        </div>
        {mode === 'draw' ? (
          <canvas
            ref={canvasRef}
            className="sigpad-canvas"
            aria-label="Signature drawing area"
            onPointerDown={(e) => {
              e.preventDefault()
              ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
              drawing.current = true
              last.current = pos(e)
            }}
            onPointerMove={(e) => {
              if (!drawing.current || !last.current) return
              const ctx = canvasRef.current!.getContext('2d')!
              const p = pos(e)
              ctx.beginPath()
              ctx.moveTo(last.current.x, last.current.y)
              ctx.lineTo(p.x, p.y)
              ctx.stroke()
              last.current = p
              hasInk.current = true
            }}
            onPointerUp={() => {
              drawing.current = false
            }}
          />
        ) : (
          <div>
            <input
              className="sigpad-type-input"
              aria-label="Type your name"
              value={typed}
              placeholder="Type your name"
              onChange={(e) => setTyped(e.target.value)}
            />
            <p className="sigpad-preview" aria-hidden="true">
              {typed || 'Your name'}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="wizard-nav">
          <button className="secondary" onClick={clear}>
            Clear
          </button>
          <span style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="secondary" onClick={onCancel}>
              Cancel
            </button>
            <button onClick={apply}>Apply signature</button>
          </span>
        </div>
      </div>
    </div>
  )
}

/** Small reusable "e-sign" affordance for signing forms: button → modal → thumbnail. */
export function SignatureField({
  defaultName,
  value,
  onChange,
}: {
  defaultName: string
  value: string | null
  onChange: (dataUrl: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="signature-field">
      {value ? (
        <div className="signature-thumb-row">
          <img className="signature-image" src={value} alt="Your adopted signature" />
          <button type="button" className="link danger" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          Add e-signature
        </button>
      )}
      {open && (
        <SignaturePad
          defaultName={defaultName}
          onApply={(dataUrl) => {
            onChange(dataUrl)
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  )
}
