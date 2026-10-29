import { SCHEDULE_STATUS } from '@/shared/constants';

/**
 * Version facts for an assessment config from the API (or null when none exists yet).
 *   liveVersion      - the version students get now (null when nothing is published)
 *   draftVersion     - the unpublished working version (null when the latest is published)
 *   nextSaveVersion  - the version a "Save draft" writes to (a published latest starts a new draft)
 *   publishVersion   - the version "Publish" would make live (only a saved draft can be published)
 */
export function getVersionInfo(config) {
  if (!config) {
    return { status: null, liveVersion: null, draftVersion: null, nextSaveVersion: 1, publishVersion: null };
  }
  const version = Number(config.version) || 0;
  const isDraft = config.status === SCHEDULE_STATUS.DRAFT;
  const isPublished = config.status === SCHEDULE_STATUS.PUBLISHED;
  const liveVersion = config.publishedVersion ?? (isPublished ? version : null);
  return {
    status: config.status ?? null,
    liveVersion,
    draftVersion: isDraft ? version : null,
    nextSaveVersion: isDraft ? version : version + 1,
    publishVersion: isDraft ? version : null,
  };
}
