import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; // Ensure firebase app is exported from here

const functions = getFunctions(app);

export async function generateIdeasFromTextOpenAI(nvidiaAnalysisText) {
  try {
    const generateIdeas = httpsCallable(functions, 'generateIdeas');
    const result = await generateIdeas({ text: nvidiaAnalysisText });

    // The Cloud Function now returns the structured data directly
    return result.data;

  } catch (error) {
    console.error("OpenAI Analysis Error:", error);
    throw new Error("Failed to generate ideas with OpenAI. Please try again.");
  }
}
