import { describe, expect, it } from 'vitest';
import { calculateGoalMath } from './goalMath.js';

const NOW = new Date('2026-07-01T00:00:00.000Z');
const CREATED_AT = new Date('2026-06-01T00:00:00.000Z');

const base = {
  targetAmountPaise: 100000,
  currentAmountPaise: 0,
  deadline: null,
  createdAt: CREATED_AT,
};

describe('goalMath — progress and remaining', () => {
  it('computes percentage and remaining for a partial goal', () => {
    const m = calculateGoalMath(
      { ...base, currentAmountPaise: 25000 },
      NOW
    );
    expect(m.progressPercentage).toBe(25);
    expect(m.remainingPaise).toBe(75000);
    expect(m.status).toBe('on_track');
  });

  it('rounds percentage to two decimals', () => {
    const m = calculateGoalMath(
      { ...base, targetAmountPaise: 300, currentAmountPaise: 100 },
      NOW
    );
    expect(m.progressPercentage).toBe(33.33);
  });

  it('clamps above-target progress to 100 and remaining to 0', () => {
    const m = calculateGoalMath(
      { ...base, targetAmountPaise: 1000, currentAmountPaise: 1500 },
      NOW
    );
    expect(m.progressPercentage).toBe(100);
    expect(m.remainingPaise).toBe(0);
  });

  it('returns zero progress for a fresh goal', () => {
    const m = calculateGoalMath({ ...base }, NOW);
    expect(m.progressPercentage).toBe(0);
    expect(m.remainingPaise).toBe(100000);
  });
});

describe('goalMath — deadline math', () => {
  it('counts whole days until an exact deadline', () => {
    const m = calculateGoalMath(
      { ...base, deadline: new Date('2026-07-11T00:00:00.000Z') },
      NOW
    );
    expect(m.daysRemaining).toBe(10);
  });

  it('ceil-days a partial final day', () => {
    const m = calculateGoalMath(
      { ...base, deadline: new Date('2026-07-11T00:00:00.000Z') },
      new Date('2026-07-01T12:00:00.000Z')
    );
    expect(m.daysRemaining).toBe(10);
  });

  it('clamps a lapsed deadline to zero days remaining', () => {
    const m = calculateGoalMath(
      { ...base, deadline: new Date('2026-07-11T00:00:00.000Z') },
      new Date('2026-07-11T12:00:00.000Z')
    );
    expect(m.daysRemaining).toBe(0);
  });

  it('has null days remaining without a deadline', () => {
    expect(calculateGoalMath(base, NOW).daysRemaining).toBeNull();
  });
});

describe('goalMath — required monthly savings', () => {
  it('is null for an open-ended goal', () => {
    expect(calculateGoalMath(base, NOW).requiredMonthlySavingsPaise).toBeNull();
  });

  it('splits the remaining amount across 30-day months', () => {
    const m = calculateGoalMath(
      { ...base, targetAmountPaise: 130000, currentAmountPaise: 10000, deadline: new Date('2026-09-29T00:00:00.000Z') },
      NOW
    );
    // 90 days => 3 months; remaining 120000 / 3 = 40000.
    expect(m.requiredMonthlySavingsPaise).toBe(40000);
  });

  it('currently requires nothing once completed', () => {
    const m = calculateGoalMath(
      { ...base, currentAmountPaise: 100000, deadline: new Date('2026-09-29T00:00:00.000Z') },
      NOW
    );
    expect(m.requiredMonthlySavingsPaise).toBe(0);
  });

  it('is null when the deadline has already passed', () => {
    const m = calculateGoalMath(
      { ...base, deadline: new Date('2026-06-15T00:00:00.000Z') },
      NOW
    );
    expect(m.requiredMonthlySavingsPaise).toBeNull();
  });
});

describe('goalMath — status', () => {
  it('is on_track without a deadline despite partial progress', () => {
    expect(calculateGoalMath({ ...base, currentAmountPaise: 5000 }, NOW).status).toBe('on_track');
  });

  it('is completed at 100%', () => {
    const m = calculateGoalMath(
      { ...base, currentAmountPaise: 100000, deadline: new Date('2026-09-29T00:00:00.000Z') },
      NOW
    );
    expect(m.status).toBe('completed');
    expect(m.progressPercentage).toBe(100);
  });

  it('is overdue when incomplete after the deadline', () => {
    const m = calculateGoalMath(
      { ...base, deadline: new Date('2026-06-15T00:00:00.000Z') },
      NOW
    );
    expect(m.status).toBe('overdue');
  });

  it('is behind when progress lags the linear schedule', () => {
    // Span 30 days; 20 days in => 66.67% expected, only 50% saved.
    const m = calculateGoalMath(
      {
        targetAmountPaise: 10000,
        currentAmountPaise: 5000,
        deadline: new Date('2026-07-01T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      new Date('2026-06-21T00:00:00.000Z')
    );
    expect(m.status).toBe('behind');
  });

  it('is on_track when progress meets or beats the schedule', () => {
    const m = calculateGoalMath(
      {
        targetAmountPaise: 10000,
        currentAmountPaise: 8000,
        deadline: new Date('2026-07-01T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      new Date('2026-06-21T00:00:00.000Z')
    );
    expect(m.status).toBe('on_track');
  });
});