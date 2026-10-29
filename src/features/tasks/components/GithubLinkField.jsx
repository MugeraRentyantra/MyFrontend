import { forwardRef } from 'react';
import { Input } from '@/shared/components/ui';
import { GithubIcon } from '@/shared/icons';

/**
 * GitHub link of a submission (GP8): repository, commit or pull request URL that must start
 * with https://github.com/. Prefilled with the team repository for team enrollments.
 * Works with `{...register('githubUrl')}`.
 */
export const GithubLinkField = forwardRef(function GithubLinkField(
  { error, prefillSource = null, ...rest },
  ref,
) {
  let hint = 'Link your repository, a commit or a pull request. It must start with https://github.com/';
  if (prefillSource === 'team') {
    hint = 'Prefilled with your team repository. You can link a specific commit or pull request instead.';
  } else if (prefillSource === 'previous') {
    hint = 'Prefilled with the link from your previous attempt. Update it if your changes are elsewhere.';
  }

  return (
    <Input
      ref={ref}
      type="url"
      inputMode="url"
      autoComplete="url"
      autoCapitalize="none"
      spellCheck={false}
      label="GitHub link"
      required
      leftIcon={GithubIcon}
      placeholder="https://github.com/your-name/your-repo"
      error={error}
      hint={hint}
      {...rest}
    />
  );
});

export default GithubLinkField;
