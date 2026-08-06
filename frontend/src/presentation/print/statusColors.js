// Shared by both print documents — kept separate from statusLabels.js
// (which is presentation-layer but React-agnostic label text) since these
// are raw hex values baked into a printed document's inline CSS.
export const STATUS_COLOR = { approved: '#166534', pending: '#92400e', rejected: '#991b1b', cancelled: '#4A4F7A' };
export const STATUS_BG = { approved: '#dcfce7', pending: '#FEF3C7', rejected: '#fee2e2', cancelled: '#F4F5FA' };
