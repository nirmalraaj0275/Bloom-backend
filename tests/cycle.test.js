import { describe, it, expect, vi } from 'vitest';
import { calculateCycle, dateKey, dayStatus, emptyState, periodSchema, stateSchema, validDate } from '../src/lib/cycle.js';

const period = (start, end) => ({ id: crypto.randomUUID(), start, end, flow: 'medium', cramps: 'mild', symptoms: [], notes: '' });
describe('local calendar cycle calculations', () => {
  it('has no invented history or predictions for a new user', () => {
    const result = calculateCycle([], emptyState().settings, '2024-01-01');
    expect(result.next).toBeNull();
    expect(result.averageCycle).toBeNull();
  });
  it('counts day one and inclusive duration across leap day', () => {
    const result = calculateCycle([period('2024-02-28', '2024-03-01')], emptyState().settings, '2024-02-28');
    expect(result.cycleDay).toBe(1);
    expect(result.averagePeriod).toBeNull();
    expect(calculateCycle([period('2024-02-28', '2024-03-01')], emptyState().settings, '2024-03-02').averagePeriod).toBe(3);
    expect(result.next).toBe('2024-03-27');
  });
  it('uses actual start intervals over the configured default', () => {
    const result = calculateCycle([period('2023-12-20', '2023-12-24'), period('2024-01-19', '2024-01-22')], emptyState().settings, '2024-01-20');
    expect(result.averageCycle).toBe(30);
    expect(result.next).toBe('2024-02-18');
  });
  it('does not invent an end date or roll overdue predictions forward', () => {
    const result = calculateCycle([period('2024-01-01')], emptyState().settings, '2024-03-01');
    expect(result.averagePeriod).toBeNull();
    expect(result.next).toBe('2024-01-29');
    expect(result.remaining).toBeLessThan(0);
  });
  it('rejects invalid dates and reversed ranges', () => {
    expect(validDate('2023-02-29')).toBe(false);
    expect(validDate('2024-02-29')).toBe(true);
    expect(() => calculateCycle([period('not-a-date')], emptyState().settings)).toThrow();
    expect(periodSchema.safeParse(period('2024-03-03', '2024-03-01')).success).toBe(false);
    expect(periodSchema.safeParse(period('2999-01-01')).success).toBe(false);
  });
  it('rejects duplicate starts, overlapping and ongoing periods', () => {
    const state = emptyState();
    state.periods = [period('2024-01-01'), period('2024-02-01')];
    expect(stateSchema.safeParse(state).success).toBe(false);
    state.periods = [period('2024-01-01', '2024-01-05'), period('2024-01-05', '2024-01-08')];
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
  it('reports variation and handles year boundaries without UTC conversion', () => {
    const result = calculateCycle([period('2023-12-01', '2023-12-05'), period('2024-01-01', '2024-01-05'), period('2024-01-29')], emptyState().settings, '2024-01-29');
    expect(result.variation).toBe(3);
    expect(result.averageCycle).toBe(29.5);
    expect(dateKey(new Date(2024, 0, 1))).toBe('2024-01-01');
  });
  it('distinguishes recorded days from estimates', () => {
    const state = emptyState();
    state.periods = [period('2024-01-01', '2024-01-05')];
    expect(dayStatus('2024-01-02', state).recorded?.start).toBe('2024-01-01');
    expect(dayStatus('2024-01-02', state).predicted).toBe(false);
  });
  it('shows only the next future prediction window and never confirms predictions', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2024, 2, 10, 12));
      const state = emptyState();
      state.periods = [period('2024-03-01', '2024-03-05')];
      expect(dayStatus('2024-03-29', state)).toMatchObject({ recorded: undefined, predicted: true });
      expect(dayStatus('2024-04-02', state).predicted).toBe(true);
      expect(dayStatus('2024-04-03', state).predicted).toBe(false);
      expect(dayStatus('2024-04-26', state).predicted).toBe(false);
      vi.setSystemTime(new Date(2024, 3, 10, 12));
      expect(dayStatus('2024-04-26', state).predicted).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('uses calendar arithmetic over daylight-saving transitions', () => {
    const state = emptyState();
    const result = calculateCycle([period('2024-03-09', '2024-03-11')], state.settings, '2024-03-11');
    expect(result.cycleDay).toBe(3);
    expect(result.averagePeriod).toBe(3);
    expect(result.next).toBe('2024-04-06');
  });
});
