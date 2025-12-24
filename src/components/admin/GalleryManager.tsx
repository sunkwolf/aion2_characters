import { useState, useRef, useEffect } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import './GalleryManager.css';

interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  showOnHome: boolean;
  approved: boolean;
  uploadTime?: string;
}

const GalleryManager = () => {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    type: 'reject' | 'delete' | null;
    imageId: string;
    imageName: string;
  }>({
    visible: false,
    type: null,
    imageId: '',
    imageName: '',
  });

  // 组件加载时获取图片列表
  useEffect(() => {
    loadGalleryImages();
  }, []);

  // 从后端加载所有图片（包括待审核）
  const loadGalleryImages = async () => {
    try {
      const response = await fetch('/api/gallery/list');
      const data = await response.json();
      if (data.success) {
        setGalleryImages(data.data);
      }
    } catch (error) {
      console.error('加载相册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理图片上传（管理员上传）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('isAdmin', 'true'); // 管理员上传默认通过

        const response = await fetch('/api/gallery/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          console.log('上传成功:', data.data);
          // 重新加载图片列表
          loadGalleryImages();
        } else {
          console.error('上传失败:', data.error);
        }
      } catch (error) {
        console.error('上传错误:', error);
      }
    }

    // 清空 input 以便再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 切换首页展示
  const toggleShowOnHome = async (id: string) => {
    try {
      const response = await fetch(`/api/gallery/toggle-home/${id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // 更新本地状态
        setGalleryImages(prev =>
          prev.map(img =>
            img.id === id ? { ...img, showOnHome: !img.showOnHome } : img
          )
        );
      } else {
        console.error('设置失败:', data.error);
      }
    } catch (error) {
      console.error('设置失败:', error);
    }
  };

  // 审核通过
  const approveImage = async (id: string) => {
    try {
      const response = await fetch(`/api/gallery/approve/${id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // 更新本地状态
        setGalleryImages(prev =>
          prev.map(img =>
            img.id === id ? { ...img, approved: true } : img
          )
        );
      } else {
        console.error('审核失败:', data.error);
      }
    } catch (error) {
      console.error('审核失败:', error);
    }
  };

  // 拒绝审核（删除图片）
  const rejectImage = async (id: string, imageName: string) => {
    setConfirmDialog({
      visible: true,
      type: 'reject',
      imageId: id,
      imageName: imageName,
    });
  };

  // 删除图片
  const deleteImage = async (id: string, imageName: string) => {
    setConfirmDialog({
      visible: true,
      type: 'delete',
      imageId: id,
      imageName: imageName,
    });
  };

  // 确认操作
  const handleConfirm = async () => {
    const { type, imageId } = confirmDialog;

    // 关闭对话框
    setConfirmDialog({ visible: false, type: null, imageId: '', imageName: '' });

    try {
      const response = await fetch(`/api/gallery/${imageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // 从本地状态移除
        setGalleryImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        console.error('删除失败:', data.error);
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 取消操作
  const handleCancel = () => {
    setConfirmDialog({ visible: false, type: null, imageId: '', imageName: '' });
  };

  if (loading) {
    return (
      <div className="gallery-manager">
        <div className="gallery-manager__loading">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-manager">
      <div className="gallery-manager__header">
        <div className="gallery-manager__info">
          <h2 className="gallery-manager__title">相册管理</h2>
          <p className="gallery-manager__hint">
            审核用户上传的图片，带有 ⭐ 标记的图片会展示在首页的「成员风采」区域
          </p>
          <div className="gallery-manager__stats">
            <span className="stat-item">
              总计: {galleryImages.length} 张
            </span>
            <span className="stat-item stat-item--pending">
              待审核: {galleryImages.filter(img => !img.approved).length} 张
            </span>
            <span className="stat-item stat-item--approved">
              已通过: {galleryImages.filter(img => img.approved).length} 张
            </span>
          </div>
        </div>
        <div className="gallery-manager__actions">
          <button
            className="gallery-manager__upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {galleryImages.length > 0 ? (
        <div className="gallery-manager__grid">
          {galleryImages.map(img => (
            <div key={img.id} className={`gallery-manager__item ${!img.approved ? 'gallery-manager__item--pending' : ''}`}>
              <div className="gallery-manager__item-image">
                <img
                  src={img.url}
                  alt={img.originalName}
                  onClick={() => setSelectedImage(img.url)}
                />
                {!img.approved && (
                  <div className="gallery-manager__item-badge gallery-manager__item-badge--pending">
                    <span>⏳</span>
                    <span>待审核</span>
                  </div>
                )}
                {img.approved && img.showOnHome && (
                  <div className="gallery-manager__item-badge">
                    <span>⭐</span>
                    <span>首页展示</span>
                  </div>
                )}
              </div>
              <div className="gallery-manager__item-info">
                <span className="gallery-manager__item-name" title={img.originalName}>
                  {img.originalName}
                </span>
              </div>
              <div className="gallery-manager__item-actions">
                {!img.approved ? (
                  <>
                    <button
                      className="gallery-manager__approve-btn"
                      onClick={() => approveImage(img.id)}
                      title="审核通过"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      通过审核
                    </button>
                    <button
                      className="gallery-manager__reject-btn"
                      onClick={() => rejectImage(img.id, img.originalName)}
                      title="拒绝审核"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      拒绝
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`gallery-manager__star-btn ${img.showOnHome ? 'gallery-manager__star-btn--active' : ''}`}
                      onClick={() => toggleShowOnHome(img.id)}
                      title={img.showOnHome ? '取消首页展示' : '设为首页展示'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {img.showOnHome ? '取消首页展示' : '设为首页展示'}
                    </button>
                    <button
                      className="gallery-manager__delete-btn"
                      onClick={() => deleteImage(img.id, img.originalName)}
                      title="删除图片"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 4 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gallery-manager__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>还没有上传任何图片</p>
          <p className="gallery-manager__empty-hint">点击上方按钮上传军团的精彩瞬间</p>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div className="gallery-manager__lightbox" onClick={() => setSelectedImage(null)}>
          <button className="gallery-manager__lightbox-close" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="预览" />
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.type === 'reject' ? '拒绝审核' : '删除图片'}
        message={
          confirmDialog.type === 'reject'
            ? `确定要拒绝图片 "${confirmDialog.imageName}" 吗？图片将被删除。`
            : `确定要删除图片 "${confirmDialog.imageName}" 吗？此操作无法恢复。`
        }
        confirmText={confirmDialog.type === 'reject' ? '拒绝' : '删除'}
        cancelText="取消"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        danger={true}
      />
    </div>
  );
};

export default GalleryManager;
