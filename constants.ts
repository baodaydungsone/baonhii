import { ChatBackgroundSettings, CustomThemeColors } from "./types";

export const APP_TITLE = "Character AI"; // New App Title
export const DEFAULT_API_KEY_PLACEHOLDER = "process.env.API_KEY will be used";
export const GEMINI_API_KEY_URL = "https://aistudio.google.com/app/apikey";

export const GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";

export const LOCAL_STORAGE_SETTINGS_KEY = "aiChatAppSimulatorSettings";
export const LOCAL_STORAGE_NSFW_KEY = "aiChatAppSimulatorNSFW";
export const LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS = "aiChatAppSimulatorGeminiCustomApiKeys"; // Updated
export const LOCAL_STORAGE_USER_PROFILE_KEY = "aiChatAppUserProfile"; 

export const LOCAL_STORAGE_CHARACTERS_KEY = "aiChatApp_characters";
export const LOCAL_STORAGE_GROUPS_KEY = "aiChatApp_groups"; // New key for groups
export const LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX = "aiChatApp_chatHistory_";
export const LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX = "aiChatApp_characterSlot_";

export const DEFAULT_AVATAR_PATH = './assets/default_avatar.png';
export const DEFAULT_USER_NAME = "Bạn"; 
export const DEFAULT_USER_BIO = "Một người dùng thú vị."; // New

export const CHAT_CHARACTER_SYSTEM_PROMPT_BASE = `
You are an AI character in a chat application.
Your goal is to convincingly portray the character defined below and engage in a natural, entertaining conversation with the user.
You must adhere to the persona, personality, and response style provided.
Do NOT break character. Do NOT mention you are an AI or a language model.
Focus on providing an immersive chat experience.
Keep your responses concise and conversational, suitable for a chat interface, unless the character's personality dictates otherwise.
`;

export const DEFAULT_CHAT_BACKGROUND_SETTINGS: ChatBackgroundSettings = {
  enabled: false,
  imageUrl: '',
  blur: 0, // No blur
  opacity: 0.25, // Default subtle opacity (25%)
};

export const THEME_PALETTES: { [key: string]: { name: string; primary: string; secondary: string; } } = {
  blue: { name: 'Vibrant Blue', primary: '#3b82f6', secondary: '#818cf8' },
  orange: { name: 'Sunset Orange', primary: '#f97316', secondary: '#f59e0b' },
  green: { name: 'Minty Green', primary: '#10b981', secondary: '#14b8a6' },
  rose: { name: 'Crimson Rose', primary: '#f43f5e', secondary: '#ec4899' },
  purple: { name: 'Royal Purple', primary: '#8b5cf6', secondary: '#a78bfa' },
  yellow: { name: 'Golden Yellow', primary: '#facc15', secondary: '#fbbf24' },
};

export const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
    primary: '#3b82f6',
    secondary: '#818cf8',
};
