/**
 * Public catalog feature (SN5): home page sections, catalog and designation detail.
 * Pages are lazy-loaded from src/routes/lazyPages.js and are not re-exported here.
 */
export { InternshipCard, InternshipCardSkeleton } from './components/InternshipCard';
export { InternshipFilters } from './components/InternshipFilters';
export { InternshipList } from './components/InternshipList';
export { PlanList } from './components/PlanList';
export { PriceTag } from './components/PriceTag';
export { SchedulePreviewModal } from './components/SchedulePreviewModal';
export { StartAssessmentButton, JoinTeamButton } from './components/StartAssessmentButton';
export { DiscountExplainer } from './components/DiscountExplainer';
export { EnrollmentSteps } from './components/EnrollmentSteps';

export { useInternships, buildInternshipSummaries } from './hooks/useInternships';
export { useDesignation } from './hooks/useDesignation';
export { usePlans, useSchedulePreview } from './hooks/usePlans';
export { useDomains } from './hooks/useDomains';

export { getDesignationVisual, getDomainVisual } from './utils/designationVisuals';
export { formatDurationOptions, formatList, MAX_EXAMPLE_DISCOUNT_PERCENT } from './utils/catalogFormat';
