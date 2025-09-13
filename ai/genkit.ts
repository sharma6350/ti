
import { firebase } from '@genkit-ai/firebase';
import { configureGenkit } from '@genkit-ai/core';

export default configureGenkit({
  plugins: [
    firebase(),
  ],
  logSinks: ['firebase'],
  enableTracingAndMetrics: true,
});
