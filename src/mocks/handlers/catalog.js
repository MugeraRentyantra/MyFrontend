import { PUBLISH_STATUS } from '@/shared/constants';
import { db } from '../db';
import { getLatestPublishedTemplate, planDto } from '../services';
import { getQuery, json, matchesSearch, mock, notFound, paginate } from '../utils';

/**
 * Public catalog (MM4, MM5, MM9). Only PUBLISHED designations, domains and plans are visible;
 * a plan is public only when its designation AND domain are published too.
 */

const PUBLISHED = PUBLISH_STATUS.PUBLISHED;

const byName = (a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''));

/** Designation / Domain contract shape (never createdBy / updatedBy). */
function catalogEntryDto(entry) {
  return {
    _id: entry._id,
    name: entry.name,
    slug: entry.slug,
    description: entry.description ?? '',
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function findByIdOrSlug(collection, idOrSlug) {
  const key = String(idOrSlug ?? '');
  return collection.find((entry) => entry._id === key || entry.slug === key);
}

const isPublished = (entry) => Boolean(entry) && entry.status === PUBLISHED;

function isPublicPlan(plan) {
  if (!plan || plan.status !== PUBLISHED) return false;
  const designation = db.designations.find((entry) => entry._id === plan.designationId);
  const domain = db.domains.find((entry) => entry._id === plan.domainId);
  return isPublished(designation) && isPublished(domain);
}

export const catalogHandlers = [
  mock.get('/designations', ({ request }) => {
    const search = getQuery(request).get('search');
    const items = db.designations
      .filter((entry) => isPublished(entry) && matchesSearch(search, entry.name, entry.description))
      .sort(byName)
      .map(catalogEntryDto);
    return json(paginate(items, request, 50));
  }),

  mock.get('/designations/:idOrSlug', ({ params }) => {
    const designation = findByIdOrSlug(db.designations, params.idOrSlug);
    if (!isPublished(designation)) return notFound('Designation');
    return json(catalogEntryDto(designation));
  }),

  mock.get('/domains', ({ request }) => {
    const search = getQuery(request).get('search');
    const items = db.domains
      .filter((entry) => isPublished(entry) && matchesSearch(search, entry.name, entry.description))
      .sort(byName)
      .map(catalogEntryDto);
    return json(paginate(items, request, 50));
  }),

  mock.get('/internship-plans', ({ request }) => {
    const query = getQuery(request);
    const designationId = query.get('designationId');
    const domainId = query.get('domainId');
    const durationParam = query.get('durationMonths');
    const durationMonths = durationParam ? Number(durationParam) : null;

    const designationNames = new Map(db.designations.map((entry) => [entry._id, entry.name]));
    const domainNames = new Map(db.domains.map((entry) => [entry._id, entry.name]));

    const items = db.internshipPlans
      .filter((plan) => {
        if (!isPublicPlan(plan)) return false;
        if (designationId && plan.designationId !== designationId) return false;
        if (domainId && plan.domainId !== domainId) return false;
        if (durationMonths !== null && Number(plan.durationMonths) !== durationMonths) return false;
        return true;
      })
      .sort((a, b) => {
        const byDesignation = String(designationNames.get(a.designationId) ?? '').localeCompare(
          String(designationNames.get(b.designationId) ?? ''),
        );
        if (byDesignation !== 0) return byDesignation;
        const byDomain = String(domainNames.get(a.domainId) ?? '').localeCompare(
          String(domainNames.get(b.domainId) ?? ''),
        );
        if (byDomain !== 0) return byDomain;
        return Number(a.durationMonths) - Number(b.durationMonths);
      })
      .map((plan) => planDto(plan));

    return json(paginate(items, request, 100));
  }),

  mock.get('/internship-plans/:id/schedule-preview', ({ params }) => {
    const plan = db.internshipPlans.find((entry) => entry._id === params.id);
    if (!isPublicPlan(plan)) return notFound('Plan');

    const template = getLatestPublishedTemplate({
      designationId: plan.designationId,
      domainId: plan.domainId,
      durationMonths: plan.durationMonths,
    });
    // Day titles only — never the activity, SOP content or required evidence.
    const days = (Array.isArray(template?.days) ? template.days : [])
      .map((day) => ({ dayNumber: Number(day.dayNumber), title: day.title ?? `Day ${day.dayNumber}` }))
      .sort((a, b) => a.dayNumber - b.dayNumber);

    return json({ planId: plan._id, totalDays: days.length, days });
  }),
];

export default catalogHandlers;
