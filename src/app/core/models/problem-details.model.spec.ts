import { FieldError, ProblemDetails } from './problem-details.model';

describe('ProblemDetails model', () => {
  it('should allow creating a minimal ProblemDetails object', () => {
    const problem: ProblemDetails = {
      status: 400,
      type: 'https://api.example.com/errors/validation',
      title: 'Validation failed',
    };

    expect(problem.status).toBe(400);
    expect(problem.type).toBe('https://api.example.com/errors/validation');
    expect(problem.title).toBe('Validation failed');
    expect(problem.errorCode).toBeUndefined();
    expect(problem.resourceKey).toBeUndefined();
    expect(problem.correlationId).toBeUndefined();
    expect(problem.errors).toBeUndefined();
  });

  it('should allow creating a full ProblemDetails object', () => {
    const problem: ProblemDetails = {
      status: 400,
      type: 'https://api.example.com/errors/validation',
      title: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      resourceKey: 'customer.name.required',
      correlationId: 'abc-123',
      errors: {
        name: [{ field: 'name', code: 'required', resourceKey: 'customer.name.required' }],
      },
    };

    expect(problem.errorCode).toBe('VALIDATION_ERROR');
    expect(problem.resourceKey).toBe('customer.name.required');
    expect(problem.correlationId).toBe('abc-123');
    expect(problem.errors).toBeDefined();
    expect(problem.errors!['name']).toHaveLength(1);
  });

  it('should allow creating a FieldError object', () => {
    const fieldError: FieldError = {
      field: 'email',
      code: 'invalid',
      resourceKey: 'customer.email.invalid',
    };

    expect(fieldError.field).toBe('email');
    expect(fieldError.code).toBe('invalid');
    expect(fieldError.resourceKey).toBe('customer.email.invalid');
  });

  it('should allow FieldError without resourceKey', () => {
    const fieldError: FieldError = {
      field: 'name',
      code: 'required',
    };

    expect(fieldError.field).toBe('name');
    expect(fieldError.code).toBe('required');
    expect(fieldError.resourceKey).toBeUndefined();
  });

  it('should allow ProblemDetails with multiple field errors', () => {
    const problem: ProblemDetails = {
      status: 400,
      type: 'https://api.example.com/errors/validation',
      title: 'Validation failed',
      errors: {
        name: [{ field: 'name', code: 'required' }],
        email: [
          { field: 'email', code: 'required' },
          { field: 'email', code: 'invalid', resourceKey: 'customer.email.invalid' },
        ],
      },
    };

    expect(Object.keys(problem.errors!)).toHaveLength(2);
    expect(problem.errors!['email']).toHaveLength(2);
  });
});
