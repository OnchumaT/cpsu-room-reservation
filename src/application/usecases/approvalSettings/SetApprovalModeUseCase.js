import { APPROVAL_MODE } from '../../../domain/policies/ApprovalPolicy.js';

/** Head-only: sets the department-wide default approval mode ('auto' | 'manual'). */
export class SetApprovalModeUseCase {
  constructor({ appState }) {
    this.appState = appState;
  }

  execute({ mode }) {
    if (mode !== APPROVAL_MODE.AUTO && mode !== APPROVAL_MODE.MANUAL) {
      return { success: false, reason: 'invalid-mode' };
    }
    if (this.appState.approvalMode === mode) return { success: true, changed: false, mode };
    this.appState.approvalMode = mode;
    return { success: true, changed: true, mode };
  }
}
