export const ACCESS_TOKEN_KEY = 'taskflow_access_token';
export const REFRESH_TOKEN_KEY = 'taskflow_refresh_token';
export const USER_KEY = 'taskflow_user';

export const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-primary-100 text-primary-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const PROVIDER_LABELS: Record<string, string> = {
  GOOGLE: 'Google',
  MICROSOFT: 'Microsoft',
  EXCHANGE: 'Exchange',
  PROTON_ICS: 'Proton',
};

export const PROVIDER_COLORS: Record<string, string> = {
  GOOGLE: 'bg-blue-100 text-blue-700',
  MICROSOFT: 'bg-sky-100 text-sky-700',
  EXCHANGE: 'bg-indigo-100 text-indigo-700',
  PROTON_ICS: 'bg-purple-100 text-purple-700',
};
