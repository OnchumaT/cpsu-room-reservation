import { APPROVAL_MODE } from '../../../domain/policies/ApprovalPolicy.js';

/** Sets the department-wide default approval mode ('auto' | 'manual') — the
 * backend rejects with 403 unless the caller holds a can_approve position. */
export class SetApprovalModeUseCase {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  /** `currentMode` is passed in by the caller (owned by AppShellContext in
   * the React app) since this use-case no longer holds session state itself. */
  async execute({ mode, currentMode }) {
    if (mode !== APPROVAL_MODE.AUTO && mode !== APPROVAL_MODE.MANUAL) {
      return { success: false, reason: 'invalid-mode' };
    }
    if (currentMode === mode) return { success: true, changed: false, mode };
    await this.settingsRepository.setApprovalMode(mode);
    return { success: true, changed: true, mode };
  }
}
