// Enums matching Prisma schema
export type CalendarProvider = 'GOOGLE' | 'MICROSOFT' | 'EXCHANGE' | 'PROTON_ICS';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ReminderType = 'BIRTHDAY' | 'FOLLOW_UP' | 'MORNING_BRIEFING' | 'EVENING_REVIEW' | 'CUSTOM';

// Models
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  telegramChatId: string | null;
  timezone: string;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedMins: number | null;
  completedAt: string | null;
  notes: string | null;
  tags: string[];
  sourceEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  notes: string | null;
  lastContactAt: string | null;
  followUpDays: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Calendar {
  id: string;
  userId: string;
  provider: CalendarProvider;
  name: string;
  externalId: string | null;
  icsUrl: string | null;
  color: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  externalId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  kidId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Kid {
  id: string;
  userId: string;
  name: string;
  birthday: string | null;
  notes: string | null;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  type: ReminderType;
  title: string;
  message: string | null;
  scheduledAt: string;
  sentAt: string | null;
  personId: string | null;
  kidId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// API response types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
