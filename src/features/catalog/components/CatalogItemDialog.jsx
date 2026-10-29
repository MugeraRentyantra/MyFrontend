import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, StatusBanner, Textarea, toast } from '@/shared/components/ui';
import { Plus, Save } from '@/shared/icons';
import { PUBLISH_STATUS, paths } from '@/shared/constants';
import { getErrorMessage, getFieldErrors, isErrorCode } from '@/shared/utils/errors';
import { slugify } from '@/shared/utils/helpers';
import { getCatalogKind, useCreateCatalogItem, useUpdateCatalogItem } from '../hooks/useCatalogAdmin';
import {
  CATALOG_DESCRIPTION_MAX,
  CATALOG_DESCRIPTION_MIN,
  CATALOG_NAME_MAX,
  CATALOG_NAME_MIN,
  catalogItemSchema,
} from '../schemas/catalogValidation';
import { applyKnownFieldErrors } from '../utils/formErrors';
import { FormActions } from './FormActions';

const FORM_FIELDS = ['name', 'description'];

const DESCRIPTION_HINTS = {
  designation: 'What the role involves and the key skills students practise. Shown in the public catalog.',
  domain: 'The industry setting students build their projects in.',
};

const NAME_PLACEHOLDERS = { designation: 'e.g. Java Developer', domain: 'e.g. Banking' };

function nameHint(config, item, name) {
  if (config.kind !== 'designation') return `${CATALOG_NAME_MIN}–${CATALOG_NAME_MAX} characters.`;
  // A published designation keeps its web address so links that were shared keep working.
  if (item && item.status === PUBLISH_STATUS.PUBLISHED && item.slug) {
    return `Web address: ${paths.designation(item.slug)}`;
  }
  const slug = slugify(name);
  return slug ? `Web address: ${paths.designation(slug)}` : `${CATALOG_NAME_MIN}–${CATALOG_NAME_MAX} characters.`;
}

function CatalogItemForm({ kind, item, onCancel, onSaved }) {
  const config = getCatalogKind(kind);
  const isEdit = Boolean(item);
  const createMutation = useCreateCatalogItem(kind);
  const updateMutation = useUpdateCatalogItem(kind);
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(catalogItemSchema),
    mode: 'onTouched',
    defaultValues: { name: item?.name ?? '', description: item?.description ?? '' },
  });

  const nameValue = watch('name');
  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const handleError = (error) => {
    if (isErrorCode(error, 'DUPLICATE_NAME')) {
      const message =
        getFieldErrors(error).name ??
        `A ${config.singular} with this name already exists. Choose a different name.`;
      setError('name', { type: 'server', message }, { shouldFocus: true });
      return;
    }
    if (!applyKnownFieldErrors(error, setError, FORM_FIELDS)) {
      setFormError(getErrorMessage(error, `We couldn't save this ${config.singular}. Please try again.`));
    }
  };

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        const saved = await updateMutation.mutateAsync({ id: item._id, values });
        toast.success(`${config.title} updated`, { description: `Changes to ${saved?.name ?? values.name} are saved.` });
        onSaved?.(saved);
      } else {
        const saved = await createMutation.mutateAsync(values);
        toast.success(`${config.title} created`, {
          description: `${saved?.name ?? values.name} is saved as a draft. Publish it when it's ready.`,
        });
        onSaved?.(saved);
      }
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError ? (
        <StatusBanner variant="error" title={`Couldn't save the ${config.singular}`}>
          {formError}
        </StatusBanner>
      ) : null}

      <Input
        label="Name"
        required
        autoComplete="off"
        placeholder={NAME_PLACEHOLDERS[config.kind]}
        hint={nameHint(config, item, nameValue)}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label="Description"
        required
        rows={5}
        showCount
        minLength={CATALOG_DESCRIPTION_MIN}
        maxLength={CATALOG_DESCRIPTION_MAX}
        hint={DESCRIPTION_HINTS[config.kind]}
        error={errors.description?.message}
        {...register('description')}
      />

      {!isEdit ? (
        <p className="text-sm text-slate-500">
          New {config.plural} start as drafts. Students only see a {config.singular} after you publish it.
        </p>
      ) : null}

      <FormActions inDialog>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          leftIcon={isEdit ? Save : Plus}
          loading={isBusy}
          disabled={isEdit && !isDirty}
        >
          {isEdit ? 'Save changes' : `Create ${config.singular}`}
        </Button>
      </FormActions>
    </form>
  );
}

/**
 * Create / edit a designation or domain (KD3): name (2-60) and description (10-500).
 * `item` = null creates a new DRAFT; otherwise edits that item. A duplicate name is shown on the
 * name field (409 DUPLICATE_NAME).
 */
export function CatalogItemDialog({ open, onClose, kind, item = null }) {
  const config = getCatalogKind(kind);
  const isEdit = Boolean(item);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit ${config.singular}` : `Create ${config.singular}`}
      description={
        isEdit
          ? `Update the name and description of ${item.name}.`
          : `Add a ${config.singular} to the catalog. You can publish it from the list once it's ready.`
      }
    >
      {open ? (
        <CatalogItemForm
          key={item?._id ?? 'new'}
          kind={kind}
          item={item}
          onCancel={onClose}
          onSaved={onClose}
        />
      ) : null}
    </Modal>
  );
}

export default CatalogItemDialog;
