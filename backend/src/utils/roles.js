// Roles an admin may set on a user via CreateUserUseCase/UpdateUserUseCase.
// Deliberately excludes 'pending' — that role is only ever system-assigned
// by AuthService.loginWithGoogle on a first-time Google sign-up, never
// something an admin picks; "approving" a pending user means moving them
// into one of these instead.
export const VALID_ROLES = new Set(['teacher', 'staff', 'admin']);
















