import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { getVersionInfo } from '../utils/versions';

/** Header badges such as "Draft v2" and "Published v1" (or "Not published yet"). */
export function VersionBadges({ config, className }) {
  const { draftVersion, liveVersion } = getVersionInfo(config);

  if (!config) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Badge variant="neutral" size="md" dot>
          New · not saved yet
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {draftVersion ? (
        <Badge variant="warning" size="md" dot>
          Draft v{draftVersion}
        </Badge>
      ) : null}
      {liveVersion ? (
        <Badge variant="success" size="md" dot>
          Published v{liveVersion}
        </Badge>
      ) : (
        <Badge variant="neutral" size="md">
          Not published yet
        </Badge>
      )}
    </div>
  );
}

export default VersionBadges;
