import { z } from 'zod';

export const PROFILE_NAME_MIN = 2;
export const PROFILE_NAME_MAX = 80;

/**
 * Editable profile fields (GP11). The server re-validates; these rules only give early feedback.
 * PATCH /auth/me accepts `{ name }` only — email changes are not self-service.
 */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your full name.')
    .min(PROFILE_NAME_MIN, `Your name must be at least ${PROFILE_NAME_MIN} characters.`)
    .max(PROFILE_NAME_MAX, `Your name must be ${PROFILE_NAME_MAX} characters or fewer.`)
    .regex(/\p{L}/u, 'Your name must contain letters.'),
});

export default profileSchema;
