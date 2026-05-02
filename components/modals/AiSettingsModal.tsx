

import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Checkbox from '../Checkbox';
import Dropdown from '../Dropdown';
import { useSettings } from '../../contexts/SettingsContext';
import { usePublicToast } from '../../contexts/ToastContext';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTestNotification?: () => Promise<void>;
}

const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose, onSendTestNotification }) => {
  const { settings, setSettings } = useSettings();
  const { addToast } = usePublicToast();

  const [enableMemory, setEnableMemory] = useState(settings.enableMemory);
  const [enableEmotions, setEnableEmotions] = useState(settings.enableEmotions);
  const [enableTimeAwareness, setEnableTimeAwareness] = useState(settings.enableTimeAwareness);
  const [enableDateAwareness, setEnableDateAwareness] = useState(settings.enableDateAwareness);
  const [allowUnlimited, setAllowUnlimited] = useState(settings.allowUnlimitedGroupMembers);
  const [enableGroupMemory, setEnableGroupMemory] = useState(settings.enableGroupMemory);
  const [enableNotebookContext, setEnableNotebookContext] = useState(settings.enableNotebookContext);
  const [enableRAGContext, setEnableRAGContext] = useState(settings.enableRAGContext);

  useEffect(() => {
    if (isOpen) {
      setEnableMemory(settings.enableMemory);
      setEnableEmotions(settings.enableEmotions);
      setEnableTimeAwareness(settings.enableTimeAwareness);
      setEnableDateAwareness(settings.enableDateAwareness);
      setAllowUnlimited(settings.allowUnlimitedGroupMembers);
      setEnableGroupMemory(settings.enableGroupMemory);
      setEnableNotebookContext(settings.enableNotebookContext);
      setEnableRAGContext(settings.enableRAGContext);
    }
  }, [isOpen, settings]);

  const handleSaveAiSettings = () => {
    setSettings(prev => ({
      ...prev,
      enableMemory,
      enableEmotions,
      enableTimeAwareness,
      enableDateAwareness,
      allowUnlimitedGroupMembers: allowUnlimited,
      enableGroupMemory,
      enableNotebookContext,
      enableRAGContext,
    }));
    addToast({ message: "Đã lưu cài đặt AI.", type: 'success' });
    onClose();
  };
  

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài Đặt Tính Năng AI" size="md">
      <div className="space-y-5">
        <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
            <Checkbox
            id="enable-memory-checkbox"
            label="Bật Trí Nhớ Cho Nhân Vật"
            checked={enableMemory}
            onChange={(e) => setEnableMemory(e.target.checked)}
            description="Cho phép AI ghi nhớ các chi tiết quan trọng từ cuộc trò chuyện."
            />
        </div>
        <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
            <Checkbox
            id="enable-emotions-checkbox"
            label="Bật Cảm Xúc Động Cho Nhân Vật"
            checked={enableEmotions}
            onChange={(e) => setEnableEmotions(e.target.checked)}
            description="Cho phép cảm xúc của AI thay đổi, ảnh hưởng đến phản hồi."
            />
        </div>
        <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
            <Checkbox
            id="enable-time-awareness-checkbox"
            label="Bật Nhận Thức Thời Gian (Sáng/Trưa/Chiều/Tối)"
            checked={enableTimeAwareness}
            onChange={(e) => setEnableTimeAwareness(e.target.checked)}
            description="Cho phép AI phản hồi dựa trên thời gian trong ngày."
            />
        </div>
         <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
            <Checkbox
            id="enable-date-awareness-checkbox"
            label="Bật Nhận Thức Ngày Tháng"
            checked={enableDateAwareness}
            onChange={(e) => setEnableDateAwareness(e.target.checked)}
            description="Cho phép AI nhận biết ngày/tháng/năm và ngày trong tuần."
            />
        </div>

        <div className="pt-4 border-t border-border-light dark:border-border-dark mt-4">
            <h4 className="text-md font-semibold text-text-light dark:text-text-dark mb-3">
                <i className="fas fa-book mr-2 text-primary dark:text-primary-light"></i>Sổ Tay & Kiến Thức (RAG)
            </h4>
            <div className="space-y-3">
                <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
                    <Checkbox
                        id="enable-notebook-context-checkbox"
                        label="Sử dụng ngữ cảnh từ Sổ Tay (Lorebook)"
                        checked={enableNotebookContext}
                        onChange={(e) => setEnableNotebookContext(e.target.checked)}
                        description="AI sẽ tự động tìm kiếm thông tin trong Sổ Tay để làm phong phú thêm phản hồi."
                    />
                </div>
                <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
                    <Checkbox
                        id="enable-rag-context-checkbox"
                        label="Sử dụng ngữ cảnh từ Kho Kiến Thức (RAG)"
                        checked={enableRAGContext}
                        onChange={(e) => setEnableRAGContext(e.target.checked)}
                        description="AI sẽ tìm kiếm thông tin từ các tài liệu (PDF, TXT) bạn đã tải lên."
                    />
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-border-light dark:border-border-dark mt-4">
            <h4 className="text-md font-semibold text-text-light dark:text-text-dark mb-3">
                <i className="fas fa-users-cog mr-2 text-secondary dark:text-secondary-light"></i>Cài Đặt Chat Nhóm
            </h4>
            <div className="space-y-3">
                <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
                    <Checkbox
                        id="enable-unlimited-groups-checkbox"
                        label="Cho phép nhóm không giới hạn thành viên"
                        checked={allowUnlimited}
                        onChange={(e) => setAllowUnlimited(e.target.checked)}
                        description="Bỏ giới hạn 5 thành viên cho một nhóm chat. Lưu ý: Nhóm quá đông có thể làm giảm hiệu suất và tăng chi phí API."
                    />
                </div>
                 <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-border-light dark:border-border-dark">
                    <Checkbox
                        id="enable-group-memory-checkbox"
                        label="Bật Trí Nhớ Chat 1-1 Trong Nhóm"
                        checked={enableGroupMemory}
                        onChange={(e) => setEnableGroupMemory(e.target.checked)}
                        description="Cho phép AI trong nhóm sử dụng lịch sử chat 1-1 với bạn. Có thể làm tăng mức sử dụng API."
                    />
                </div>
            </div>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Lưu ý: Các tính năng nâng cao (trí nhớ, cảm xúc) có thể sử dụng thêm lệnh gọi API và ảnh hưởng đến tốc độ hoặc chi phí.
        </p>
      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="ghost" onClick={onClose} size="lg">Đóng</Button>
        <Button onClick={handleSaveAiSettings} size="lg" variant="primary">Lưu Cài Đặt AI</Button>
      </div>
    </Modal>
  );
};

export default AiSettingsModal;