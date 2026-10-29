import { useState } from 'react';
import { Badge, CopyButton, DescriptionList, Drawer } from '@/shared/components/ui';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { auditActionLabel, entityTypeLabel, personName } from '../utils/format';
import { AuditDiff } from './AuditDiff';
import { DetailSection } from './DetailSection';
import { PersonCell } from './PersonCell';

/** GP13 audit entry drawer: who did what to which record, and the before/after diff. `log` null = closed. */
export function AuditLogDrawer({ log, onClose }) {
  // Keep the last entry on screen while the drawer closes.
  const [shown, setShown] = useState(log);
  if (log && log !== shown) setShown(log);
  const entry = shown;

  return (
    <Drawer
      open={Boolean(log)}
      onClose={onClose}
      size="xl"
      title={entry ? auditActionLabel(entry.action) : 'Audit entry'}
      description={
        entry ? `${personName(entry.actor, 'Unknown admin')} · ${formatDateTime(entry.createdAt)}` : undefined
      }
    >
      {entry ? (
        <div className="space-y-8">
          <DescriptionList
            items={[
              {
                label: 'Action',
                value: (
                  <Badge variant="neutral" className="font-mono">
                    {entry.action}
                  </Badge>
                ),
              },
              {
                label: 'When',
                value: (
                  <>
                    <span className="block">{formatDateTime(entry.createdAt)}</span>
                    <span className="block text-slate-500">{formatRelativeTime(entry.createdAt)}</span>
                  </>
                ),
              },
              {
                label: 'Actor',
                value: entry.actor ? <PersonCell person={entry.actor} avatarSize="xs" /> : 'Unknown admin',
                span: 2,
              },
              { label: 'Entity type', value: entityTypeLabel(entry.entityType) },
              {
                label: 'Entity ID',
                value: entry.entityId ? (
                  <span className="inline-flex max-w-full items-center gap-2">
                    <span className="break-all font-mono text-xs">{entry.entityId}</span>
                    <CopyButton value={entry.entityId} iconOnly label="Copy entity ID" variant="ghost" />
                  </span>
                ) : null,
              },
              {
                label: 'IP address',
                value: entry.ip ? <span className="font-mono text-xs">{entry.ip}</span> : null,
              },
            ]}
          />

          <DetailSection
            title="Changes"
            description="The record before and after this action. Changed fields are highlighted."
          >
            <AuditDiff key={entry._id} before={entry.before} after={entry.after} />
          </DetailSection>
        </div>
      ) : null}
    </Drawer>
  );
}

export default AuditLogDrawer;
