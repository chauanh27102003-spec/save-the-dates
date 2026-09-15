import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Button, Modal } from './ui'
import { InvitationCard } from './InvitationCard'

/**
 * The blocking pop-up a partner sees the moment they open the app with
 * something waiting: an invitation, a response, or a link request.
 */
export function NotificationPopup() {
  const { popup, dates, places, world, actions } = useApp()
  const nav = useNavigate()
  const { pathname } = useLocation()

  if (!popup) return null
  if (pathname === '/auth' || pathname.startsWith('/plan')) return null

  const date = popup.refId ? dates.find((d) => d.id === popup.refId) : null
  // Don't re-prompt while the user is already looking at the thing.
  if (date && pathname === `/dates/${date.id}`) return null

  const place = date ? places.find((p) => p.id === date.placeId) ?? null : null
  const from = date ? world.users.find((u) => u.id === date.createdBy) : null

  function go() {
    actions.markRead(popup!.id)
    if (date) nav(`/dates/${date.id}`)
    else if (popup!.kind === 'pair') nav('/link')
    else nav('/notifications')
  }

  return (
    <Modal open>
      <div className="bg-cream p-5">
        <div className="mb-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {popup.kind === 'invitation'
              ? 'New invitation'
              : popup.kind === 'pair'
                ? 'Link request'
                : 'New activity'}
          </p>
          <h3 className="mt-1 text-xl font-extrabold leading-snug">{popup.title}</h3>
        </div>

        {date ? (
          <InvitationCard
            invitation={date.invitation}
            start={date.start}
            end={date.end}
            place={place}
            from={from?.name}
            compact
          />
        ) : (
          <div className="rounded-card bg-white p-4 text-center">
            <p className="text-3xl">{popup.kind === 'pair' ? '🔗' : '💬'}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-plum-soft">{popup.body}</p>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <Button size="lg" full onClick={go}>
            {popup.kind === 'invitation' ? 'Open invitation' : 'Take a look'}
          </Button>
          <Button variant="ghost" full onClick={() => actions.dismissPopup(popup.id)}>
            Later
          </Button>
        </div>
      </div>
    </Modal>
  )
}
