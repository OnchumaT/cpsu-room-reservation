// Nobody holds both หัวหน้าภาควิชา and รองหัวหน้าภาควิชา. หัวหน้าภาควิชา is held by
// one person only; รองหัวหน้าภาควิชา by any number. Positions carry no stable key,
// so they are matched by name.
export const DEPARTMENT_LEAD_POSITION_NAMES = ['หัวหน้าภาควิชา', 'รองหัวหน้าภาควิชา'];
const SINGLE_HOLDER_POSITION_NAMES = ['หัวหน้าภาควิชา'];

export const DepartmentLeadPolicy = {
  isLeadPosition(position) {
    return DEPARTMENT_LEAD_POSITION_NAMES.includes(position?.positionName);
  },

  isSingleHolder(position) {
    return SINGLE_HOLDER_POSITION_NAMES.includes(position?.positionName);
  },
};
