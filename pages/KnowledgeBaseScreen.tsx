import React, { useState, useEffect, useRef } from 'react';
import { RAGService, RAGDocument } from '../services/RAGService';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import { usePublicToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { AIChatCharacter } from '../types';

interface KnowledgeBaseScreenProps {
  characters: AIChatCharacter[];
}

const KnowledgeBaseScreen: React.FC<KnowledgeBaseScreenProps> = ({ characters }) => {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<RAGDocument | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [scope, setScope] = useState<'global' | 'character'>('global');
  const [characterId, setCharacterId] = useState<string>('');
  
  const { addToast } = usePublicToast();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const data = await RAGService.getDocuments();
    setDocuments(data);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const getApiKey = () => {
    let apiKey = "";
    if (settings.apiProvider === 'geminiDefault') {
      apiKey = (typeof process !== 'undefined' && process.env && typeof process.env.GEMINI_API_KEY === 'string')
        ? process.env.GEMINI_API_KEY : "";
    } else {
      apiKey = settings.geminiCustomApiKeys[0] || "";
    }
    return apiKey;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      addToast({ message: "Vui lòng cấu hình Gemini API Key để xử lý tài liệu.", type: 'error' });
      return;
    }

    setIsUploading(true);
    addToast({ message: "Đang xử lý tài liệu và tạo vector... Vui lòng đợi.", type: 'info', duration: 10000 });

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await RAGService.extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("Không thể trích xuất văn bản từ tệp này.");
      }

      await RAGService.uploadDocument(file.name, text, apiKey, 'global');
      await loadDocuments();
      addToast({ message: "Đã tải lên tài liệu thành công!", type: 'success' });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      addToast({ message: `Lỗi: ${error.message || "Không thể tải lên tài liệu."}`, type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEdit = async () => {
    if (!currentDoc) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      addToast({ message: "Vui lòng cấu hình Gemini API Key.", type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      await RAGService.updateDocument(currentDoc.id, editName, editContent, apiKey, scope, scope === 'character' ? characterId : '');
      await loadDocuments();
      setIsEditing(false);
      setCurrentDoc(null);
      addToast({ message: "Đã cập nhật tài liệu.", type: 'success' });
    } catch (error) {
      addToast({ message: "Lỗi khi cập nhật tài liệu.", type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (doc: RAGDocument) => {
    setCurrentDoc(doc);
    setEditName(doc.name);
    setEditContent(doc.content);
    setScope(doc.scope || 'global');
    setCharacterId(doc.characterId || '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await RAGService.deleteDocument(id);
      await loadDocuments();
      addToast({ message: "Đã xóa tài liệu.", type: 'success' });
    } catch (error) {
      addToast({ message: "Lỗi khi xóa tài liệu.", type: 'error' });
    }
  };

  const characterOptions = characters.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Kiến Thức (RAG)</h1>
        <div className="flex gap-2">
          <Button onClick={() => fileInputRef.current?.click()} isLoading={isUploading} disabled={isUploading}>
            <i className="fas fa-upload mr-2"></i> Tải Lên
          </Button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.txt,.md"
          className="hidden"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
        <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center">
          <i className="fas fa-info-circle mr-2"></i> RAG là gì?
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Tải lên các tệp PDF hoặc văn bản. AI sẽ tự động tìm kiếm các đoạn văn bản liên quan nhất để trả lời bạn.
          Cậu có thể chỉnh sửa nội dung hoặc giới hạn tài liệu cho từng nhân vật.
        </p>
      </div>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-border-light dark:border-border-dark mb-8"
        >
          <h2 className="text-lg font-bold mb-4">Chỉnh sửa tài liệu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Dropdown
              label="Phạm vi (Scope)"
              options={[
                { value: 'global', label: 'Chung (Toàn cầu)' },
                { value: 'character', label: 'Riêng (Theo nhân vật)' }
              ]}
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
            />
            {scope === 'character' && (
              <Dropdown
                label="Chọn nhân vật"
                options={characterOptions}
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                placeholder="-- Chọn nhân vật --"
              />
            )}
          </div>

          <input
            type="text"
            placeholder="Tên tài liệu..."
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full p-3 mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg border-none focus:ring-2 focus:ring-primary font-semibold"
          />
          <textarea
            placeholder="Nội dung tài liệu..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={10}
            className="w-full p-3 mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg border-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Hủy</Button>
            <Button onClick={handleSaveEdit} isLoading={isUploading}>Lưu Thay Đổi</Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {documents.map(doc => {
              const char = characters.find(c => c.id === doc.characterId);
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-border-light dark:border-border-dark flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <i className={`fas ${doc.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-alt'} text-xl`}></i>
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold truncate">{doc.name}</h3>
                        {doc.scope === 'global' ? (
                          <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-full font-bold uppercase">Chung</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-full font-bold uppercase">
                            {char ? char.name : 'Nhân vật'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {doc.chunks?.length || 0} đoạn vector • {doc.content.length.toLocaleString()} ký tự
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(doc)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {documents.length === 0 && !isUploading && (
            <div className="text-center py-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <i className="fas fa-brain text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500">Chưa có tài liệu kiến thức nào. Hãy tải lên tệp đầu tiên!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseScreen;
