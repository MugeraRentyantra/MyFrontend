import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Input,
  toast,
} from '@/shared/components/ui';
import { Mail, Save, User } from '@/shared/icons';
import { SUPPORT_EMAIL } from '@/shared/constants';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { useUpdateProfile } from '../hooks/useProfile';
import { PROFILE_NAME_MAX, profileSchema } from '../schemas/profileValidation';

/**
 * Edit personal details (GP11): name only (2-80 characters) -> PATCH /auth/me, then the
 * session user is updated everywhere (top bar, menus) and a toast confirms the change.
 */
export function ProfileForm({ user, className }) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { name: user?.name ?? '' },
  });

  // Follow outside changes (fresh /auth/me) unless the student is in the middle of editing.
  const currentName = user?.name ?? '';
  useEffect(() => {
    if (!isDirty) reset({ name: currentName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentName, reset]);

  const onSubmit = async (values) => {
    if (updateProfile.isPending) return;
    try {
      const updated = await updateProfile.mutateAsync({ name: values.name });
      reset({ name: updated?.name ?? values.name });
      toast.success('Profile updated', { description: 'Your name has been saved.' });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors.name) {
        setError('name', { type: 'server', message: fieldErrors.name });
      } else {
        toast.error(getErrorMessage(error, "We couldn't save your changes. Please try again."));
      }
    }
  };

  const saving = isSubmitting || updateProfile.isPending;

  return (
    <Card padding="none" className={className}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col">
        <CardHeader
          icon={User}
          title="Personal details"
          description="Use your full name as it should appear on your certificate."
        />
        <CardBody className="flex-1 space-y-5">
          <Input
            label="Full name"
            required
            autoComplete="name"
            maxLength={PROFILE_NAME_MAX}
            error={errors.name?.message}
            hint={`2–${PROFILE_NAME_MAX} characters.`}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            value={user?.email ?? ''}
            readOnly
            leftIcon={Mail}
            hint={`Your sign-in email can't be changed here. Contact ${SUPPORT_EMAIL} if you need to update it.`}
          />
        </CardBody>
        <CardFooter>
          {isDirty ? (
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => reset({ name: currentName })}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" leftIcon={Save} loading={saving} disabled={!isDirty}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default ProfileForm;
