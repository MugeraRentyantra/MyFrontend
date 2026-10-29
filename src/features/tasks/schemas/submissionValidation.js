import { z } from 'zod';
import { SUBMISSION_RULES } from '@/shared/constants';
import { formatBytes, isGithubUrl } from '@/shared/utils/helpers';

/**
 * Task submission rules (GP8 / MM12). Client-side checks only guide the student: the server
 * validates everything again and its 422 field details are shown under the same fields.
 */

const {
  minScreenshots,
  maxScreenshots,
  maxFileSizeBytes,
  allowedImageTypes,
  allowedImageExtensions,
  minDescriptionLength,
  maxDescriptionLength,
  githubUrlPrefix,
} = SUBMISSION_RULES;

/** Value for the file input's `accept` attribute. */
export const SCREENSHOT_ACCEPT = allowedImageExtensions.join(',');

export const MAX_FILE_SIZE_LABEL = formatBytes(maxFileSizeBytes).replace('.0 ', ' ');

function getExtension(name = '') {
  const match = /\.[^.]+$/.exec(String(name).toLowerCase());
  return match ? match[0] : '';
}

/** True for PNG, JPG and WebP images (by MIME type, or by extension when the type is unknown). */
export function isAllowedImage(file) {
  if (!file) return false;
  if (file.type) return allowedImageTypes.includes(file.type);
  return allowedImageExtensions.includes(getExtension(file.name));
}

/** A clear message for a file that can't be attached, or null when it is fine. */
export function validateScreenshotFile(file) {
  const name = file?.name ? `“${file.name}”` : 'This file';
  if (!file) return 'Choose an image file.';
  if (!isAllowedImage(file)) return `${name} isn't a PNG, JPG or WebP image.`;
  if (!file.size) return `${name} is empty.`;
  if (file.size > maxFileSizeBytes) {
    return `${name} is ${formatBytes(file.size)}. Each screenshot must be ${MAX_FILE_SIZE_LABEL} or smaller.`;
  }
  return null;
}

/** Stable identity for a picked file (used for keys and duplicate detection). */
export function fileKey(file) {
  return `${file?.name ?? ''}:${file?.size ?? 0}:${file?.lastModified ?? 0}`;
}

export function descriptionLength(value) {
  return String(value ?? '').trim().length;
}

export function isValidGithubLink(value) {
  const url = String(value ?? '').trim();
  return url.startsWith(githubUrlPrefix) && isGithubUrl(url);
}

export const submissionSchema = z.object({
  screenshots: z
    .array(z.any())
    .min(minScreenshots, 'Add at least one screenshot of your work.')
    .max(maxScreenshots, `You can attach up to ${maxScreenshots} screenshots.`)
    .superRefine((files, ctx) => {
      const problem = files.map(validateScreenshotFile).find(Boolean);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }),
  description: z
    .string()
    .trim()
    .min(minDescriptionLength, `Describe your work in at least ${minDescriptionLength} characters.`)
    .max(maxDescriptionLength, `Keep the description under ${maxDescriptionLength} characters.`),
  githubUrl: z
    .string()
    .trim()
    .min(1, 'Add the link to your GitHub repository, commit or pull request.')
    .refine((value) => value.startsWith(githubUrlPrefix), `The link must start with ${githubUrlPrefix}`)
    .refine(
      (value) => !value.startsWith(githubUrlPrefix) || isGithubUrl(value),
      'Enter a full GitHub repository, commit or pull request URL.',
    ),
});

/**
 * What still blocks "Submit for review" — drives the checklist next to the button, which stays
 * disabled until every item is done.
 */
export function getSubmissionChecklist({ screenshots = [], description = '', githubUrl = '' } = {}) {
  const files = Array.isArray(screenshots) ? screenshots : [];
  const filesOk =
    files.length >= minScreenshots &&
    files.length <= maxScreenshots &&
    files.every((file) => validateScreenshotFile(file) === null);
  const length = descriptionLength(description);
  const remaining = Math.max(0, minDescriptionLength - length);
  const descriptionOk = length >= minDescriptionLength && length <= maxDescriptionLength;
  const githubOk = isValidGithubLink(githubUrl);

  return [
    {
      key: 'screenshots',
      label: filesOk
        ? `${files.length} ${files.length === 1 ? 'screenshot' : 'screenshots'}`
        : 'Screenshots',
      hint: filesOk ? null : 'Add at least one screenshot',
      done: filesOk,
    },
    {
      key: 'description',
      label: 'Description',
      hint: descriptionOk
        ? null
        : length > maxDescriptionLength
          ? 'Description is too long'
          : `${remaining} more ${remaining === 1 ? 'character' : 'characters'} needed`,
      done: descriptionOk,
    },
    {
      key: 'githubUrl',
      label: 'GitHub link',
      hint: githubOk ? null : 'Add a https://github.com/ link',
      done: githubOk,
    },
  ];
}

export { SUBMISSION_RULES };
