import { describe, expect, it } from 'vitest';
import { ApiError, invalidParamsFromIssues, mapDatabaseError, ProblemType } from './errors.ts';

describe('mapDatabaseError', () => {
  it('maps a foreign key failure to a conflict the caller can act on', () => {
    const mapped = mapDatabaseError(new Error('D1_ERROR: FOREIGN KEY constraint failed'));
    expect(mapped?.type).toBe(ProblemType.RESOURCE_IN_USE);
    expect(mapped?.httpStatus).toBe(409);
  });

  it('maps a unique violation to already-exists and names the columns', () => {
    const mapped = mapDatabaseError(
      new Error('D1_ERROR: UNIQUE constraint failed: severities.key'),
    );
    expect(mapped?.type).toBe(ProblemType.ALREADY_EXISTS);
    expect(mapped?.httpStatus).toBe(409);
    expect(mapped?.message).toContain('severities.key');
  });

  it('maps a unique violation with no column detail', () => {
    const mapped = mapDatabaseError(new Error('UNIQUE constraint failed'));
    expect(mapped?.type).toBe(ProblemType.ALREADY_EXISTS);
  });

  it('maps a not-null violation to a validation failure naming the field', () => {
    const mapped = mapDatabaseError(new Error('NOT NULL constraint failed: incidents.title'));
    expect(mapped?.type).toBe(ProblemType.VALIDATION_FAILED);
    expect(mapped?.httpStatus).toBe(400);
    expect(mapped?.invalidParams).toEqual([
      { name: 'incidents.title', reason: 'This field is required.' },
    ]);
  });

  it('maps a check violation to a validation failure', () => {
    expect(mapDatabaseError(new Error('CHECK constraint failed: value_kind'))?.type).toBe(
      ProblemType.VALIDATION_FAILED,
    );
  });

  it('accepts a non-Error throwable', () => {
    expect(mapDatabaseError('UNIQUE constraint failed: a.b')?.type).toBe(
      ProblemType.ALREADY_EXISTS,
    );
  });

  it('returns undefined for an unrelated failure so the caller can rethrow', () => {
    expect(mapDatabaseError(new Error('network unreachable'))).toBeUndefined();
    expect(mapDatabaseError(undefined)).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('serialises to an RFC 9457 problem document', () => {
    const error = new ApiError(ProblemType.NOT_FOUND, 'Incident not found.');
    expect(error.toProblem('/api/incidents/inc_1')).toEqual({
      type: '/problems/not-found',
      title: 'Not found',
      status: 404,
      detail: 'Incident not found.',
      instance: '/api/incidents/inc_1',
    });
  });

  it('omits instance and invalid_params rather than sending them empty', () => {
    // A caller checking `'invalid_params' in problem` must not see an empty array.
    expect(new ApiError(ProblemType.INTERNAL_ERROR, 'x').toProblem()).toEqual({
      type: '/problems/internal-error',
      title: 'Internal error',
      status: 500,
      detail: 'x',
    });
  });

  it('carries field-level causes when there are any', () => {
    const error = new ApiError(ProblemType.VALIDATION_FAILED, 'The request is not valid.', [
      { name: 'display_name', reason: 'Too small: expected string to have >=1 characters' },
    ]);
    expect(error.toProblem().invalid_params).toHaveLength(1);
  });

  it('gives every problem type an http status and a title', () => {
    for (const type of Object.values(ProblemType)) {
      const error = new ApiError(type, 'x');
      expect(error.httpStatus).toBeGreaterThanOrEqual(400);
      expect(error.title).not.toBe('');
    }
  });
});

describe('invalidParamsFromIssues', () => {
  it('names a field by its json path', () => {
    expect(
      invalidParamsFromIssues([{ path: ['component_ids', 0], message: 'Expected string' }]),
    ).toEqual([{ name: 'component_ids.0', reason: 'Expected string' }]);
  });

  it('falls back to the body when an issue has no path', () => {
    expect(invalidParamsFromIssues([{ path: [], message: 'Expected object' }])).toEqual([
      { name: 'body', reason: 'Expected object' },
    ]);
  });
});
