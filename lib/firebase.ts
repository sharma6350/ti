
import { z } from 'zod';

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  signupDate: z.string().optional(),
  subscriptionEndDate: z.string().optional(),
});

export const subscriptionPlanSchema = z.object({
  name: z.string(),
  price: z.string(),
});

export const pendingSubscriptionSchema = z.object({
  id: z.string().optional(),
  schoolId: z.string(),
  planName: z.string(),
  paymentScreenshot: z.string(),
  timestamp: z.string(),
});

export const announcementSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
});

export const teacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  schoolId: z.string(),
});

export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  schoolId: z.string(),
  teacherId: z.string().optional(),
});

export const subjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    schoolId: z.string(),
});


export type School = z.infer<typeof schoolSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type PendingSubscription = z.infer<typeof pendingSubscriptionSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type Teacher = z.infer<typeof teacherSchema>;
export type Class = z.infer<typeof classSchema>;
export type Subject = z.infer<typeof subjectSchema>;
