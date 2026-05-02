import React, { useState, useEffect } from 'react';
import { NotebookService, Note } from '../services/NotebookService';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import { usePublicToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { AIChatCharacter } from '../types';

interface NotebookScreenProps {
  characters: AIChatCharacter[];
}

const NotebookScreen: React.FC<NotebookScreenProps> = ({ characters }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'global' | 'character'>('global');
  const [characterId, setCharacterId] = useState<string>('');
  const { addToast } = usePublicToast();

  const loadNotes = async () => {
    const data = await NotebookService.getNotes();
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      addToast({ message: "Vui lòng nhập tiêu đề và nội dung.", type: 'warning' });
      return;
    }
    if (scope === 'character' && !characterId) {
      addToast({ message: "Vui lòng chọn nhân vật cho ghi chú này.", type: 'warning' });
      return;
    }

    try {
      if (currentNote?.id) {
        await NotebookService.updateNote(currentNote.id, title, content, scope, scope === 'character' ? characterId : '');
        addToast({ message: "Đã cập nhật ghi chú.", type: 'success' });
      } else {
        await NotebookService.createNote(title, content, scope, scope === 'character' ? characterId : '');
        addToast({ message: "Đã tạo ghi chú mới.", type: 'success' });
      }
      await loadNotes();
      setIsEditing(false);
      setCurrentNote(null);
      setTitle('');
      setContent('');
      setScope('global');
      setCharacterId('');
    } catch (error) {
      console.error("Error saving note:", error);
      addToast({ message: "Lỗi khi lưu ghi chú.", type: 'error' });
    }
  };

  const handleEdit = (note: Note) => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content);
    setScope(note.scope || 'global');
    setCharacterId(note.characterId || '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await NotebookService.deleteNote(id);
      await loadNotes();
      addToast({ message: "Đã xóa ghi chú.", type: 'success' });
    } catch (error) {
      addToast({ message: "Lỗi khi xóa ghi chú.", type: 'error' });
    }
  };

  const characterOptions = characters.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Sổ Tay (Lorebook)</h1>
        <Button onClick={() => { setIsEditing(true); setCurrentNote(null); setTitle(''); setContent(''); setScope('global'); setCharacterId(''); }}>
          <i className="fas fa-plus mr-2"></i> Thêm Ghi Chú
        </Button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Ghi chú ở đây sẽ được AI sử dụng làm ngữ cảnh khi trò chuyện. Cậu có thể phân loại ghi chú là "Chung" hoặc "Riêng" cho từng nhân vật.
      </p>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-border-light dark:border-border-dark"
        >
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
            placeholder="Tiêu đề ghi chú..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg border-none focus:ring-2 focus:ring-primary text-lg font-semibold"
          />
          <textarea
            placeholder="Nội dung ghi chú..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full p-3 mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg border-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu Ghi Chú</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {notes.map(note => {
              const char = characters.find(c => c.id === note.characterId);
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-border-light dark:border-border-dark hover:shadow-md transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        {note.scope === 'global' ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-full font-bold uppercase tracking-wider">Chung</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-full font-bold uppercase tracking-wider">
                            {char ? char.name : 'Nhân vật'}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg truncate pr-8">{note.title}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(note)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(note.id!)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full">
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="mt-4 text-[10px] text-slate-400 uppercase tracking-wider">
                    Cập nhật: {new Date(note.updatedAt).toLocaleString('vi-VN')}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {notes.length === 0 && (
            <div className="col-span-full text-center py-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <i className="fas fa-sticky-note text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500">Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotebookScreen;
