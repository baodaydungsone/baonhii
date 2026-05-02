import { StorageService } from './StorageService';

export interface Note {
  id: string;
  title: string;
  content: string;
  scope: 'global' | 'character';
  characterId?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'notebook_notes';

export const NotebookService = {
  async getNotes(): Promise<Note[]> {
    return await StorageService.getItem<Note[]>(STORAGE_KEY) || [];
  },

  async createNote(title: string, content: string, scope: 'global' | 'character' = 'global', characterId?: string) {
    const notes = await this.getNotes();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title,
      content,
      scope,
      characterId,
      createdAt: now,
      updatedAt: now,
    };
    const updatedNotes = [newNote, ...notes];
    await StorageService.setItem(STORAGE_KEY, updatedNotes);
    return newNote;
  },

  async updateNote(noteId: string, title: string, content: string, scope?: 'global' | 'character', characterId?: string) {
    const notes = await this.getNotes();
    const now = new Date().toISOString();
    const updatedNotes = notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          title,
          content,
          scope: scope || n.scope,
          characterId: characterId !== undefined ? characterId : n.characterId,
          updatedAt: now
        };
      }
      return n;
    });
    await StorageService.setItem(STORAGE_KEY, updatedNotes);
  },

  async deleteNote(noteId: string) {
    const notes = await this.getNotes();
    const updatedNotes = notes.filter(n => n.id !== noteId);
    await StorageService.setItem(STORAGE_KEY, updatedNotes);
  },

  async searchNotes(searchTerm: string, currentCharacterId?: string): Promise<Note[]> {
    const notes = await this.getNotes();
    let filteredNotes = notes;
    
    // Filter by scope
    if (currentCharacterId) {
      filteredNotes = notes.filter(n => n.scope === 'global' || n.characterId === currentCharacterId);
    }

    if (!searchTerm) return filteredNotes;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    // If we have few notes, just return them all to ensure AI has context
    if (filteredNotes.length <= 3) return filteredNotes;

    // Otherwise, do a keyword-based search
    return filteredNotes.filter(note => {
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      
      // Check if title or content is directly mentioned
      if (lowerSearch.includes(title) || title.includes(lowerSearch)) return true;
      
      // Split title into keywords and check each
      const keywords = title.split(/[\s,]+/).filter(k => k.length > 2);
      return keywords.some(kw => lowerSearch.includes(kw));
    });
  }
};
