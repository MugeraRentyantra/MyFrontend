import { useCallback, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  DynamicRowEditor,
  StatusBanner,
  toast,
} from '@/shared/components/ui';
import { SCHEDULE_STATUS, paths } from '@/shared/constants';
import { useDisclosure, useDocumentTitle } from '@/shared/hooks';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  Save,
  Send,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { pluralize } from '@/shared/utils/helpers';
import { DayEditor } from '../components/DayEditor';
import { ReadOnlyNotice } from '../components/ReadOnlyNotice';
import { ScheduleHeader } from '../components/ScheduleHeader';
import { ScheduleLoadError, SchedulePageSkeleton } from '../components/SchedulePageStates';
import { ScheduleTabs } from '../components/ScheduleTabs';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { VersionList } from '../components/VersionList';
import { useScheduleEditor, useUnsavedChangesGuard } from '../hooks/useScheduleEditor';
import { useCloneSchedule, useSchedule, useScheduleVersions } from '../hooks/useSchedules';
import { useScheduleTasks } from '../hooks/useScheduleTasks';
import { createEmptyDay } from '../utils/days';
import { scheduleName } from '../utils/format';

function getDayKey(row, index) {
  return row?.key ?? index;
}

function SaveStatus({ editor }) {
  let tone = 'text-slate-500';
  let Icon = CheckCircle2;
  let text = 'All changes saved';
  let spin = false;

  if (editor.isPublishing) {
    Icon = Loader2;
    spin = true;
    text = 'Publishing…';
  } else if (editor.isSaving) {
    Icon = Loader2;
    spin = true;
    text = 'Saving…';
  } else if (editor.errors.count > 0) {
    tone = 'text-rose-700';
    Icon = AlertCircle;
    text =
      editor.errors.count === 1
        ? 'Fix the highlighted field before saving.'
        : `Fix the ${editor.errors.count} highlighted fields before saving.`;
  } else if (editor.isDirty) {
    tone = 'text-amber-700';
    Icon = AlertTriangle;
    text = 'You have unsaved changes';
  }

  return (
    <p className={cn('flex items-center gap-2 text-sm font-medium', tone)} aria-live="polite">
      <Icon className={cn('h-4 w-4 shrink-0', spin && 'animate-spin')} aria-hidden="true" />
      {text}
    </p>
  );
}

/** The editor for one loaded version. Keyed by id, so opening another version starts fresh. */
function ScheduleDaysEditor({ schedule }) {
  const navigate = useNavigate();
  const headingId = useId();
  const editor = useScheduleEditor(schedule);
  const blocker = useUnsavedChangesGuard(editor.isDirty);
  const tasksQuery = useScheduleTasks(schedule._id);
  const versionsQuery = useScheduleVersions(schedule._id);
  const clone = useCloneSchedule();
  const versionsDrawer = useDisclosure();
  const publishDialog = useDisclosure();
  const discardDialog = useDisclosure();

  const tasksCount = tasksQuery.data?.length ?? schedule.tasksCount;
  const busy = editor.isSaving || editor.isPublishing;
  const currentlyPublished = (versionsQuery.data ?? []).find(
    (version) => version.status === SCHEDULE_STATUS.PUBLISHED && version._id !== schedule._id,
  );

  const handleCreateDraft = () => {
    if (clone.isPending) return;
    clone.mutate(schedule._id, {
      onSuccess: (created) => {
        versionsDrawer.close();
        toast.success(created?.version ? `Draft version ${created.version} created` : 'Draft created', {
          description: 'The days and tasks were copied. Make your changes, then publish.',
        });
        if (created?._id) navigate(paths.adminSchedule(created._id));
      },
      onError: (error) => {
        toast.error("Couldn't create a new draft", { description: getErrorMessage(error) });
      },
    });
  };

  const requestPublish = () => {
    if (editor.checkValid()) publishDialog.open();
  };

  const confirmPublish = async () => {
    await editor.publish();
    publishDialog.close();
  };

  const closePublishDialog = () => {
    if (!busy) publishDialog.close();
  };

  const confirmDiscard = () => {
    editor.discard();
    discardDialog.close();
    toast.info('Changes discarded', { description: 'The days are back to the last saved version.' });
  };

  const { setDays, readOnly, errors } = editor;
  const renderDay = useCallback(
    (row, index, helpers) => (
      <DayEditor
        day={row}
        index={index}
        onChange={helpers.update}
        readOnly={readOnly}
        errors={errors.dayErrors[index]}
      />
    ),
    [errors.dayErrors, readOnly],
  );

  const versionListProps = {
    scheduleId: schedule._id,
    currentVersion: schedule.version,
    versionHref: paths.adminSchedule,
    onCreateDraft: handleCreateDraft,
    isCreating: clone.isPending,
  };

  return (
    <div className="space-y-6">
      <ScheduleHeader
        schedule={schedule}
        actions={
          <Button
            variant="outline"
            leftIcon={History}
            onClick={versionsDrawer.open}
            className="lg:hidden"
            aria-haspopup="dialog"
          >
            Versions
          </Button>
        }
      >
        <ScheduleTabs scheduleId={schedule._id} daysCount={editor.days.length} tasksCount={tasksCount} />
      </ScheduleHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          {readOnly ? (
            <ReadOnlyNotice
              status={schedule.status}
              version={schedule.version}
              onCreateDraft={handleCreateDraft}
              isCreating={clone.isPending}
            />
          ) : null}

          <section aria-labelledby={headingId} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <h2 id={headingId} className="text-base font-semibold text-slate-900">
                  Days
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {readOnly
                    ? 'What students follow each day in this version.'
                    : 'Students follow the days in this order. Moving a day renumbers the others.'}
                </p>
              </div>
              <p className="text-sm text-slate-500">{pluralize(editor.days.length, 'day')}</p>
            </div>

            {errors.formError ? (
              <StatusBanner variant="error" title="Check the days">
                {errors.formError}
              </StatusBanner>
            ) : null}

            <DynamicRowEditor
              rows={editor.days}
              onChange={setDays}
              renderRow={renderDay}
              createRow={(index) => createEmptyDay(index)}
              getRowKey={getDayKey}
              itemLabel="Day"
              addLabel="Add day"
              minRows={1}
              disabled={readOnly}
            />
          </section>

          {!readOnly ? (
            <div className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-elevated backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SaveStatus editor={editor} />
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {editor.isDirty ? (
                    <Button variant="ghost" onClick={discardDialog.open} disabled={busy}>
                      Discard
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    leftIcon={Save}
                    onClick={() => editor.save()}
                    loading={editor.isSaving && !publishDialog.isOpen}
                    disabled={!editor.isDirty || busy}
                  >
                    Save draft
                  </Button>
                  <Button leftIcon={Send} onClick={requestPublish} disabled={busy}>
                    Publish
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <Card className="lg:sticky lg:top-24">
            <VersionList {...versionListProps} />
          </Card>
        </aside>
      </div>

      <Drawer
        open={versionsDrawer.isOpen}
        onClose={versionsDrawer.close}
        title="Versions"
        description={scheduleName(schedule)}
        size="sm"
      >
        <VersionList {...versionListProps} showHeading={false} onNavigate={versionsDrawer.close} />
      </Drawer>

      <ConfirmDialog
        open={publishDialog.isOpen}
        onClose={closePublishDialog}
        onConfirm={confirmPublish}
        title={`Publish version ${schedule.version}?`}
        message={`This locks version ${schedule.version}. New enrollments get it; active students keep their current version.`}
        confirmLabel={`Publish version ${schedule.version}`}
        loading={busy}
      >
        <ul className="space-y-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {pluralize(editor.days.length, 'day')}, each with a title
          </li>
          {typeof tasksCount === 'number' && tasksCount > 0 ? (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              {pluralize(tasksCount, 'task')}
            </li>
          ) : (
            <li className="flex items-start gap-2 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              No tasks yet: students won't have anything to submit.
            </li>
          )}
          {currentlyPublished ? (
            <li className="flex items-start gap-2">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Version {currentlyPublished.version} will be archived.
            </li>
          ) : null}
          {editor.isDirty ? (
            <li className="flex items-start gap-2">
              <Save className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Your unsaved changes are saved first.
            </li>
          ) : null}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={discardDialog.isOpen}
        onClose={discardDialog.close}
        onConfirm={confirmDiscard}
        title="Discard unsaved changes?"
        message="The days go back to how they were when you last saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="danger"
      />

      <UnsavedChangesDialog
        blocker={blocker}
        message="You have unsaved changes to these days. If you leave now, they'll be lost."
      />
    </div>
  );
}

/** /admin/schedules/:id — edit the days of one schedule version (KD6). */
export default function ScheduleEditorPage() {
  const { id } = useParams();
  const { data: schedule, isError, error, refetch } = useSchedule(id);

  useDocumentTitle(schedule ? `${scheduleName(schedule)} v${schedule.version}` : 'Schedule');

  if (!schedule) {
    if (isError) return <ScheduleLoadError error={error} onRetry={() => refetch()} />;
    return <SchedulePageSkeleton />;
  }

  return <ScheduleDaysEditor key={schedule._id} schedule={schedule} />;
}
