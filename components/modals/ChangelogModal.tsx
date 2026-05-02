
import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { ChangelogEntry, ChangelogChange } from '../../types';
import { changelogData } from '../../changelogData'; // Assuming changelogData.ts is in src/
import { APP_TITLE } from '../../constants';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {

  const getTypeStyles = (type: ChangelogChange['type']): { icon: string; color: string; label: string } => {
    switch (type) {
      case 'new':
        return { icon: 'fas fa-sparkles', color: 'text-green-500 dark:text-green-400', label: 'MỚI' };
      case 'improved':
        return { icon: 'fas fa-arrow-alt-circle-up', color: 'text-blue-500 dark:text-blue-400', label: 'C.TIẾN' };
      case 'fixed':
        return { icon: 'fas fa-wrench', color: 'text-orange-500 dark:text-orange-400', label: 'SỬA LỖI' };
      case 'info':
        return { icon: 'fas fa-info-circle', color: 'text-purple-500 dark:text-purple-400', label: 'T.TIN' };
      default:
        return { icon: 'fas fa-star', color: 'text-slate-500 dark:text-slate-400', label: 'KHÁC' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Add timeZone: 'UTC' to ensure date is interpreted as is, not shifted by local timezone.
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nhật Ký Thay Đổi - ${APP_TITLE}`} size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 -mr-2">
        {changelogData.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">
            Chưa có thông tin cập nhật nào được ghi nhận.
          </p>
        ) : (
          changelogData.map((entry, index) => (
            <section key={index} className={`p-4 rounded-lg shadow-subtle ${index === 0 ? 'bg-primary/5 dark:bg-primary-dark/10 border border-primary/30 dark:border-primary-dark/40' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 pb-2 border-b border-border-light dark:border-border-dark">
                <h3 className={`text-xl font-semibold ${index === 0 ? 'text-primary dark:text-primary-light' : 'text-text-light dark:text-text-dark'}`}>
                  Phiên bản {entry.version}
                </h3>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-0">{formatDate(entry.date)}</span>
              </div>
              {entry.title && <p className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3 italic">{entry.title}</p>}
              
              <ul className="space-y-2.5">
                {entry.changes.map((change, changeIndex) => {
                  const typeStyle = getTypeStyles(change.type);
                  return (
                    <li key={changeIndex} className="flex items-start text-sm">
                      <span 
                        className={`flex-shrink-0 mr-2.5 mt-0.5 w-16 text-xs font-semibold ${typeStyle.color} bg-opacity-10 px-1.5 py-0.5 rounded-full text-center border ${typeStyle.color.replace('text-', 'border-')}`}
                        title={typeStyle.label}
                      >
                        <i className={`${typeStyle.icon} mr-1`}></i>{typeStyle.label}
                      </span>
                      <div className="flex-grow">
                        <span className="text-text-light dark:text-text-dark">{change.description}</span>
                        {change.details && change.details.length > 0 && (
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {change.details.map((detail, detailIndex) => (
                              <li key={detailIndex}>{detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={onClose} size="lg" variant="primary">
          Đóng
        </Button>
      </div>
    </Modal>
  );
};

export default ChangelogModal;
