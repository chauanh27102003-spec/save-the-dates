import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

/**
 * Overlays render into the phone shell so they sit above the bottom nav and
 * stay clipped to the device frame instead of the browser window.
 */
function usePhoneRoot() {
  const [root, setRoot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRoot(document.getElementById('phone-root'))
  }, [])
  return root
}

/* ------------------------------------------------------------------ Button */

type Variant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-rose text-white shadow-[0_10px_24px_-10px_rgba(232,99,122,0.9)] active:bg-rose-dark',
  soft: 'bg-blush text-plum active:bg-[#ffd7d7]',
  ghost: 'bg-transparent text-plum-soft active:bg-black/5',
  outline: 'bg-white text-plum border border-line active:bg-cream',
  danger: 'bg-white text-[#c0392b] border border-[#f3d3ce] active:bg-[#fdf0ee]',
}

export function Button({
  variant = 'primary',
  full,
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  full?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: 'h-9 px-4 text-[13px]',
    md: 'h-12 px-5 text-[15px]',
    lg: 'h-14 px-6 text-base',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${
        sizes[size]
      } ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
    />
  )
}

/* -------------------------------------------------------------------- Card */

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  // Tailwind utility order, not attribute order, decides which background wins —
  // so only add the default when the caller has not supplied one.
  const hasBackground = /(^|\s)bg-/.test(className)
  const hasPadding = /(^|\s)p-/.test(className)
  return (
    <div
      onClick={onClick}
      className={`rounded-card shadow-[0_8px_30px_-18px_rgba(51,32,58,0.35)] ${
        hasBackground ? '' : 'bg-white'
      } ${hasPadding ? '' : 'p-4'} ${
        onClick ? 'cursor-pointer transition active:scale-[0.985]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------- Input */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-plum-soft">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-plum outline-none placeholder:text-muted focus:border-rose focus:ring-4 focus:ring-rose/10 transition'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${className}`} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none leading-relaxed ${className}`} />
}

/* -------------------------------------------------------------------- Chip */

export function Chip({
  children,
  active,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 ${
        active ? 'bg-plum text-white' : 'border border-line bg-white text-plum-soft'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'rose' | 'mint' | 'amber' | 'violet' }) {
  const tones = {
    neutral: 'bg-cream text-plum-soft',
    rose: 'bg-blush text-rose-dark',
    mint: 'bg-[#e4f5ec] text-[#2f7a58]',
    amber: 'bg-[#fdf0dc] text-[#a2701f]',
    violet: 'bg-lilac text-violet',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  emoji,
  color,
  size = 40,
  ring,
}: {
  emoji: string
  color: string
  size?: number
  ring?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${ring ? 'ring-2 ring-white' : ''}`}
      style={{ width: size, height: size, background: `${color}22`, fontSize: size * 0.5 }}
    >
      {emoji}
    </span>
  )
}

/* ------------------------------------------------------------------- Stars */

export function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number
  onChange?: (n: number) => void
  size?: number
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? 'transition active:scale-90' : 'cursor-default'}
          style={{ fontSize: size, lineHeight: 1 }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <span className={n <= Math.round(value) ? 'opacity-100' : 'opacity-25 grayscale'}>⭐️</span>
        </button>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------- Sheet */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const root = usePhoneRoot()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !root) return null
  return createPortal(
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-plum/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-slide-up no-scrollbar relative max-h-[86%] overflow-y-auto rounded-t-[28px] bg-cream px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {title && <h2 className="mb-4 text-xl font-extrabold">{title}</h2>}
        {children}
      </div>
    </div>,
    root,
  )
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
}) {
  const root = usePhoneRoot()
  if (!open || !root) return null
  return createPortal(
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-plum/45 backdrop-blur-[3px]" onClick={onClose} />
      <div className="anim-pop no-scrollbar relative max-h-[88%] w-full overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        {children}
      </div>
    </div>,
    root,
  )
}

/* ------------------------------------------------------------------- Toast */

const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {msg && (
        <div className="anim-fade-up pointer-events-none absolute inset-x-5 bottom-28 z-[80] rounded-2xl bg-plum px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

/* ------------------------------------------------------------------ Header */

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string
  subtitle?: string
  back?: boolean | string
  right?: ReactNode
}) {
  const nav = useNavigate()
  return (
    <div className="mb-4 flex items-start gap-3">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm transition active:scale-90"
          aria-label="Back"
        >
          ←
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-plum-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="mt-1 max-w-[260px] text-sm leading-relaxed text-plum-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="my-4 h-px bg-line" />
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-line" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}
