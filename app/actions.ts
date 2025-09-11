
'use server';

import { z } from 'zod';
import { admin, firestore } from '@genkit-ai/firebase/admin';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { schoolSchema, subscriptionPlanSchema, pendingSubscriptionSchema, announcementSchema } from '../lib/firebase';

const db = firestore();

// Helper to safely parse documents
function safeParse<T extends z.ZodTypeAny>(schema: T, docs: admin.firestore.QueryDocumentSnapshot[]): z.infer<T>[] {
  const results: z.infer<T>[] = [];
  for (const doc of docs) {
    try {
      results.push(schema.parse({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error(`Skipping malformed document ${doc.id}:`, error);
    }
  }
  return results;
}

// School Management Flows
export const getSchoolsFlow = defineFlow(
  {
    name: 'getSchoolsFlow',
    outputSchema: z.array(schoolSchema),
  },
  async () => {
    const snapshot = await db.collection('schools').get();
    return safeParse(schoolSchema, snapshot.docs);
  }
);

export const addSchoolFlow = defineFlow(
  {
    name: 'addSchoolFlow',
    inputSchema: schoolSchema,
    outputSchema: z.void(),
  },
  async (school) => {
    await db.collection('schools').doc(school.id).set(school);
  }
);

export const updateSchoolFlow = defineFlow(
  {
    name: 'updateSchoolFlow',
    inputSchema: schoolSchema,
    outputSchema: z.void(),
  },
  async (school) => {
    await db.collection('schools').doc(school.id).update(school);
  }
);

export const deleteSchoolFlow = defineFlow(
  {
    name: 'deleteSchoolFlow',
    inputSchema: z.string(),
    outputSchema: z.void(),
  },
  async (schoolId) => {
    await db.collection('schools').doc(schoolId).delete();
  }
);

// Subscription Plan Flows
export const getSubscriptionPlansFlow = defineFlow(
  {
    name: 'getSubscriptionPlansFlow',
    outputSchema: z.record(subscriptionPlanSchema),
  },
  async () => {
    const doc = await db.collection('config').doc('subscriptionPlans').get();
    return z.record(subscriptionPlanSchema).parse(doc.data());
  }
);

export const saveSubscriptionPlansFlow = defineFlow(
  {
    name: 'saveSubscriptionPlansFlow',
    inputSchema: z.record(subscriptionPlanSchema),
    outputSchema: z.void(),
  },
  async (plans) => {
    await db.collection('config').doc('subscriptionPlans').set(plans);
  }
);

// Pending Subscription Flows
export const getPendingSubscriptionsFlow = defineFlow(
  {
    name: 'getPendingSubscriptionsFlow',
    outputSchema: z.array(pendingSubscriptionSchema),
  },
  async () => {
    const snapshot = await db.collection('pendingSubscriptions').get();
    return safeParse(pendingSubscriptionSchema, snapshot.docs);
  }
);

export const addPendingSubscriptionFlow = defineFlow(
  {
    name: 'addPendingSubscriptionFlow',
    inputSchema: pendingSubscriptionSchema,
    outputSchema: z.void(),
  },
  async (subscription) => {
    const { id, ...rest } = subscription;
    await db.collection('pendingSubscriptions').add(rest);
  }
);

export const deletePendingSubscriptionFlow = defineFlow(
  {
    name: 'deletePendingSubscriptionFlow',
    inputSchema: z.string(), // Expecting the document ID
    outputSchema: z.void(),
  },
  async (docId) => {
    await db.collection('pendingSubscriptions').doc(docId).delete();
  }
);


// Announcement Flows
export const getAnnouncementFlow = defineFlow(
  {
    name: 'getAnnouncementFlow',
    outputSchema: announcementSchema.optional(),
  },
  async () => {
    const doc = await db.collection('config').doc('announcement').get();
    return doc.exists ? announcementSchema.parse(doc.data()) : undefined;
  }
);

export const saveAnnouncementFlow = defineFlow(
  {
    name: 'saveAnnouncementFlow',
    inputSchema: announcementSchema,
    outputSchema: z.void(),
  },
  async (announcement) => {
    await db.collection('config').doc('announcement').set(announcement);
  }
);

export const clearAnnouncementFlow = defineFlow(
  {
    name: 'clearAnnouncementFlow',
    outputSchema: z.void(),
  },
  async () => {
    await db.collection('config').doc('announcement').delete();
  }
);


// Server Actions (to be called from the client)
export async function getSchools() {
  return await runFlow(getSchoolsFlow);
}

export async function addSchool(school: z.infer<typeof schoolSchema>) {
  return await runFlow(addSchoolFlow, school);
}

export async function updateSchool(school: z.infer<typeof schoolSchema>) {
  return await runFlow(updateSchoolFlow, school);
}

export async function deleteSchool(schoolId: string) {
  return await runFlow(deleteSchoolFlow, schoolId);
}

export async function getSubscriptionPlans() {
  return await runFlow(getSubscriptionPlansFlow);
}

export async function saveSubscriptionPlans(plans: z.infer<z.ZodRecord<z.ZodString, typeof subscriptionPlanSchema>>) {
    return await runFlow(saveSubscriptionPlansFlow, plans);
}

export async function getPendingSubscriptions() {
  return await runFlow(getPendingSubscriptionsFlow);
}

export async function addPendingSubscription(subscription: z.infer<typeof pendingSubscriptionSchema>) {
  return await runFlow(addPendingSubscriptionFlow, subscription);
}

export async function deletePendingSubscription(docId: string) {
  return await runFlow(deletePendingSubscriptionFlow, docId);
}

export async function getAnnouncement() {
  return await runFlow(getAnnouncementFlow);
}

export async function saveAnnouncement(announcement: z.infer<typeof announcementSchema>) {
  return await runFlow(saveAnnouncementFlow, announcement);
}

export async function clearAnnouncement() {
  return await runFlow(clearAnnouncementFlow);
}
