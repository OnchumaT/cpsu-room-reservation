// ApprovalPolicy — decides whether a new booking auto-approves or waits
// for Head review.
//
// Rules (in order):
//   1. Head's own bookings always auto-approve (Head IS the approver).
//   2. Otherwise, follow the department-wide approval mode Head configured
//      (Approval Settings page): 'auto' or 'manual'.

export const APPROVAL_MODE = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
});

export class ApprovalPolicy {
  static willAutoApprove({ role, approvalMode }) {
    return role === 'head' || approvalMode === APPROVAL_MODE.AUTO;
  }
}
