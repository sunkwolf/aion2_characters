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

  // Load image list on mount
  useEffect(() => {
    loadGalleryImages();
  }, []);

  // Load all images from backend (including pending)
  const loadGalleryImages = async () => {
    try {
      const response = await fetch('/api/gallery/list');
      const data = await response.json();
      if (data.success) {
        setGalleryImages(data.data);
      }
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload (admin upload)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('isAdmin', 'true'); // Admin uploads auto-approved

        const response = await fetch('/api/gallery/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          console.log('Upload successful:', data.data);
          // Reload image list
          loadGalleryImages();
        } else {
          console.error('Upload failed:', data.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    // Clear input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle home page display
  const toggleShowOnHome = async (id: string) => {
    try {
      const response = await fetch(`/api/gallery/toggle-home/${id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setGalleryImages(prev =>
          prev.map(img =>
            img.id === id ? { ...img, showOnHome: !img.showOnHome } : img
          )
        );
      } else {
        console.error('Setting failed:', data.error);
      }
    } catch (error) {
      console.error('Setting failed:', error);
    }
  };

  // Approve image
  const approveImage = async (id: string) => {
    try {
      const response = await fetch(`/api/gallery/approve/${id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setGalleryImages(prev =>
          prev.map(img =>
            img.id === id ? { ...img, approved: true } : img
          )
        );
      } else {
        console.error('Approval failed:', data.error);
      }
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // Reject image (delete it)
  const rejectImage = async (id: string, imageName: string) => {
    setConfirmDialog({
      visible: true,
      type: 'reject',
      imageId: id,
      imageName: imageName,
    });
  };

  // Delete image
  const deleteImage = async (id: string, imageName: string) => {
    setConfirmDialog({
      visible: true,
      type: 'delete',
      imageId: id,
      imageName: imageName,
    });
  };

  // Confirm action
  const handleConfirm = async () => {
    const { imageId } = confirmDialog;

    // Close dialog
    setConfirmDialog({ visible: false, type: null, imageId: '', imageName: '' });

    try {
      const response = await fetch(`/api/gallery/${imageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setGalleryImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        console.error('Delete failed:', data.error);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Cancel action
  const handleCancel = () => {
    setConfirmDialog({ visible: false, type: null, imageId: '', imageName: '' });
  };

  if (loading) {
    return (
      <div className="gallery-manager">
        <div className="gallery-manager__loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-manager">
      <div className="gallery-manager__header">
        <div className="gallery-manager__info">
          <h2 className="gallery-manager__title">Gallery Management</h2>
          <p className="gallery-manager__hint">
            Review user-uploaded images. Images with ⭐ will be displayed in the "Member Highlights" section on the home page
          </p>
          <div className="gallery-manager__stats">
            <span className="stat-item">
              Total: {galleryImages.length}
            </span>
            <span className="stat-item stat-item--pending">
              Pending: {galleryImages.filter(img => !img.approved).length}
            </span>
            <span className="stat-item stat-item--approved">
              Approved: {galleryImages.filter(img => img.approved).length}
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
            Upload Image
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
                    <span>Pending</span>
                  </div>
                )}
                {img.approved && img.showOnHome && (
                  <div className="gallery-manager__item-badge">
                    <span>⭐</span>
                    <span>Featured</span>
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
                      title="Approve"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Approve
                    </button>
                    <button
                      className="gallery-manager__reject-btn"
                      onClick={() => rejectImage(img.id, img.originalName)}
                      title="Reject"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`gallery-manager__star-btn ${img.showOnHome ? 'gallery-manager__star-btn--active' : ''}`}
                      onClick={() => toggleShowOnHome(img.id)}
                      title={img.showOnHome ? 'Remove from home' : 'Feature on home'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {img.showOnHome ? 'Remove from Home' : 'Feature on Home'}
                    </button>
                    <button
                      className="gallery-manager__delete-btn"
                      onClick={() => deleteImage(img.id, img.originalName)}
                      title="Delete image"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 4 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
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
          <p>No images uploaded yet</p>
          <p className="gallery-manager__empty-hint">Click the button above to upload legion's best moments</p>
        </div>
      )}

      {/* Image preview modal */}
      {selectedImage && (
        <div className="gallery-manager__lightbox" onClick={() => setSelectedImage(null)}>
          <button className="gallery-manager__lightbox-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="Preview" />
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.type === 'reject' ? 'Reject Image' : 'Delete Image'}
        message={
          confirmDialog.type === 'reject'
            ? `Are you sure you want to reject "${confirmDialog.imageName}"? The image will be deleted.`
            : `Are you sure you want to delete "${confirmDialog.imageName}"? This action cannot be undone.`
        }
        confirmText={confirmDialog.type === 'reject' ? 'Reject' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        danger={true}
      />
    </div>
  );
};

export default GalleryManager;
