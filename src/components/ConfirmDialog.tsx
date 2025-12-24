// 通用确认对话框组件

import React from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean; // 是否为危险操作（删除等）
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title = '确认操作',
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}) => {
  if (!visible) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__header">
          <h3 className="confirm-dialog__title">{title}</h3>
        </div>

        <div className="confirm-dialog__body">
          <p className="confirm-dialog__message">{message}</p>
        </div>

        <div className="confirm-dialog__footer">
          <button
            type="button"
            onClick={onCancel}
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`confirm-dialog__btn confirm-dialog__btn--confirm ${
              danger ? 'confirm-dialog__btn--danger' : ''
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
