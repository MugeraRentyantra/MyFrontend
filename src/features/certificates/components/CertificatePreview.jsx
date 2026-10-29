import { Logo } from '@/shared/components/ui';
import { Award } from '@/shared/icons';
import { paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { absoluteUrl, formatDate } from '@/shared/utils/helpers';

const CORNERS = [
  'left-2.5 top-2.5 border-l-2 border-t-2 sm:left-4 sm:top-4',
  'right-2.5 top-2.5 border-r-2 border-t-2 sm:right-4 sm:top-4',
  'bottom-2.5 left-2.5 border-b-2 border-l-2 sm:bottom-4 sm:left-4',
  'bottom-2.5 right-2.5 border-b-2 border-r-2 sm:bottom-4 sm:right-4',
];

function Seal() {
  return (
    <span
      className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md ring-4 ring-brand-100 sm:h-20 sm:w-20"
      aria-hidden="true"
    >
      <span className="absolute inset-1.5 rounded-full border border-dashed border-white/50" />
      <Award className="h-7 w-7 sm:h-9 sm:w-9" />
    </span>
  );
}

function SignatureLine({ value, caption, align = 'center', mono = false }) {
  return (
    <div
      className={cn(
        'text-center',
        align === 'left' && 'sm:text-left',
        align === 'right' && 'sm:text-right',
      )}
    >
      <p
        className={cn(
          'break-all text-sm font-medium text-slate-900',
          mono && 'font-mono',
        )}
      >
        {value}
      </p>
      <div
        className={cn(
          'mx-auto mt-1.5 h-px w-36 bg-slate-300',
          align === 'left' && 'sm:mx-0',
          align === 'right' && 'sm:ml-auto sm:mr-0',
        )}
        aria-hidden="true"
      />
      <p className="mt-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-slate-500">
        {caption}
      </p>
    </div>
  );
}

/**
 * HTML rendering of the issued certificate (GP12): framed sheet with the title, student name,
 * programme line, issue date, certificate number and verification URL. Shown only once issued.
 */
export function CertificatePreview({ certificate, className }) {
  if (!certificate) return null;

  const number = certificate.certificateNo;
  const verifyUrl = number ? absoluteUrl(paths.verifyCertificate(number)) : '';
  const designation = certificate.designation?.name;
  const domain = certificate.domain?.name;
  const months = Number(certificate.durationMonths) || null;

  return (
    <figure
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-semibold text-slate-900">Certificate preview</span>
        <span className="text-xs text-slate-500">Your PDF carries the same details.</span>
      </figcaption>

      <div className="bg-slate-100/70 p-3 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl bg-white p-1.5 shadow-elevated sm:p-2.5">
          <div className="border-[3px] border-double border-brand-300 p-1 sm:p-1.5">
            <div className="relative overflow-hidden border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/80 px-5 py-9 text-center sm:px-12 sm:py-12">
              {CORNERS.map((position) => (
                <span
                  key={position}
                  className={cn(
                    'pointer-events-none absolute h-5 w-5 border-brand-300 sm:h-7 sm:w-7',
                    position,
                  )}
                  aria-hidden="true"
                />
              ))}

              <div className="flex justify-center">
                <Logo size="sm" />
              </div>

              <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-brand-700 sm:text-xs sm:tracking-[0.35em]">
                Certificate of completion
              </p>

              <p className="mt-5 font-serif text-sm italic text-slate-500 sm:text-base">
                This is to certify that
              </p>
              <p className="mt-2 break-words font-serif text-2xl font-semibold text-slate-900 sm:text-4xl">
                {certificate.studentName || 'Student name'}
              </p>
              <div
                className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-brand-300 to-transparent sm:w-72"
                aria-hidden="true"
              />

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                has successfully completed the {months ? `${months}-month ` : ''}
                <span className="font-semibold text-slate-900">{designation || 'internship'}</span>
                {designation ? ' internship' : ''}
                {domain ? (
                  <>
                    {' '}
                    in the <span className="font-semibold text-slate-900">{domain}</span> domain
                  </>
                ) : null}
                .
              </p>

              <div className="mt-8 grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
                <SignatureLine
                  value={formatDate(certificate.issuedAt)}
                  caption="Date of issue"
                  align="left"
                />
                <div className="order-first flex justify-center sm:order-none">
                  <Seal />
                </div>
                <SignatureLine value={number} caption="Certificate number" align="right" mono />
              </div>

              {verifyUrl ? (
                <p className="mt-8 break-all text-[0.7rem] text-slate-500 sm:text-xs">
                  Verify this certificate at{' '}
                  <span className="font-medium text-brand-700">{verifyUrl}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

export default CertificatePreview;
