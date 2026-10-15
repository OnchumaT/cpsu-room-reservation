// Mirrors the backend's DepartmentLeadPolicy: nobody holds both lead positions, and
// หัวหน้าภาควิชา is held by one person only (รองหัวหน้าภาควิชา by any number).
export const DEPARTMENT_LEAD_POSITION_NAMES = ['หัวหน้าภาควิชา', 'รองหัวหน้าภาควิชา'];
const SINGLE_HOLDER_POSITION_NAMES = ['หัวหน้าภาควิชา'];

export function isLeadPosition(position) {
  return DEPARTMENT_LEAD_POSITION_NAMES.includes(position?.positionName);
}

export function isSingleHolderPosition(position) {
  return SINGLE_HOLDER_POSITION_NAMES.includes(position?.positionName);
}
