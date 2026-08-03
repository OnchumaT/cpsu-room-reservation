import { APPROVAL_MODE } from '../../../domain/policies/ApprovalPolicy.js';

/** Sets the department-wide default approval mode ('auto' | 'manual') — the
 * backend rejects with 403 unless the caller holds a can_approve position. */
export class SetApprovalModeUseCase {
  constructor({ appState, settingsRepository }) {
    this.appState = appState;
    this.settingsRepository = settingsRepository;
  }

  async execute({ mode }) {
    if (mode !== APPROVAL_MODE.AUTO && mode !== APPROVAL_MODE.MANUAL) {
      return { success: false, reason: 'invalid-mode' };
    }
    if (this.appState.approvalMode === mode) return { success: true, changed: false, mode };
    await this.settingsRepository.setApprovalMode(mode);
    this.appState.approvalMode = mode;
    return { success: true, changed: true, mode };
  }
}
