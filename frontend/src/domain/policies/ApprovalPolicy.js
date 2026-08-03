// ApprovalPolicy — the backend now makes the real auto/manual decision
// (its response includes `autoApproved`); this is only used client-side
// as a best-effort UI hint (the banner on the booking form) before the
// user submits, mirroring the backend's own rule: an approver's own
// bookings always auto-approve, otherwise it follows the department's
// configured approval mode.

export const APPROVAL_MODE = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
});

export class ApprovalPolicy {
  static willAutoApprove({ canApprove, approvalMode }) {
    return canApprove || approvalMode === APPROVAL_MODE.AUTO;
  }
}
