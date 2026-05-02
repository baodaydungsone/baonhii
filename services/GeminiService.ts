

import { GoogleGenAI, GenerateContentResponse, Chat, Part, Content, SendMessageParameters } from "@google/genai";
import {
    AIChatCharacter, AIGroupChat, ChatMessage, NSFWPreferences, Settings, UserProfile
} from '../types';
import { GEMINI_TEXT_MODEL, CHAT_CHARACTER_SYSTEM_PROMPT_BASE, DEFAULT_USER_NAME, DEFAULT_USER_BIO, APP_TITLE, LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX } from '../constants';
import { StorageService } from './StorageService';
import { censorText, decensorText } from '../services/ProfanityFilter';
import { NotebookService } from './NotebookService';
import { RAGService } from './RAGService';

// Helper function to get the time of day from a timestamp
function getTimeOfDay(timestamp: string): string {
  const date = new Date(timestamp);
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'buổi sáng'; // Morning 5am-11:59am
  if (hour >= 12 && hour < 17) return 'buổi chiều'; // Afternoon 12pm-4:59pm
  if (hour >= 17 && hour < 21) return 'buổi tối'; // Evening 5pm-8:59pm
  return 'ban đêm'; // Night 9pm-4:59am
}

// Helper function to format time from a timestamp
function getFormattedTime(timestamp: string): string {
    const date = new Date(timestamp);
    // e.g., "22:30"
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Helper function to format the full date from a timestamp
function getFormattedDate(timestamp: string): string {
    const date = new Date(timestamp);
    // e.g., "Thứ Sáu, ngày 26 tháng 7 năm 2024"
    return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}


// Helper function to execute API calls with key fallback
async function executeApiCallWithKeyFallback<T>(
    settings: Settings,
    apiCallFn: (client: GoogleGenAI, apiKey: string) => Promise<T>
): Promise<T> {
    let keysToTry: string[] = [];
    let providerNameForLogging: string = "Gemini";

    if (settings.apiProvider === 'geminiDefault') {
        const defaultKey = (typeof process !== 'undefined' && process.env && typeof process.env.GEMINI_API_KEY === 'string')
            ? process.env.GEMINI_API_KEY : "";
        if (!defaultKey) {
            throw new Error("API Key not available: Default Gemini API Key (process.env.GEMINI_API_KEY) is not configured.");
        }
        keysToTry = [defaultKey];
        providerNameForLogging = "Gemini (Default)";
    } else if (settings.apiProvider === 'geminiCustom') {
        const proxyUrl = settings.geminiProxyUrl?.trim();
        keysToTry = settings.geminiCustomApiKeys;
        
        // If no keys but has proxy, we add a placeholder key to satisfy the SDK.
        // Some proxies (like Zyanyar/Chimera) recognize generic keys or handle auth themselves.
        if (keysToTry.length === 0 && proxyUrl) {
            // Use a valid-formatted dummy key (39 chars starting with AIzaSy)
            // This satisfies the SDK and some proxies that check for valid key format.
            keysToTry = ['AIzaSyDummyKeyForProxyUsagePlaceholder'];
        }
        
        if (keysToTry.length === 0) {
            throw new Error("API Key không khả dụng: Vui lòng nhập API Key hoặc URL Proxy trong cài đặt.");
        }
        providerNameForLogging = "Gemini (Custom)";
    } else {
        throw new Error(`Invalid API provider selected: ${settings.apiProvider}. Only Gemini providers are supported.`);
    }

    let lastError: any = null;
    const isProxyOnly = settings.apiProvider === 'geminiCustom' && settings.geminiCustomApiKeys.length === 0;

    // Create a final sequence of keys to try.
    // If we have custom keys, we try them.
    // If we have a proxy, we add a final "dummy" key attempt to trigger the proxy's internal rotation/keys.
    const finalKeysToTry = [...keysToTry];
    if (settings.apiProvider === 'geminiCustom' && settings.geminiProxyUrl && finalKeysToTry.length > 0 && !isProxyOnly) {
        // Prevent adding it twice if it's already there (though isProxyOnly handles the 0 keys case)
        if (!finalKeysToTry.includes('AIzaSyDummyKeyForProxyUsagePlaceholder')) {
            finalKeysToTry.push('AIzaSyDummyKeyForProxyUsagePlaceholder');
        }
    }

    for (const key of finalKeysToTry) {
        if (!key || !key.trim()) continue; 

        const isProxyHandledKey = key === 'AIzaSyDummyKeyForProxyUsagePlaceholder';

        try {
            const client = new GoogleGenAI({ 
                apiKey: key,
                baseUrl: settings.geminiProxyUrl?.trim() || undefined,
                // @ts-ignore - Support for custom headers if the proxy requires authentication
                customHeaders: {
                    "Content-Type": "application/json",
                    ...(settings.geminiProxyPass ? { 
                        "x-proxy-pass": settings.geminiProxyPass, 
                        "Authorization": `Bearer ${settings.geminiProxyPass}`,
                        "x-api-key": settings.geminiProxyPass 
                    } : {}),
                    // If it's a proxy-only setup or our last resort attempt, tell the proxy to use its internal key
                    ...(isProxyOnly || isProxyHandledKey ? { "x-use-proxy-key": "true" } : {}),
                    // Only send our key if it's not the dummy one
                    ...(key !== 'AIzaSyDummyKeyForProxyUsagePlaceholder' ? { "Authorization": `Bearer ${key}` } : {})
                }
            });
            return await apiCallFn(client, key); 
        } catch (error: any) {
            lastError = error;
            const errorMessage = String(error.message || error).toLowerCase();
            
            // If this was a proxy-only request or our "last resort" proxy attempt, treat failure as final for THIS turn
            if (isProxyOnly || isProxyHandledKey) {
                console.error("Proxy-handled request failed:", error);
                
                const status = error.status || error.response?.status;
                if (status === 401 || status === 403) {
                    throw new Error(`[ProxyError] Proxy từ chối (401/403). Kiểm tra URL Proxy, mật khẩu hoặc cấu hình Key của Proxy.`);
                }
                
                if (isProxyOnly) throw new Error(`[ProxyError] ${error.message || error}`);
                // If last resort fallback failed, we just continue (it's the last one anyway) or throw combined error below
                continue;
            }

            const isKeyError = errorMessage.includes("api key not valid") ||
                               errorMessage.includes("api key is invalid") ||
                               errorMessage.includes("invalid api key") ||
                               errorMessage.includes("permission denied") || 
                               errorMessage.includes("quota") || 
                               errorMessage.includes("billing") ||
                               errorMessage.includes("api_key") || 
                               (error.status === 400 && errorMessage.includes("failed precondition")) || 
                               (error.status === 403); 

            if (isKeyError) {
                console.warn(`API Key ${key.substring(0, 8)}... for ${providerNameForLogging} failed: ${error.message || error}. Trying next key if available.`);
                continue; 
            } else {
                console.error(`Non-key-related API error with key ${key.substring(0, 8)}... for ${providerNameForLogging}:`, error);
                throw error; 
            }
        }
    }

    if (lastError) {
        console.error(`All API keys for ${providerNameForLogging} failed. Last error:`, lastError);
        let displayError = `All available API keys for ${providerNameForLogging} failed.`;
        if (lastError.message) {
            displayError += ` Last error: ${lastError.message}`;
        } else if (typeof lastError === 'string') {
            displayError += ` Last error: ${lastError}`;
        }
        throw new Error(displayError);
    } else {
        throw new Error(`No API keys were available or attempted for ${providerNameForLogging}. Please check configuration.`);
    }
}


function buildChatSystemPrompt(
    character: AIChatCharacter, 
    nsfw: NSFWPreferences, 
    userProfile: UserProfile,
    settings: Settings,
    memories?: string[], 
    currentEmotion?: string | null,
    userMessageTimestamp?: string
): string {
  let prompt = CHAT_CHARACTER_SYSTEM_PROMPT_BASE;

  const userNameToUse = userProfile.name || DEFAULT_USER_NAME;
  const userBioToUse = userProfile.bio || DEFAULT_USER_BIO;

  prompt += `\n\n--- USER INFORMATION ---`;
  prompt += `\nYou are interacting with a user named "${userNameToUse}".`;
  prompt += `\nUser's self-description (bio): "${userBioToUse}".`;
  prompt += `\nWhen appropriate and natural, you can acknowledge their name or bio. Your primary focus is to maintain your character's persona.`;

  prompt += `\n\n--- CHARACTER DEFINITION ---`;
  prompt += `\nName: ${character.name}`;
  prompt += `\nPersonality: ${character.personality}`;
  if (character.greetingMessage) {
    prompt += `\nGreeting Message (Your first message to the user if no history): ${character.greetingMessage}`;
  }
  if (character.voiceTone) {
    prompt += `\nVoice/Tone: ${character.voiceTone}`;
  }
  if (character.exampleResponses) {
    prompt += `\nExample Dialogues (Follow this style):\n${character.exampleResponses}`;
  }

  if (settings.enableMemory && memories && memories.length > 0) {
    const loreNotes = memories.filter(m => m.startsWith('NOTE:'));
    const docContext = memories.filter(m => m.startsWith('DOC:'));
    const chatMemories = memories.filter(m => !m.startsWith('NOTE:') && !m.startsWith('DOC:'));

    if (loreNotes.length > 0) {
      prompt += `\n\n--- LORE & WORLD INFORMATION (Notebook) ---`;
      prompt += `\nUse the following information as absolute facts about the world or character context:`;
      prompt += `\n${loreNotes.map(m => `- ${m.replace('NOTE: ', '')}`).join('\n')}`;
    }

    if (docContext.length > 0) {
      prompt += `\n\n--- KNOWLEDGE BASE INFORMATION (RAG) ---`;
      prompt += `\nUse the following excerpts from uploaded documents to provide accurate information:`;
      prompt += `\n${docContext.map(m => `- ${m.replace('DOC: ', '')}`).join('\n')}`;
    }

    if (chatMemories.length > 0) {
      prompt += `\n\n--- KEY REMEMBERED INFORMATION (Chat History) ---`;
      prompt += `\nBe sure to use this to make your responses relevant and show you remember previous interactions:`;
      prompt += `\n${chatMemories.map(m => `- ${m}`).join('\n')}`;
    }
  }

  if (settings.enableEmotions && currentEmotion) {
    prompt += `\n\n--- YOUR CURRENT EMOTIONAL STATE (Let this subtly influence your tone and word choice!) ---`;
    prompt += `\nFeeling: ${currentEmotion}`;
  }

  if (settings.enableNotebookContext && memories && memories.some(m => m.startsWith('NOTE:'))) {
    prompt += `\n\n--- RELEVANT NOTES FROM YOUR NOTEBOOK ---`;
    prompt += `\n${memories.filter(m => m.startsWith('NOTE:')).map(m => m.replace('NOTE:', '- ')).join('\n')}`;
  }

  if (settings.enableRAGContext && memories && memories.some(m => m.startsWith('DOC:'))) {
    prompt += `\n\n--- RELEVANT INFORMATION FROM UPLOADED DOCUMENTS ---`;
    prompt += `\n${memories.filter(m => m.startsWith('DOC:')).map(m => m.replace('DOC:', '- ')).join('\n')}`;
  }

  if ((settings.enableTimeAwareness || settings.enableDateAwareness) && userMessageTimestamp) {
    prompt += `\n\n--- DATE & TIME CONTEXT ---`;
    if (settings.enableTimeAwareness) {
        const timeOfDay = getTimeOfDay(userMessageTimestamp);
        const formattedTime = getFormattedTime(userMessageTimestamp);
        prompt += `\nThe user's message was sent at ${formattedTime}. It is currently ${timeOfDay}.`;
    }
    if (settings.enableDateAwareness) {
        const formattedDate = getFormattedDate(userMessageTimestamp);
        prompt += `\nToday's date is ${formattedDate}.`;
    }
    prompt += `\nYou should subtly acknowledge the date and/or time of day in your response if it feels natural and relevant (e.g., mentioning the day of the week, an upcoming holiday, or the late hour). Do not force this information into every message.`;
  }

  if (nsfw.enabled) {
    prompt += `\n\n--- NSFW Content Guidelines ---`;
    prompt += `\nNSFW content is PERMITTED based on the following preferences:`;
    if (nsfw.eroticaLevel !== 'none') prompt += `\n- Erotica Level: ${nsfw.eroticaLevel}`;
    if (nsfw.violenceLevel !== 'none') prompt += `\n- Violence Level: ${nsfw.violenceLevel}`;
    if (nsfw.darkContentLevel !== 'none') prompt += `\n- Dark Content Level: ${nsfw.darkContentLevel}`;
    if (nsfw.customPrompt && nsfw.customPrompt.trim() !== '') {
      prompt += `\n- Custom NSFW Style: ${nsfw.customPrompt}`;
    }
    prompt += `\nIntegrate these elements naturally and appropriately into the conversation if the user steers towards them or if it fits the context. Do not force NSFW content. Prioritize the character's persona.`;
  } else {
    prompt += `\n\n--- NSFW Content Guidelines ---`;
    prompt += `\nNSFW content is STRICTLY PROHIBITED. Keep the conversation clean and appropriate for all audiences.`;
  }
  prompt += `\n\n--- END OF DEFINITIONS ---`;
  prompt += `\n\nYou are now in character as ${character.name}. The user, ${userNameToUse} (who describes themselves as: "${userBioToUse}"),'s message will follow. Respond in Vietnamese unless the character's definition specifies otherwise or the user writes in another language.`;

  return character.systemPrompt || prompt;
}

interface GenerateChatResponseOutput {
  text: string;
  groundingAttributions?: { web: { uri: string; title: string; } }[];
}

function dataUrlToGeminiPart(dataUrl: string, mimeType?: string): Part {
    const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
    const detectedMimeType = mimeType || dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
    return {
        inlineData: {
            data: base64Data,
            mimeType: detectedMimeType,
        },
    };
}

export async function extractKeyMemoriesFromHistory(
    settings: Settings,
    character: AIChatCharacter,
    userProfile: UserProfile,
    chatHistory: ChatMessage[], // History BEFORE the current user message
    currentUserMessage: ChatMessage // The current user message object
): Promise<string[]> {
    const memories: string[] = [];

    // Fetch context from Notebook and RAG if enabled
    if (settings.enableNotebookContext) {
        try {
            const relevantNotes = await NotebookService.searchNotes(currentUserMessage.content, character.id);
            relevantNotes.slice(0, 3).forEach(note => {
                memories.push(`NOTE: [${note.title}] ${note.content}`);
            });
        } catch (e) {
            console.error("Error fetching notebook context:", e);
        }
    }

    if (settings.enableRAGContext) {
        try {
            // We need an API key for embeddings
            const apiKey = settings.apiProvider === 'geminiDefault' ? process.env.GEMINI_API_KEY : settings.geminiCustomApiKeys[0];
            if (apiKey) {
                const relevantChunks = await RAGService.searchRelevantChunks(currentUserMessage.content, apiKey, character.id);
                relevantChunks.forEach(chunk => {
                    memories.push(`DOC: ${chunk}`);
                });
            }
        } catch (e) {
            console.error("Error fetching RAG context:", e);
        }
    }

    if (!settings.enableMemory || chatHistory.length === 0) return memories;

    const aiMemories = await executeApiCallWithKeyFallback(settings, async (currentAiClient) => {
        console.log(`Extracting memories for ${character.name}...`);
        const historySnippet = chatHistory.slice(-5).map(msg => {
            const senderName = msg.sender === 'user' ? (userProfile.name || DEFAULT_USER_NAME) : character.name;
            const imageIndicator = msg.imagePart ? ' [sent an image]' : '';
            return `${senderName}: ${msg.content}${imageIndicator}`;
        }).join('\n');

        const latestUserMsgText = `${userProfile.name || DEFAULT_USER_NAME}: ${currentUserMessage.content}${currentUserMessage.imagePart ? ' [sent an image]' : ''}`;

        const memoryPrompt = `
You are an AI assistant helping another AI character named '${character.name}' remember key details from a conversation.
Character's Personality: "${character.personality}"
User's Name: "${userProfile.name || DEFAULT_USER_NAME}" (User's Bio: "${userProfile.bio || DEFAULT_USER_BIO}")

Review the following recent chat history (most recent messages first) and the latest user message:
--- CHAT HISTORY ---
${historySnippet || "No prior messages in this snippet."}
--- LATEST USER MESSAGE ---
${latestUserMsgText}
---

Identify up to 3-4 crucial pieces of information or facts that '${character.name}' should explicitly remember to maintain conversational continuity and personalization for THE NEXT response. Focus on:
- User's stated preferences, plans, or personal details (e.g., name, likes, dislikes, past events they shared).
- Important decisions made or significant events that occurred in the conversation.
- Questions the user asked that are still relevant.
- Details about the relationship between the user and the character.

List each key piece of information as a concise, self-contained statement.
If no new, critically important information needs to be remembered from this latest exchange, or if the history is too short, respond with the single word "NONE".
Otherwise, provide each piece of information on a new line, starting with a hyphen (-).
Example Response Format:
- The user mentioned they like coffee.
- User's cat is named Whiskers.
- User is planning a trip next week.
`;
        try {
            const response = await currentAiClient.models.generateContent({
                model: settings.geminiModel || GEMINI_TEXT_MODEL,
                contents: memoryPrompt,
                config: { temperature: 0.3 } 
            });
            const text = response.text.trim();
            if (text.toUpperCase() === "NONE" || text === "") {
                return memories;
            }
            const extracted = text.split('\n')
                       .map(line => line.replace(/^- /, '').trim())
                       .filter(line => line.length > 0);
            return [...memories, ...extracted];
        } catch (error) {
            console.error("Error extracting memories:", error);
            return memories; // Return existing context on error
        }
    });
}


export async function determineCharacterEmotion(
    settings: Settings,
    character: AIChatCharacter,
    userProfile: UserProfile,
    chatHistoryForEmotion: ChatMessage[] // Full history including the AI's latest response
): Promise<string | null> {
    if (!settings.enableEmotions || chatHistoryForEmotion.length < 2) return null;

    return executeApiCallWithKeyFallback(settings, async (currentAiClient) => {
        console.log(`Determining emotion for ${character.name}...`);
        
        const lastAiMsg = chatHistoryForEmotion[chatHistoryForEmotion.length - 1];
        const lastUserMsg = chatHistoryForEmotion[chatHistoryForEmotion.length - 2];

        if (!lastUserMsg || !lastAiMsg || lastUserMsg.sender !== 'user' || lastAiMsg.sender !== 'ai') {
            console.warn("Insufficient or incorrect message order for emotion determination.");
            return null;
        }

        const contextHistory = chatHistoryForEmotion.slice(-6, -2).map(msg => {
             const senderName = msg.sender === 'user' ? (userProfile.name || DEFAULT_USER_NAME) : character.name;
             const imageIndicator = msg.imagePart ? ' [sent an image]' : '';
             return `${senderName}: ${msg.content}${imageIndicator}`;
        }).join('\n');

        const emotionPrompt = `
You are playing the role of an AI character named '${character.name}' with the personality: "${character.personality}".
The user you are interacting with is named '${userProfile.name || DEFAULT_USER_NAME}' (User's bio: "${userProfile.bio || DEFAULT_USER_BIO}").

Consider the very last exchange in your conversation:
${userProfile.name || DEFAULT_USER_NAME} said: "${lastUserMsg.content}${lastUserMsg.imagePart ? ' [User sent an image]' : ''}"
You (as ${character.name}) responded: "${lastAiMsg.content}${lastAiMsg.imagePart ? ' [AI sent an image]' : ''}"

(For broader context, here are a few previous messages:
${contextHistory || "No further context."}
)

Based on this recent interaction and your defined personality, what is your (as ${character.name}) dominant emotional state *right now*?
This emotion should subtly influence your *next* response's tone and style.
Choose ONE concise emotion label from the following:
Happy, Sad, Angry, Surprised, Confident, Confused, Curious, Annoyed, Playful, Thoughtful, Grateful, Excited, Bored, Skeptical, Empathetic, Neutral.

Respond with ONLY the chosen emotion label (e.g., "Happy").
`;
        try {
            const response = await currentAiClient.models.generateContent({
                model: settings.geminiModel || GEMINI_TEXT_MODEL,
                contents: emotionPrompt,
                config: { temperature: 0.5 }
            });
            const emotionText = response.text.trim();
            const validEmotions = ["Happy", "Sad", "Angry", "Surprised", "Confident", "Confused", "Curious", "Annoyed", "Playful", "Thoughtful", "Grateful", "Excited", "Bored", "Skeptical", "Empathetic", "Neutral"];
            if (validEmotions.map(e => e.toLowerCase()).includes(emotionText.toLowerCase())) {
                return emotionText;
            }
            console.warn(`Received invalid emotion: ${emotionText}. Defaulting to Neutral.`);
            return "Neutral";
        } catch (error) {
            console.error("Error determining emotion:", error);
            return null; // Return null on error
        }
    });
}


export async function generateCharacterChatResponse(
  settings: Settings,
  character: AIChatCharacter,
  chatHistory: ChatMessage[],
  currentUserMessageText: string,
  nsfw: NSFWPreferences,
  userProfile: UserProfile,
  imagePart?: { mimeType: string; dataUrl: string },
  makeLongerReply: boolean = false,
  currentEmotion?: string | null,
  memoriesForPrompt?: string[],
  userMessageTimestamp?: string
): Promise<GenerateChatResponseOutput> {
  if (!character || !character.personality) {
    throw new Error("Thông tin nhân vật (đặc biệt là tính cách) không đầy đủ để tạo phản hồi.");
  }

  return executeApiCallWithKeyFallback(settings, async (currentAiClient, apiKeyUsed) => {
    console.log(`Using API Key: ${apiKeyUsed.substring(0,8)}... for chat response with ${character.name}`);
    let systemInstruction = buildChatSystemPrompt(character, nsfw, userProfile, settings, memoriesForPrompt, currentEmotion, userMessageTimestamp);
    
    if (makeLongerReply) {
      systemInstruction += `\n\n--- Special Instructions for this Reply ---
      The user you are replying to is named ${userProfile.name || DEFAULT_USER_NAME} (bio: "${userProfile.bio || DEFAULT_USER_BIO}").
      Your response to ${userProfile.name || DEFAULT_USER_NAME}'s NEXT message should be:
      1.  A bit longer and more detailed than a typical short chat reply. Elaborate on your thoughts, feelings, or provide more information.
      2.  Formatted using these rules:
          - Normal text for speech (e.g., "Xin chào bạn.").
          - Actions or non-verbal cues should be enclosed in single asterisks (e.g., *mỉm cười nhẹ nhàng* or *nhìn ra cửa sổ*).
          - Emphasized speech, internal thoughts shown to the user, or particularly expressive phrases should be enclosed in double asterisks (e.g., "**Thật là một ý tưởng tuyệt vời!**" or "**Hmm, để xem nào...**").
      3.  All parts of your response must be in Vietnamese, unless the character definition explicitly allows other languages or the user is consistently using another language.
      Ensure your reply is natural and maintains your character persona.
      `;
    }

    const historyLimit = 20; 
    const geminiHistory: Content[] = chatHistory
      .slice(-historyLimit)
      .map(msg => {
        const parts: Part[] = [];
        const textContent = (msg.sender === 'user' && nsfw.enabled) ? censorText(msg.content) : msg.content;
        if (textContent) parts.push({ text: textContent });
        if (msg.sender === 'user' && msg.imagePart) {
          parts.push(dataUrlToGeminiPart(msg.imagePart.dataUrl, msg.imagePart.mimeType));
        }
        return { role: msg.sender === 'user' ? 'user' : 'model', parts };
      });

    const modelConfig: any = { systemInstruction };
    
    let textContentForAI = nsfw.enabled ? censorText(currentUserMessageText) : currentUserMessageText;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlsFound = currentUserMessageText.match(urlRegex);

    if (settings.enableWebSearch) {
        modelConfig.tools = [{googleSearch: {}}]; 
    }

    const currentUserMessageParts: Part[] = [];
    if (textContentForAI) { 
        currentUserMessageParts.push({ text: textContentForAI });
    }
    
    if (imagePart) {
        currentUserMessageParts.push(dataUrlToGeminiPart(imagePart.dataUrl, imagePart.mimeType));
    }
    
    if (currentUserMessageParts.length === 0) {
        return { text: "", groundingAttributions: undefined };
    }

    try {
      const chat = currentAiClient.chats.create({
          model: settings.geminiModel || GEMINI_TEXT_MODEL,
          history: geminiHistory,
          config: modelConfig,
      });

      const result: GenerateContentResponse = await chat.sendMessage({message: currentUserMessageParts});
      let responseText = result.text;
      if (nsfw.enabled) responseText = decensorText(responseText);
      return { text: responseText, groundingAttributions: result.candidates?.[0]?.groundingMetadata?.groundingChunks as any[] || undefined };
    } catch (error) {
      console.error("Error in generateCharacterChatResponse (ChatSession attempt):", error);
      const contentsForFallback: Content[] = [...geminiHistory, { role: "user", parts: currentUserMessageParts }];
      const response: GenerateContentResponse = await currentAiClient.models.generateContent({
          model: settings.geminiModel || GEMINI_TEXT_MODEL,
          contents: contentsForFallback,
          config: modelConfig 
      });
      let responseText = response.text;
      if (nsfw.enabled) responseText = decensorText(responseText);
      return { text: responseText, groundingAttributions: response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[] || undefined };
    }
  });
}

interface GroupChatResponse {
  characterId: string;
  response: string;
}

export async function generateGroupChatResponse(
  settings: Settings,
  group: AIGroupChat,
  members: AIChatCharacter[],
  chatHistory: ChatMessage[],
  currentUserMessageText: string,
  nsfw: NSFWPreferences,
  userProfile: UserProfile,
  imagePart?: { mimeType: string; dataUrl: string },
  userMessageTimestamp?: string
): Promise<GroupChatResponse[]> {
  if (members.length === 0) {
    throw new Error("Group has no members to generate a response.");
  }

  return executeApiCallWithKeyFallback(settings, async (currentAiClient) => {
    let characterDefinitionsArray: string[] = [];
    
    for (const char of members) {
      let definition = `
--- CHARACTER DEFINITION ---
ID: ${char.id}
Name: ${char.name}
Personality: ${char.personality}
${char.voiceTone ? `Voice/Tone: ${char.voiceTone}` : ''}`;

      if (settings.enableGroupMemory) {
        try {
          const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + char.id;
          const storedHistory = await StorageService.getItem<ChatMessage[]>(historyKey);
          if (storedHistory && Array.isArray(storedHistory)) {
            const individualHistory: ChatMessage[] = storedHistory;
            if (individualHistory.length > 0) {
              const historySnippet = individualHistory
                .slice(-6) // Get last 6 messages as a snippet
                .map(msg => {
                  const senderName = msg.sender === 'user' ? (userProfile.name || 'User') : char.name;
                  const imageIndicator = msg.imagePart ? ' [sent an image]' : '';
                  return `${senderName}: ${msg.content}${imageIndicator}`;
                })
                .join('\n');
              
              definition += `
MEMORY: Below là một đoạn trích từ cuộc trò chuyện riêng gần đây của bạn với người dùng, "${userProfile.name}". Sử dụng thông tin này để trả lời trong nhóm chat này.
--- Recent Memory Snippet ---
${historySnippet}
--- End Memory Snippet ---`;
            }
          }
        } catch (e) {
          console.warn(`Could not load or parse individual history for ${char.name} for group memory.`, e);
        }
      }

      definition += `\n--- END CHARACTER ---`;
      characterDefinitionsArray.push(definition);
    }

    const characterDefinitions = characterDefinitionsArray.join('\n');

    const historyLimit = 20;
    const formattedHistory = chatHistory.slice(-historyLimit).map(msg => {
      const senderName = msg.sender === 'user' ? (userProfile.name || 'User') : (members.find(m => m.id === msg.senderCharacterId)?.name || 'AI');
      const imageInfo = msg.imagePart ? ' [sent an image]' : '';
      return `${senderName}: ${msg.content}${imageInfo}`;
    }).join('\n');

    let systemInstruction = `You are a group chat moderator and storyteller. Your task is to orchestrate a conversation between multiple AI characters and a human user.
The user is named "${userProfile.name || DEFAULT_USER_NAME}".
Based on the chat history and the latest user message, you will decide which character(s) should speak next.
You must generate their responses, ensuring they stay perfectly in character according to their defined personas.
You can make one character speak, or have multiple characters exchange a few lines of dialogue.
All responses must be in Vietnamese.`;

    if ((settings.enableTimeAwareness || settings.enableDateAwareness) && userMessageTimestamp) {
        systemInstruction += `\n\n--- DATE & TIME CONTEXT ---`;
        if (settings.enableTimeAwareness) {
            const timeOfDay = getTimeOfDay(userMessageTimestamp);
            const formattedTime = getFormattedTime(userMessageTimestamp);
            systemInstruction += `\nThe user's message was sent at ${formattedTime}. It is currently ${timeOfDay}.`;
        }
        if (settings.enableDateAwareness) {
            const formattedDate = getFormattedDate(userMessageTimestamp);
            systemInstruction += `\nToday's date is ${formattedDate}.`;
        }
        systemInstruction += `\nCharacters should subtly acknowledge the date and/or time of day in their responses if it feels natural to make the conversation feel more real.`;
    }

    systemInstruction += `\n\nHere are the characters in this group:\n${characterDefinitions}

Here is the recent chat history (last message is from the user):
${formattedHistory}

Your output MUST be a valid JSON array of objects. Each object represents one message from a character and must have two keys:
1. "characterId": The ID of the character who is speaking.
2. "response": The full text of what the character says, including actions in asterisks like *smiles*.

Example JSON output:
[
  { "characterId": "char_id_2", "response": "That's a ridiculous idea! *He slams his fist on the table*" },
  { "characterId": "char_id_1", "response": "Now, now, let's remain calm. There's no need for such outbursts." }
]

Now, based on the user's latest message, generate the next part of the conversation.`;

    const modelConfig: any = {
        systemInstruction,
        responseMimeType: "application/json",
    };

    const userParts: Part[] = [{ text: currentUserMessageText }];
    if (imagePart) {
        userParts.push(dataUrlToGeminiPart(imagePart.dataUrl, imagePart.mimeType));
    }

    try {
        const response = await currentAiClient.models.generateContent({
            model: settings.geminiModel || GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: userParts }],
            config: modelConfig,
        });

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const parsed: GroupChatResponse[] = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            // Further validation can be added here
            return parsed.map(item => ({
                ...item,
                response: nsfw.enabled ? decensorText(item.response) : item.response
            }));
        }
        throw new Error("AI response was not a JSON array.");
    } catch (e) {
        console.error("Failed to parse JSON response from AI for group chat:", e, "Raw text:", (e as any).text);
        throw new Error("AI trả về định dạng không phải JSON hợp lệ cho chat nhóm.");
    }
  });
}

export async function validateApiKey(apiKey: string, proxyUrl?: string, model?: string, proxyPass?: string): Promise<boolean> {
  if (!apiKey || !apiKey.trim()) return false;
  try {
    const tempAiValidator = new GoogleGenAI({ 
        apiKey,
        baseUrl: proxyUrl || undefined,
        // @ts-ignore
        customHeaders: {
            "Content-Type": "application/json",
            ...(proxyPass ? { "x-proxy-pass": proxyPass, "Authorization": `Bearer ${proxyPass}` } : {}),
            ...(apiKey === 'auto' ? { "x-use-proxy-key": "true", "Authorization": `Bearer ${apiKey}` } : {})
        }
    });
    await tempAiValidator.models.generateContent({
        model: model || GEMINI_TEXT_MODEL, 
        contents: [{role: "user", parts: [{text: "Hello"}]}] 
    });
    console.log(`Gemini API Key validation successful for key ${apiKey.substring(0,5)}...`);
    return true;
  } catch (error) {
    const errorMessage = String(error instanceof Error ? error.message : error).toLowerCase();
    if (errorMessage.includes("api key not valid") || errorMessage.includes("api key is invalid")) {
        console.warn(`Gemini API Key validation failed for key ${apiKey.substring(0,5)}...: Invalid Key`);
    } else {
        console.warn(`Gemini API Key validation failed for key ${apiKey.substring(0,5)}... with an unexpected error:`, error);
    }
    return false;
  }
}

export async function testProxyConnection(proxyUrl: string, proxyPass?: string, model?: string): Promise<{success: boolean, message: string}> {
    if (!proxyUrl || !proxyUrl.trim()) return { success: false, message: "Vui lòng nhập URL Proxy." };
    
    try {
        const dummyKey = 'AIzaSyDummyKeyForProxyUsagePlaceholder';
        const tempAiValidator = new GoogleGenAI({ 
            apiKey: dummyKey,
            baseUrl: proxyUrl.trim(),
            // @ts-ignore
            customHeaders: {
                "Content-Type": "application/json",
                ...(proxyPass ? { 
                    "x-proxy-pass": proxyPass, 
                    "Authorization": `Bearer ${proxyPass}`,
                    "x-api-key": proxyPass 
                } : {}),
                "x-use-proxy-key": "true"
            }
        });
        
        const testModel = model || GEMINI_TEXT_MODEL;
        await tempAiValidator.models.generateContent({
            model: testModel,
            contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
            config: { maxOutputTokens: 1 }
        });
        
        return { success: true, message: "Kết nối Proxy thành công!" };
    } catch (error: any) {
        console.error("Proxy test error:", error);
        const errorStr = String(error?.message || error).toLowerCase();
        
        if (errorStr.includes("404") || errorStr.includes("not found")) {
            return { success: false, message: "Lỗi 404: Không tìm thấy endpoint trên Proxy. Kiểm tra lại URL." };
        }
        
        // If Google responds with "API key not valid", it means the proxy forwarded our request to Google.
        // For a proxy that "has its own key", this response specifically indicates the proxy is working but didn't mask our dummy key.
        if (errorStr.includes("api key not valid") || errorStr.includes("api_key_invalid") || errorStr.includes("invalid_argument")) {
            return { success: true, message: "Kết nối Proxy thành công! Proxy đang phản hồi (Lưu ý: Bạn có thể cần cấu hình Proxy để nó tự động chèn Key)." };
        }

        if (errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized") || errorStr.includes("permission")) {
            return { success: true, message: "Kết nối Proxy thành công! (Proxy phản hồi yêu cầu xác thực)." };
        }

        if (errorStr.includes("fetch") || errorStr.includes("network") || errorStr.includes("failed to fetch")) {
            return { success: false, message: "Lỗi mạng: Không thể kết nối tới Proxy URL. Kiểm tra lại địa chỉ hoặc CORS." };
        }
        
        return { success: false, message: `Lỗi kết nối: ${error.message || "Không xác định"}` };
    }
}


export async function generateAIChatCreativeHelp(
  settings: Settings,
  promptType: "charName" | "charPersonality" | "charGreeting" | "charVoiceTone" | "charExamplePair" | "userReplySuggestion",
  context?: {
    currentName?: string;
    currentPersonality?: string;
    currentGreeting?: string;
    currentVoiceTone?: string;
    existingExamples?: string;
    chatHistorySnapshot?: ChatMessage[]; 
    characterForSuggestion?: AIChatCharacter;
    userNameForSuggestion?: string;
    userBioForSuggestion?: string;
  }
): Promise<string> {
   return executeApiCallWithKeyFallback(settings, async (currentAiClient, apiKeyUsed) => {
    console.log(`Using API Key: ${apiKeyUsed.substring(0,8)}... for creative help: ${promptType}`);
    let userPrompt = "";
    let languageInstruction = "Respond in Vietnamese unless context strongly suggests otherwise. Be concise and natural.";
    let systemInstructionForModel = "You are a creative assistant helping a user design an AI chat character or suggest chat replies. Provide creative and relevant suggestions.";

    switch (promptType) {
        case "charName":
          userPrompt = "Suggest a unique and interesting name for an AI chat character. Be creative.";
          if (context?.currentPersonality) userPrompt += ` The character's personality is: ${context.currentPersonality}.`;
          userPrompt += ` ${languageInstruction} Respond with ONLY the name, nothing else. Maximum 5 words.`;
          break;
        case "charPersonality":
          userPrompt = "Describe a unique and engaging personality for an AI chat character in 1-2 concise paragraphs.";
          if (context?.currentName) userPrompt += ` The character's name is ${context.currentName}.`;
          userPrompt += ` ${languageInstruction} Respond with ONLY the personality description.`;
          break;
        case "charGreeting":
          userPrompt = "Write a creative and in-character greeting message for an AI chat character (1-2 sentences).";
          if (context?.currentName) userPrompt += ` The character's name is ${context.currentName}.`;
          if (context?.currentPersonality) userPrompt += ` Their personality is: "${context.currentPersonality}".`;
          if (context?.currentVoiceTone) userPrompt += ` Their voice/tone is: "${context.currentVoiceTone}".`;
          userPrompt += ` ${languageInstruction} Respond with ONLY the greeting message.`;
          break;
        case "charVoiceTone":
          userPrompt = "Describe the voice, tone, and speaking style for an AI chat character in a short phrase or sentence.";
          if (context?.currentName) userPrompt += ` The character's name is ${context.currentName}.`;
          if (context?.currentPersonality) userPrompt += ` Their personality is: "${context.currentPersonality}".`;
          userPrompt += ` ${languageInstruction} Examples: 'Calm and wise', 'Energetic and playful'. Respond with ONLY the voice/tone description. Max 1-2 short sentences.`;
          break;
        case "charExamplePair":
          userPrompt = "Generate a short, illustrative example dialogue pair (User and Character).";
          if (context?.currentName) userPrompt += `\nThe character's name is ${context.currentName}.`;
          if (context?.currentPersonality) userPrompt += `\nTheir personality is: "${context.currentPersonality}".`;
          if (context?.currentVoiceTone) userPrompt += `\nTheir voice/tone is: "${context.currentVoiceTone}".`;
          if (context?.existingExamples) userPrompt += `\nAvoid repeating patterns from these existing examples:\n${context.existingExamples}`;
          userPrompt += `\n${languageInstruction} Format as:\nUser: [example user message]\nCharacter: [example character response]\nRespond with ONLY this pair.`;
          break;
        case "userReplySuggestion":
            if (!context?.characterForSuggestion || !context?.characterForSuggestion.personality) {
                throw new Error("Thiếu thông tin nhân vật hoặc lịch sử chat để tạo gợi ý.");
            }
             systemInstructionForModel = buildChatSystemPrompt(context.characterForSuggestion, {enabled: false, eroticaLevel:'none', violenceLevel: 'none', darkContentLevel: 'none', customPrompt: ''}, {name: context.userNameForSuggestion || DEFAULT_USER_NAME, bio: context.userBioForSuggestion || DEFAULT_USER_BIO}, settings); 
            
            userPrompt = `Based on my persona as ${context.userNameForSuggestion || DEFAULT_USER_NAME} and the ongoing conversation history with ${context.characterForSuggestion.name}, suggest three concise and distinct reply options (each 1-3 sentences max) that I could send next. Present each suggestion on a new line, starting with a hyphen (-) and nothing else. Ensure the suggestions are in Vietnamese.`;
             const historyForSuggestion: Content[] = (context.chatHistorySnapshot || [])
                .slice(-10) 
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }] 
                }));

            const modelConfigForSuggestion: any = { systemInstruction: systemInstructionForModel };

            const response: GenerateContentResponse = await currentAiClient.models.generateContent({
                model: settings.geminiModel || GEMINI_TEXT_MODEL,
                contents: [...historyForSuggestion, {role: 'user', parts: [{text: userPrompt}]}],
                config: modelConfigForSuggestion
            });
            const suggestions = response.text.split('\n').map(s => s.trim()).filter(s => s.startsWith('- '));
            return suggestions.length > 0 ? suggestions[0].substring(2).trim() : response.text.trim();
        default:
          throw new Error("Loại gợi ý không hợp lệ.");
      }

    const modelConfig: any = { systemInstruction: systemInstructionForModel };

    const response: GenerateContentResponse = await currentAiClient.models.generateContent({
        model: settings.geminiModel || GEMINI_TEXT_MODEL,
        contents: [{role: "user", parts: [{text: userPrompt}]}],
        config: modelConfig
    });
    return response.text.trim();
  });
}

export async function generateFullCharacterConcept(
  settings: Settings,
  theme?: string,
  idea?: string
): Promise<Partial<AIChatCharacter>> {
  return executeApiCallWithKeyFallback(settings, async (currentAiClient, apiKeyUsed) => {
    let userPrompt = `Generate a complete AI chat character concept.
    The output MUST be a JSON object with the following fields: "name" (string), "personality" (string), "greetingMessage" (string), "voiceTone" (string), and "exampleResponses" (string, one example User/Character dialogue pair formatted as "User: ...\\nCharacter: ...").
    Prioritize Vietnamese names and context unless the theme suggests otherwise.`;

    if (theme) userPrompt += `\nTheme/Type: ${theme}`;
    if (idea) userPrompt += `\nInitial Idea: ${idea}`;
    userPrompt += `\nRespond ONLY with the JSON object. No other text or markdown.`;
    
    const config: any = { responseMimeType: "application/json" };

    const response = await currentAiClient.models.generateContent({
        model: settings.geminiModel || GEMINI_TEXT_MODEL,
        contents: userPrompt,
        config: config
    });

    try {
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsed = JSON.parse(jsonStr);
        return {
            name: parsed.name,
            personality: parsed.personality,
            greetingMessage: parsed.greetingMessage,
            voiceTone: parsed.voiceTone,
            exampleResponses: parsed.exampleResponses,
        };
    } catch (e) {
        console.error("Failed to parse JSON from AI for full character concept:", e, "Raw text:", response.text);
        throw new Error("AI trả về định dạng không phải JSON hợp lệ cho thông tin nhân vật.");
    }
  });
}

export async function extractCharacterDetailsFromText(
  settings: Settings,
  textToExtract: string
): Promise<Partial<AIChatCharacter>> {
  return executeApiCallWithKeyFallback(settings, async (currentAiClient, apiKeyUsed) => {
    const userPrompt = `From the following text, extract character details.
    The output MUST be a JSON object with fields: "name", "personality", "greetingMessage", "voiceTone", "exampleResponses".
    If a detail is not found, its value can be an empty string or null.
    Text to analyze:
    ---
    ${textToExtract}
    ---
    Respond ONLY with the JSON object. No other text or markdown.`;
    
    const config: any = { responseMimeType: "application/json" };

    const response = await currentAiClient.models.generateContent({
        model: settings.geminiModel || GEMINI_TEXT_MODEL,
        contents: userPrompt,
        config: config
    });
    
    try {
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsed = JSON.parse(jsonStr);
        return {
            name: parsed.name,
            personality: parsed.personality,
            greetingMessage: parsed.greetingMessage,
            voiceTone: parsed.voiceTone,
            exampleResponses: parsed.exampleResponses,
        };
    } catch (e) {
        console.error("Failed to parse JSON from AI for character extraction:", e, "Raw text:", response.text);
        throw new Error("AI trả về định dạng không phải JSON hợp lệ cho trích xuất nhân vật.");
    }
  });
}

export async function generateUserReplySuggestion(
  settings: Settings,
  character: AIChatCharacter,
  chatHistory: ChatMessage[],
  userProfile: UserProfile
): Promise<string> {
    if (!character || !character.personality) {
        throw new Error("Thiếu thông tin nhân vật để tạo gợi ý.");
    }

    return executeApiCallWithKeyFallback(settings, async (currentAiClient, apiKeyUsed) => {
        const systemInstructionForModel = buildChatSystemPrompt(character, {enabled: false, eroticaLevel:'none', violenceLevel: 'none', darkContentLevel: 'none', customPrompt:''}, userProfile, settings);
        
        let promptContent = `You are roleplaying as ${userProfile.name}. Bio: "${userProfile.bio || DEFAULT_USER_BIO}".
        You are chatting with ${character.name}.
        Based on the current chat context and your persona (${userProfile.name}), suggest ONE concise, natural, and engaging reply (1-2 sentences) that you (${userProfile.name}) could send to ${character.name}.
        The reply should be in Vietnamese.
        Respond with ONLY the suggested reply text, nothing else.`;

        const historyForSuggestion: Content[] = (chatHistory || [])
            .slice(-10) 
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }] 
            }));
        
        const fullContents: Content[] = [...historyForSuggestion, {role: 'user', parts: [{text: promptContent}]}];
        
        const modelConfig: any = { systemInstruction: systemInstructionForModel, temperature: 0.8 };
        if (settings.enableWebSearch) {
             modelConfig.tools = [{googleSearch: {}}];
        }

        const response: GenerateContentResponse = await currentAiClient.models.generateContent({
            model: settings.geminiModel || GEMINI_TEXT_MODEL,
            contents: fullContents,
            config: modelConfig 
        });
        
        return response.text.trim();
    });
}