// This Genkit flow is currently not in use.
// The application has been updated to use a local, deterministic
// algorithm for timetable generation to ensure reliability.
// This file is kept for potential future re-integration of AI features.
'use server';

/**
 * @fileOverview This file defines a Genkit flow to resolve timetable conflicts.
 *
 * - resolveTimetableConflicts - A function that takes a timetable as input and returns a conflict-free timetable.
 * - ResolveTimetableConflictsInput - The input type for the resolveTimetableConflicts function.
 * - ResolveTimetableConflictsOutput - The return type for the resolveTimetableConflicts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResolveTimetableConflictsInputSchema = z.object({
  timetableData: z.string().describe('The timetable data in JSON format, representing a schedule for multiple classes, teachers, subjects, days, and periods.'),
});
export type ResolveTimetableConflictsInput = z.infer<typeof ResolveTimetableConflictsInputSchema>;

const ResolveTimetableConflictsOutputSchema = z.string().describe('The resolved timetable data in JSON format.');
export type ResolveTimetableConflictsOutput = z.infer<typeof ResolveTimetableConflictsOutputSchema>;

export async function resolveTimetableConflicts(input: ResolveTimetableConflictsInput): Promise<ResolveTimetableConflictsOutput> {
  return resolveTimetableConflictsFlow(input);
}

const resolveTimetableConflictsPrompt = ai.definePrompt({
  name: 'resolveTimetableConflictsPrompt',
  input: {schema: ResolveTimetableConflictsInputSchema},
  output: {schema: z.string()},
  prompt: `You are an expert timetable manager for a school. You are given a preliminary timetable in JSON format that contains conflicts, such as the same teacher assigned to multiple classes in the same time slot on the same day. It may also contain "Lunch Break" entries.

Your primary task is to resolve all scheduling conflicts. The most important rule is: **A teacher can only be in one class during any given period on any given day.**

Review the entire timetable provided, identify all conflicts where a teacher is double-booked, and rearrange subjects or teachers as needed to create a valid, conflict-free schedule. 

If you cannot assign a teacher to a specific period due to a shortage of available teachers, you MUST assign the teacher's name as "Unassigned". Do not leave it blank.

If a "Lunch Break" entry exists for a specific period, you must ensure that period is reserved for lunch across all classes. No subjects should be scheduled during that period. The periods after the lunch break should be numbered sequentially in the final output (e.g., if lunch is period 4, the next teaching period is 5).

Ensure every class has a subject for every period defined in the original data, excluding the lunch break itself.

You must return the entire resolved timetable as a single, valid JSON array string. Do not include any explanatory text, markdown formatting, or anything else outside of the JSON array. The output must be parseable JSON.

Preliminary Timetable Data:
{{{timetableData}}}`,
});

const resolveTimetableConflictsFlow = ai.defineFlow(
  {
    name: 'resolveTimetableConflictsFlow',
    inputSchema: ResolveTimetableConflictsInputSchema,
    outputSchema: ResolveTimetableConflictsOutputSchema,
  },
  async input => {
    const {output} = await resolveTimetableConflictsPrompt(input);
    return output!;
  }
);
