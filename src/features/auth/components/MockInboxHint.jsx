import { StatusBanner } from '@/shared/components/ui';
import { USE_MOCKS } from '@/shared/constants';
import { Inbox } from '@/shared/icons';

/** Mock mode only: points to the Mock API devtools inbox where "sent" emails appear. */
export function MockInboxHint({ className }) {
  if (!USE_MOCKS) return null;
  return (
    <StatusBanner variant="info" icon={Inbox} title="Using the mock API?" className={className}>
      Open Mock API → Inbox (bottom-left) to find the link.
    </StatusBanner>
  );
}

export default MockInboxHint;
