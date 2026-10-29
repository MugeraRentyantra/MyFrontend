import { useMemo, useRef, useState } from 'react';
import { Button, Card, CardBody, CardHeader, toast } from '@/shared/components/ui';
import { Send, UserPlus } from '@/shared/icons';
import { INVITE_EXPIRY_DAYS } from '@/shared/constants';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { pluralize } from '@/shared/utils/helpers';
import { useInviteMembers } from '../hooks/useTeamMutations';
import { blockedInviteEmails, seatsLeft } from '../utils/teamUtils';
import { EmailChipsInput } from './EmailChipsInput';

/**
 * Leader-only panel to invite more teammates while the team is forming (SN11).
 * The list is capped at the seats still free (TEAM_MAX_MEMBERS includes the leader).
 * `members` = Team.members (to block people already invited or on the team).
 */
export function InvitePanel({ teamId, members, ownEmail, className }) {
  const invite = useInviteMembers(teamId);
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState(null);
  const inputRef = useRef(null);

  const remaining = seatsLeft(members);
  const blocked = useMemo(() => blockedInviteEmails(members), [members]);

  const handleEmailsChange = (next) => {
    setEmails(next);
    if (formError) setFormError(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (invite.isPending) return;
    // Text that could not become a chip already shows its message: let the person fix it.
    if (draft.trim()) {
      inputRef.current?.focus();
      return;
    }
    if (emails.length === 0) {
      setFormError('Add at least one email address.');
      inputRef.current?.focus();
      return;
    }
    setFormError(null);
    const sent = emails;
    invite.mutate(sent, {
      onSuccess: (result) => {
        const count = result?.items?.length || sent.length;
        toast.success(count === 1 ? 'Invite sent' : `${count} invites sent`, {
          description: `Invites are valid for ${INVITE_EXPIRY_DAYS} days.`,
        });
        setEmails([]);
      },
      onError: (error) => {
        const fieldMessage = Object.values(getFieldErrors(error))[0];
        setFormError(fieldMessage || getErrorMessage(error, "Couldn't send the invites."));
      },
    });
  };

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={UserPlus}
        title="Invite teammates"
        description={`Your team has room for ${pluralize(remaining, 'more person', 'more people')}. Invites expire after ${INVITE_EXPIRY_DAYS} days.`}
      />
      <CardBody>
        <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-label="Invite teammates">
          <EmailChipsInput
            ref={inputRef}
            label="Email addresses"
            value={emails}
            onChange={handleEmailsChange}
            onDraftChange={setDraft}
            max={remaining}
            ownEmail={ownEmail}
            blocked={blocked}
            error={formError}
            disabled={invite.isPending}
          />
          <Button
            type="submit"
            leftIcon={Send}
            loading={invite.isPending}
            disabled={remaining === 0}
            fullWidth
          >
            {emails.length > 1 ? `Send ${emails.length} invites` : 'Send invite'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default InvitePanel;
