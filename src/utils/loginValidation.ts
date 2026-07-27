export type LoginFieldErrors = {
  studentId?: string;
  password?: string;
};

export function validateLoginInput(studentId: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const normalizedId = studentId.trim();

  if (!normalizedId) {
    errors.studentId = 'Enter your Student ID.';
  } else if (!/^\d{6,12}$/.test(normalizedId)) {
    errors.studentId = 'Use the 6–12 digit Student ID issued by your school.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

export function hasLoginFieldErrors(errors: LoginFieldErrors) {
  return Boolean(errors.studentId || errors.password);
}
