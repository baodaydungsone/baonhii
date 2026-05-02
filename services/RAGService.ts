import { StorageService } from './StorageService';
import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface RAGDocument {
  id: string;
  name: string;
  content: string;
  scope: 'global' | 'character';
  characterId?: string;
  createdAt: string;
  chunks?: { text: string; embedding: number[] }[];
}

const STORAGE_KEY = 'rag_documents';

export const RAGService = {
  async getDocuments(): Promise<RAGDocument[]> {
    return await StorageService.getItem<RAGDocument[]>(STORAGE_KEY) || [];
  },

  async extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  },

  async generateEmbeddings(text: string, apiKey: string): Promise<{ text: string; embedding: number[] }[]> {
    const ai = new GoogleGenAI({ apiKey });
    const chunks = this.chunkText(text, 1000); // 1000 chars per chunk
    const results: { text: string; embedding: number[] }[] = [];

    for (const chunk of chunks) {
      try {
        const result = await ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: [chunk],
        });
        
        if (result && result.embeddings && result.embeddings.length > 0) {
          results.push({ text: chunk, embedding: result.embeddings[0].values });
        } else {
          console.error("Invalid embedding response structure:", result);
        }
      } catch (error) {
        console.error("Error generating embedding for chunk:", error);
      }
    }
    return results;
  },

  chunkText(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.substring(i, i + size));
    }
    return chunks;
  },

  async uploadDocument(name: string, content: string, apiKey: string, scope: 'global' | 'character' = 'global', characterId?: string) {
    const documents = await this.getDocuments();
    const chunks = await this.generateEmbeddings(content, apiKey);
    
    if (chunks.length === 0) {
      throw new Error("Không thể tạo vector cho tài liệu này. Vui lòng kiểm tra API Key.");
    }

    const newDoc: RAGDocument = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      name,
      content,
      scope,
      characterId,
      createdAt: new Date().toISOString(),
      chunks,
    };
    
    const updatedDocs = [newDoc, ...documents];
    await StorageService.setItem(STORAGE_KEY, updatedDocs);
    return newDoc;
  },

  async updateDocument(docId: string, name: string, content: string, apiKey: string, scope?: 'global' | 'character', characterId?: string) {
    const documents = await this.getDocuments();
    const docToUpdate = documents.find(d => d.id === docId);
    if (!docToUpdate) throw new Error("Document not found");

    let chunks = docToUpdate.chunks;
    // Re-vectorize if content changed
    if (content !== docToUpdate.content) {
      chunks = await this.generateEmbeddings(content, apiKey);
    }

    const updatedDocs = documents.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          name,
          content,
          scope: scope || d.scope,
          characterId: characterId !== undefined ? characterId : d.characterId,
          chunks
        };
      }
      return d;
    });
    await StorageService.setItem(STORAGE_KEY, updatedDocs);
  },

  async deleteDocument(docId: string) {
    const documents = await this.getDocuments();
    const updatedDocs = documents.filter(d => d.id !== docId);
    await StorageService.setItem(STORAGE_KEY, updatedDocs);
  },

  async searchRelevantChunks(queryText: string, apiKey: string, currentCharacterId?: string, limit: number = 5): Promise<string[]> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const queryEmbeddingResult = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [queryText],
      });
      
      if (!queryEmbeddingResult || !queryEmbeddingResult.embeddings || queryEmbeddingResult.embeddings.length === 0) {
        throw new Error("Failed to generate query embedding.");
      }
      
      const queryEmbedding = queryEmbeddingResult.embeddings[0].values;
      let documents = await this.getDocuments();

      // Filter by scope
      if (currentCharacterId) {
        documents = documents.filter(d => d.scope === 'global' || d.characterId === currentCharacterId);
      }

      const allChunks: { text: string; score: number }[] = [];

      documents.forEach(doc => {
        if (doc.chunks) {
          doc.chunks.forEach(chunk => {
            const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            allChunks.push({ text: chunk.text, score });
          });
        }
      });

      allChunks.sort((a, b) => b.score - a.score);
      return allChunks.slice(0, limit).map(c => c.text);
    } catch (error) {
      console.error("Error searching relevant chunks:", error);
      return [];
    }
  },

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
};
