export enum Theme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

export type ThemePalette = 'blue' | 'orange' | 'green' | 'rose' | 'purple' | 'yellow' | 'custom';

export interface CustomThemeColors {
  primary: string; // hex color string
  secondary: string; // hex color string
}

export enum ModalType {
  None,
  APISettings,
  NSFWSettings,
  GeneralSettings,
  Guide,
  CharacterCreation,
  GroupCreation,
  CharacterManagementAndImportModal,
  UserProfileSettings,
  ChatBackgroundSettings,
  ImagePreview, 
  MainAppSettings, 
  AISettings, 
  Changelog, 
  ThemeCustomization,
  NotebookNoteEditor, // New
  DocumentUploader, // New
}

export interface ChatBackgroundSettings {
  enabled: boolean;
  imageUrl: string;
  blur: number; // 0-20 (pixels)
  opacity: number; // 0.1-1.0 (represents 10% to 100%)
}

export type ApiProvider = "geminiDefault" | "geminiCustom";

export interface Settings {
  theme: Theme;
  themePalette: ThemePalette; // New
  customThemeColors: CustomThemeColors; // New
  apiKeyStatus: "unknown" | "valid" | "invalid" | "default"; 
  language: string;
  fontSize: number;
  useDefaultAPI: boolean; 
  chatBackground: ChatBackgroundSettings;
  apiProvider: ApiProvider;
  geminiCustomApiKeys: string[]; 
  geminiModel?: string;
  geminiProxyUrl?: string;
  geminiProxyPass?: string;
  enableWebSearch: boolean;
  enableMemory: boolean; 
  enableEmotions: boolean; 
  allowUnlimitedGroupMembers: boolean;
  enableGroupMemory: boolean;
  enableTimeAwareness: boolean;
  enableDateAwareness: boolean;
  enableNotebookContext: boolean; // New
  enableRAGContext: boolean; // New
}

export interface NSFWPreferences {
  enabled: boolean;
  eroticaLevel: "none" | "medium" | "high" | "extreme";
  violenceLevel: "none" | "medium" | "high" | "extreme";
  darkContentLevel: "none" | "medium" | "high" | "extreme";
  customPrompt?: string;
}

// --- User Profile Type ---
export interface UserProfile {
  name: string;
  avatarUrl?: string;
  bio?: string; 
}

// --- AI Chat App Specific Types ---

export interface AIChatCharacter {
  id: string;
  name: string;
  avatarUrl?: string;
  animatedAvatarUrl?: string; // Added for animated GIF avatars
  personality: string;
  voiceTone?: string;
  greetingMessage: string;
  exampleResponses?: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIGroupChat {
  id: string;
  name: string;
  avatarUrl?: string;
  memberIds: string[]; // Array of AIChatCharacter IDs
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded data or data URL
  };
}
export interface ChatMessage {
  id: string;
  chatId: string; // ID of the character OR the group
  sender: "user" | "ai";
  senderCharacterId?: string; // For AI messages in group chats, this is the AIChatCharacter.id of the speaker.
  content: string; 
  imagePart?: { 
    mimeType: string;
    dataUrl: string; 
  };
  timestamp: string;
  groundingAttributions?: { web: { uri: string; title: string; } }[];
}

export interface StoredAIChatCharacter extends AIChatCharacter {
  chatHistory: ChatMessage[];
}

export interface StoredAIGroupChat extends AIGroupChat {
  chatHistory: ChatMessage[];
}

// New interface for exporting/importing characters with their history
export interface StoredCharacterWithHistory {
  character: AIChatCharacter;
  chatHistory: ChatMessage[];
}


// --- Generic Types (can be kept if useful, like Toast) ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  icon?: string;
}

export interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export interface SavedCharacterSlotInfo {
  character: AIChatCharacter;
  savedAt: string;
}

export type AISuggestionField = "name" | "personality" | "greeting" | "voiceTone" | "example";

export type AISuggestionLoadingState = {
  [key in AISuggestionField]: boolean;
};

export type AIGenerationType = "fullRandom" | "extractFromText";

export type AIGenerationLoadingState = {
  [key in AIGenerationType]?: boolean;
};

// --- Navigation Types ---
export type ActiveTab = 'home' | 'history' | 'profile' | 'notebook' | 'knowledge';

// --- Changelog Types ---
export interface ChangelogChange {
  type: 'new' | 'improved' | 'fixed' | 'info';
  description: string;
  details?: string[]; // Optional detailed bullet points for a change
}
export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title?: string; // Optional title for the version release
  changes: ChangelogChange[];
}