import type { Invitation, Place } from '../lib/types'
import { templateById } from '../lib/templates'
import { fmtLongDay, fmtRange } from '../lib/date-utils'

export function InvitationCard({
  invitation,
  start,
  end,
  place,
  from,
  compact,
}: {
  invitation: Invitation
  start: string
  end: string
  place?: Place | null
  from?: string
  compact?: boolean
}) {
  const tpl = templateById(invitation.templateId)
  return (
    <div className={`overflow-hidden rounded-card ${tpl.bg} ${tpl.ink} shadow-lg`}>
      {invitation.photo && (
        <img
          src={invitation.photo}
          alt=""
          className={`w-full object-cover ${compact ? 'h-28' : 'h-40'}`}
        />
      )}
      <div className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest opacity-70">
          <span className="text-base">{tpl.emoji}</span>
          {from ? `From ${from}` : tpl.name}
        </div>
        <h3 className={`mt-2 font-extrabold leading-tight ${compact ? 'text-lg' : 'text-[23px]'}`}>
          {invitation.headline}
        </h3>
        {!compact && (
          <p className="mt-2 text-[14px] leading-relaxed opacity-90">{invitation.message}</p>
        )}
        <div className="mt-4 space-y-1.5 rounded-2xl bg-black/15 p-3 text-[13px] backdrop-blur-sm">
          <p className="flex items-center gap-2">
            <span>🗓</span>
            <span className="font-semibold">{fmtLongDay(start)}</span>
          </p>
          <p className="flex items-center gap-2">
            <span>⏰</span>
            <span className="font-semibold">{fmtRange(start, end)}</span>
          </p>
          <p className="flex items-center gap-2">
            <span>📍</span>
            <span className="truncate font-semibold">{place ? place.name : 'To be decided'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
