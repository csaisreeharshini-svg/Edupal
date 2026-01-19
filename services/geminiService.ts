
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, LearningPath, Quiz, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a highly accurate learning path using Google Search to find real, high-quality YouTube video links.
 */
export const generateLearningPath = async (profile: UserProfile): Promise<LearningPath> => {
  const prompt = `Act as an Elite Curriculum Architect and Video Content Researcher.
    
    Student: ${profile.name}
    Topic: ${profile.topic} (Field: ${profile.subject})
    Level: ${profile.level}
    Goal: ${profile.goal}
    Language: ${profile.language}

    TASK:
    Generate a professional 5-module learning path for the specified topic.
    
    CRITICAL SEARCH INSTRUCTIONS:
    For EACH module, you MUST use Google Search to find a high-quality, EXACT YouTube URL. 
    1. The URL must be a direct watch link (e.g., https://www.youtube.com/watch?v=...).
    2. Prioritize academic sources: Khan Academy, MIT OpenCourseWare, CrashCourse, TED-Ed, 3Blue1Brown, Veritasium, Stanford, or specialized professionals.
    3. Ensure the video content precisely matches the module's sub-topic.
    4. DO NOT use placeholder links or generic search pages.

    Output format: JSON.
    Include a "personalizedReasoning" (max 150 characters).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  videoUrl: { type: Type.STRING, description: "A valid, direct YouTube watch URL." }
                },
                required: ["id", "title", "description", "topics", "videoUrl"]
              }
            },
            estimatedWeeks: { type: Type.NUMBER },
            personalizedReasoning: { type: Type.STRING }
          },
          required: ["modules", "estimatedWeeks", "personalizedReasoning"]
        }
      }
    });

    const path = JSON.parse(response.text || '{}');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || "Educational Context"
    })).filter((s: any) => s.uri);

    // All modules are unlocked as requested
    path.modules = path.modules.map((m: any) => ({
      ...m,
      status: 'current',
      sources: sources.length > 0 ? sources : undefined
    }));
    
    return path;
  } catch (error) {
    console.error("Path generation failed. Using robust fallback.", error);
    return {
      estimatedWeeks: 4,
      personalizedReasoning: "Fallback sequence activated due to search constraints. Focusing on core mastery.",
      modules: [
        {
          id: "m1",
          title: `Foundations of ${profile.topic}`,
          description: "A comprehensive overview of the fundamental principles.",
          status: 'current',
          topics: ["Terminology", "Core Concepts", "Introductory Theory"],
          videoUrl: "https://www.youtube.com/watch?v=0pThnRneDjw"
        }
      ]
    };
  }
};

/**
 * Generates 5 unique, specialized course titles based on the user's primary topic interest.
 */
export const getRelatedCourseSuggestions = async (profile: UserProfile): Promise<string[]> => {
  const prompt = `The student is interested in "${profile.topic}" (Level: ${profile.level}). 
  Suggest 5 unique, specialized, and compelling course titles that delve into advanced sub-fields or related areas of "${profile.topic}". 
  Return as a JSON array of 5 strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch {
    return [
      `Advanced ${profile.topic} Strategies`, 
      `The Ethics of ${profile.topic}`, 
      `Practical ${profile.topic} Applications`, 
      `Future Trends in ${profile.topic}`, 
      `${profile.topic} Masterclass`
    ];
  }
};

export const getTutorResponse = async (history: Message[], profile: UserProfile, currentModule: string): Promise<string> => {
  const systemInstruction = `You are "EduPal", an elite Socratic tutor.
    User: ${profile.name} (${profile.level} level).
    Current Module: ${currentModule}.
    
    RULES:
    1. NEVER give direct answers.
    2. Respond exclusively with questions or nudges that guide the student to discover the answer themselves.
    3. Keep responses extremely concise (max 50 words).
    4. Maintain the persona of a brilliant, encouraging mentor.
    5. Respond in ${profile.language}.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    config: { systemInstruction }
  });

  return response.text || "That's an interesting observation. How might we test that hypothesis?";
};

export const generateQuiz = async (profile: UserProfile, moduleTitle: string): Promise<Quiz> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a challenging 5-question MCQ for "${moduleTitle}". Level: ${profile.level}. Language: ${profile.language}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};
