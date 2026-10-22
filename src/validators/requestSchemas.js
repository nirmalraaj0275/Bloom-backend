import { z } from 'zod';
import { stateSchema, periodSchema, dailySchema, journalSchema, settingsSchema } from '../lib/cycle.js';

export const credentialsSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(32)
    .regex(/^[a-zA-Z0-9_ ]+$/, 'Username may use letters, numbers, spaces, and underscores.')
    .transform(value => value.toLowerCase().replace(/\s+/g, ' ')),
  password: z.string().min(8, 'Use a password of at least 8 characters.').max(128)
});

export const revisionSchema = z.object({ revision: z.number().int().nonnegative() });
export const syncSchema = revisionSchema.extend({ state: stateSchema });
export const recordSchemas = {
  periods: revisionSchema.extend({ record: periodSchema }),
  daily: revisionSchema.extend({ record: dailySchema }),
  journal: revisionSchema.extend({ record: journalSchema })
};
export const preferencesSchema = revisionSchema.extend({ settings: settingsSchema });
