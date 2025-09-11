
import { firebase } from '@genkit-ai/firebase';
import { configureGenkit } from '@genkit-ai/core';
import { firebaseFunctions } from '@genkit-ai/firebase/functions';

export default configureGenkit({
  plugins: [
    firebase(),
    firebaseFunctions(),
  ],
  logSinks: ['firebase'],
  enableTracingAndMetrics: true,
});
