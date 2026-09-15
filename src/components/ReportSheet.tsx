import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../lib/store'
import { APP_VERSION, FEEDBACK_EMAIL } from '../lib/config'
import { lastMeaningfulRoute, routeTrail } from '../lib/trail'
import type { FeedbackKind, FeedbackReport } from '../lib/types'
import { Button, Chip, Sheet, Textarea, useToast } from './ui'

const KINDS: { id: FeedbackKind; label: string; placeholder: string }[] = [
  {
    id: 'bug',
    label: '🐞 Something broke',
    placeholder: 'What did you tap, what did you expect, what happened instead?',
  },
  {
    id: 'idea',
    label: '💡 Idea',
    placeholder: 'What would make this better?',
  },
  {
    id: 'other',
    label: '💬 Anything else',
    placeholder: 'Tell me what is on your mind.',
  },
]

const SCREEN_NAMES: Record<string, string> = {
  '/home': 'Home',
  '/dates': 'Dates',
  '/plan': 'Plan a date',
  '/wishlist': 'Places',
  '/milestones': 'Countdowns',
  '/profile': 'You',
  '/calendar': 'Calendars',
  '/link': 'Find your person',
  '/notifications': 'Notifications',
}

function screenName(path: string) {
  if (SCREEN_NAMES[path]) return SCREEN_NAMES[path]
  if (path.startsWith('/dates/')) return 'Date detail'
  if (path.startsWith('/wishlist/')) return 'Place detail'
  if (path.startsWith('/review/')) return 'Review a date'
  return path
}

export function ReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useApp()
  const toast = useToast()
  const { pathname } = useLocation()

  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [screen, setScreen] = useState(pathname)
  const [sent, setSent] = useState<FeedbackReport | null>(null)

  useEffect(() => {
    if (open) {
      setKind('bug')
      setMessage('')
      setSent(null)
      setScreen(lastMeaningfulRoute(pathname))
    }
  }, [open, pathname])

  const active = KINDS.find((k) => k.id === kind)!
  const candidates = Array.from(new Set([...routeTrail(), pathname])).reverse()

  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      setSent(await actions.submitFeedback({ kind, message, screen }))
      toast('Thanks — report sent 🙏')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not send that report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={sent ? 'Report saved' : 'Report a problem'}>
      {sent ? (
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-plum-soft">
            Saved on this device with the diagnostics below. Nothing leaves your phone unless you
            send it.
          </p>
          <pre className="no-scrollbar overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-[12px] leading-relaxed text-plum-soft">
            {reportText(sent)}
          </pre>
          <div className="space-y-2">
            {FEEDBACK_EMAIL && (
              <Button
                full
                size="lg"
                onClick={() => {
                  window.location.href = mailtoFor(sent)
                  onClose()
                }}
              >
                Send by email
              </Button>
            )}
            <Button
              variant="outline"
              full
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reportText(sent))
                  toast('Copied to clipboard')
                } catch {
                  toast('Could not copy — select the text above')
                }
              }}
            >
              Copy report
            </Button>
            <Button variant="ghost" full onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {KINDS.map((k) => (
              <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </Chip>
            ))}
          </div>

          <Textarea
            rows={5}
            autoFocus
            maxLength={1000}
            placeholder={active.placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Which screen?</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {candidates.map((p) => (
                <Chip key={p} active={screen === p} onClick={() => setScreen(p)}>
                  {screenName(p)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3.5 text-[12px] leading-relaxed text-muted">
            Attached automatically: app v{APP_VERSION}, your browser, screen size and the route
            above. Your invitations, diary entries, photos and calendar events are not included.
          </div>

          <Button size="lg" full disabled={!message.trim() || busy} onClick={() => void submit()}>
            {busy ? 'Sending…' : 'Send report'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function reportText(r: FeedbackReport) {
  return [
    `Kind:    ${r.kind}`,
    `Screen:  ${screenName(r.screen)} (${r.screen})`,
    `When:    ${new Date(r.createdAt).toLocaleString()}`,
    `Version: ${r.appVersion}`,
    `Viewport:${r.viewport}`,
    `Browser: ${r.userAgent}`,
    '',
    r.message,
  ].join('\n')
}

function mailtoFor(r: FeedbackReport) {
  const subject = `[Save the Dates] ${r.kind} on ${screenName(r.screen)}`
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    reportText(r),
  )}`
}

export { reportText, screenName }
