import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/components/ui';
import { Hash, ShieldCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { CERTIFICATE_NO_EXAMPLE, verifySchema } from '../schemas/verifyValidation';

/**
 * Certificate number lookup (SN12). Trims and upper-cases the input, then calls
 * `onVerify(certificateNo)`; the page turns that into /verify/:number.
 */
export function VerifyForm({ defaultValue = '', onVerify, loading = false, className }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(verifySchema),
    mode: 'onTouched',
    defaultValues: { certificateNo: defaultValue },
  });

  // Keep the field in sync when the number in the URL changes (sample links, back/forward).
  useEffect(() => {
    reset({ certificateNo: defaultValue });
  }, [defaultValue, reset]);

  const onSubmit = ({ certificateNo }) => {
    if (onVerify) onVerify(certificateNo);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      role="search"
      aria-label="Verify a certificate"
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start', className)}
    >
      <Input
        label="Certificate number"
        placeholder={CERTIFICATE_NO_EXAMPLE}
        hint={`Format: ${CERTIFICATE_NO_EXAMPLE}`}
        error={errors.certificateNo?.message}
        leftIcon={Hash}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        className="flex-1"
        inputClassName="font-mono uppercase placeholder:normal-case"
        {...register('certificateNo')}
      />
      <Button
        type="submit"
        leftIcon={ShieldCheck}
        loading={loading}
        className="w-full sm:mt-[1.625rem] sm:w-auto"
      >
        Verify
      </Button>
    </form>
  );
}

export default VerifyForm;
