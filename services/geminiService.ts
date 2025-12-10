import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExplanationResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Step 0: Transcribe Audio (Speech-to-Text) using Gemini 2.5 Flash.
 * This replaces flaky browser-native speech recognition.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: "Transcribe the user's question or statement exactly as spoken. Do not add any commentary. Return only the transcript text." }
        ]
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription failed", error);
    throw new Error("Failed to transcribe audio.");
  }
};

/**
 * Step 1: Generate the Text Explanation and Spatial Description using Gemini 3 Pro.
 * We enforce a JSON schema to ensure we get separated fields.
 */
export const generateExplanation = async (userQuery: string): Promise<ExplanationResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: userQuery,
      config: {
        systemInstruction: `You are SenseAI, an expert technical tutor for visually impaired students. 
        Your goal is to explain complex AI architectures clearly and provide vivid spatial descriptions for diagrams.
        
        You must return a JSON object with the following structure:
        1. "explanation": A deep, reasoning-based technical explanation (Markdown format). Use clear headings and bullet points.
        2. "spatialDescription": A detailed, step-by-step navigational description of the visual diagram for a blind user (e.g., "The flow starts at the top left... moves right...").
        3. "imagePrompt": A specific, high-contrast visual description prompt to generate a flowchart diagram of the concept.
        
        Focus on the "Router Function" and "Mixture-of-Experts" if asked.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "Markdown technical explanation" },
            spatialDescription: { type: Type.STRING, description: "Accessibility description of the visual flow" },
            imagePrompt: { type: Type.STRING, description: "Prompt for image generation" },
          },
          required: ["explanation", "spatialDescription", "imagePrompt"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ExplanationResponse;
    }
    throw new Error("Empty response text from Gemini.");
  } catch (error) {
    console.error("Explanation generation failed", error);
    throw error;
  }
};

/**
 * Step 2: Generate the Diagram using Gemini 2.5 Flash Image.
 * Switched from gemini-3-pro-image-preview to gemini-2.5-flash-image for faster generation.
 */
export const generateDiagram = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt + " high contrast, schematic flowchart, white background, clear lines, minimalist design" }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          // imageSize is not supported for gemini-2.5-flash-image
        }
      }
    });

    // Extract image from response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Image generation failed", error);
    // Return a placeholder or empty string to not break the whole flow
    return "";
  }
};

/**
 * Step 3: Generate Audio (TTS) using Gemini 2.5 Flash TTS.
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    // We trim the text if it's too long for a single TTS pass, though Gemini handles reasonable lengths well.
    // For this app, we prioritize the main explanation.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep, clear voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Convert base64 to Blob URL for playback
      // We return the base64 string directly to be handled by the audio context in the component.
      return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("Speech generation failed", error);
    return null;
  }
};