import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import { Card, EmptyState, ScreenHeader } from '../components/ui'
import { relativeTime } from '../lib/date-utils'
import type { NotificationKind } from '../lib/types'

const ICON: Record<NotificationKind, string> = {
  invitation: '💌',
  response: '💬',
  milestone: '⏳',
  review: '📖',
  pair: '🔗',
  system: 'ℹ️',
}

export default function Notifications() {
  const { notifications, actions } = useApp()
  const nav = useNavigate()

  function open(id: string, kind: NotificationKind, refId: string | null) {
    actions.markRead(id)
    if ((kind === 'invitation' || kind === 'response' || kind === 'review') && refId) {
      nav(`/dates/${refId}`)
    } else if (kind === 'milestone') {
      nav('/milestones')
    }
  }

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader
          title="Notifications"
          back="/home"
          right={
            notifications.some((n) => !n.read) ? (
              <button
                onClick={actions.markAllRead}
                className="mt-1 shrink-0 text-[13px] font-bold text-rose"
              >
                Mark all read
              </button>
            ) : undefined
          }
        />
      </div>

      {notifications.length === 0 ? (
        <EmptyState emoji="🔔" title="All quiet" body="Invitations and reminders will show up here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => open(n.id, n.kind, n.refId)}
              className={n.read ? 'opacity-60' : ''}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{ICON[n.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-plum-soft">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-rose" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}
