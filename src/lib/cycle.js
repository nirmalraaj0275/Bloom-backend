import { z } from 'zod';
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

export const dateKey = (date) => format(date, 'yyyy-MM-dd');
export const today = () => dateKey(new Date());
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)) && dateKey(parseISO(value)) === value;
}
const date = z.string().refine(validDate, 'Choose a valid calendar date.');
const pastDate = date.refine(value => value <= today(), 'Recorded dates cannot be in the future.');
export const moods = ['Happy', 'Calm', 'Energetic', 'Sensitive', 'Anxious', 'Irritable', 'Sad', 'Tired'];
export const symptoms = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Acne', 'Breast tenderness', 'Back pain', 'Nausea', 'Food cravings', 'Changes in sleep'];
const associations = z.array(z.string().trim().min(1).max(80)).max(20);
export const periodSchema = z.object({
  id: z.string().uuid(), start: pastDate, end: pastDate.optional(),
  flow: z.enum(['spotting', 'light', 'medium', 'heavy']),
  cramps: z.enum(['none', 'mild', 'moderate', 'severe']),
  symptoms: associations, mood: z.enum(moods).optional(), notes: z.string().max(5000)
}).superRefine((record, ctx) => {
  if (record.end && record.end < record.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'End date must be on or after the start date.' });
});
export const dailySchema = z.object({
  id: z.string().uuid(), date: pastDate, symptoms: associations,
  severity: z.enum(['mild', 'moderate', 'severe']), mood: z.enum(moods).optional(), notes: z.string().max(5000)
});
export const journalSchema = z.object({
  id: z.string().uuid(), date: pastDate, mood: z.enum(moods).optional(),
  symptoms: associations, notes: z.string().trim().min(1, 'Write a little before saving.').max(20000)
});
export const settingsSchema = z.object({
  name: z.string().trim().max(60), cycleLength: z.number().int().min(15).max(90),
  periodLength: z.number().int().min(1).max(20), theme: z.enum(['light', 'dark', 'system']),
  onboarded: z.boolean(),
  reminders: z.object({
    period: z.boolean(), daily: z.boolean(), custom: z.boolean(), customText: z.string().max(120),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), daysBefore: z.number().int().min(0).max(7)
  })
});
export const stateSchema = z.object({
  settings: settingsSchema, periods: z.array(periodSchema).max(3000),
  daily: z.array(dailySchema).max(10000), journal: z.array(journalSchema).max(10000)
}).superRefine((state, ctx) => {
  const sorted = [...state.periods].sort((a, b) => a.start.localeCompare(b.start));
  sorted.forEach((record, i) => {
    const previous = sorted[i - 1];
    if (previous && record.start <= (previous.end ?? today())) {
      ctx.addIssue({ code: 'custom', path: ['periods'], message: 'Period dates overlap. Finish an ongoing period before adding another.' });
    }
  });
  for (const key of ['periods', 'daily', 'journal']) {
    if (new Set(state[key].map(record => record.id)).size !== state[key].length) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Duplicate record IDs are not allowed.' });
    }
  }
  if (new Set(state.daily.map(record => record.date)).size !== state.daily.length) {
    ctx.addIssue({ code: 'custom', path: ['daily'], message: 'Only one symptom entry per day is allowed. Edit the existing entry.' });
  }
});
export function emptyState() {
  return {
    settings: {
      name: '', cycleLength: 28, periodLength: 5, theme: 'light', onboarded: false,
      reminders: { period: false, daily: false, custom: false, customText: '', time: '09:00', daysBefore: 2 }
    },
    periods: [], daily: [], journal: []
  };
}
export function calculateCycle(records, settings, at = today()) {
  if (!validDate(at)) throw new Error('Invalid reference date.');
  const sorted = records.map(record => periodSchema.parse(record)).filter(record => record.start <= at).sort((a, b) => a.start.localeCompare(b.start));
  const lengths = sorted.slice(1).map((record, i) => ({
    date: record.start, length: differenceInCalendarDays(parseISO(record.start), parseISO(sorted[i].start))
  })).filter(record => record.length > 0);
  const durations = sorted.filter(record => Boolean(record.end && record.end <= at))
    .map(record => ({ date: record.start, duration: differenceInCalendarDays(parseISO(record.end), parseISO(record.start)) + 1 }));
  const average = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const averageCycle = average(lengths.map(record => record.length));
  const averagePeriod = average(durations.map(record => record.duration));
  const estimatedLength = Math.round(averageCycle ?? settings.cycleLength);
  const estimatedDuration = Math.round(averagePeriod ?? settings.periodLength);
  const latest = sorted.at(-1);
  const cycleDay = latest ? differenceInCalendarDays(parseISO(at), parseISO(latest.start)) + 1 : null;
  const next = latest ? dateKey(addDays(parseISO(latest.start), estimatedLength)) : null;
  const remaining = next ? differenceInCalendarDays(parseISO(next), parseISO(at)) : null;
  const variation = lengths.length >= 2 ? Math.max(...lengths.map(x => x.length)) - Math.min(...lengths.map(x => x.length)) : null;
  const active = sorted.find(record => record.start <= at && (!record.end || record.end >= at));
  const phase = !cycleDay ? null : active ? 'Menstrual' : cycleDay > estimatedLength ? 'Timing uncertain' :
    cycleDay <= Math.max(estimatedDuration, estimatedLength - 14) ? 'Follicular' :
      cycleDay <= estimatedLength - 12 ? 'Mid-cycle' : 'Luteal';
  return { lengths, durations, averageCycle, averagePeriod, estimatedLength, estimatedDuration, latest, cycleDay, next, remaining, variation, phase };
}
export function dayStatus(value, state) {
  const recorded = state.periods.find(record => value >= record.start && value <= (record.end ?? today()));
  const cycle = calculateCycle(state.periods, state.settings);
  const predicted = !recorded && value > today() && cycle.next && cycle.next > today() &&
    value >= cycle.next && value < dateKey(addDays(parseISO(cycle.next), cycle.estimatedDuration));
  return { recorded, predicted: Boolean(predicted), daily: state.daily.find(record => record.date === value), journals: state.journal.filter(record => record.date === value) };
}
