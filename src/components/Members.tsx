import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Members.css';

interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  showOnHome: boolean;
  approved: boolean;
}

const Members = () => {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadHomeGalleryImages();
  }, []);

  // Load home page gallery images from backend
  const loadHomeGalleryImages = async () => {
    try {
      const response = await fetch('/api/gallery/list?showOnHome=true');
      const data = await response.json();
      if (data.success) {
        setGalleryImages(data.data);
      }
    } catch (error) {
      console.error('Failed to load home gallery:', error);
    }
  };

  return (
    <section id="members" className="members">
      <div className="members__container">
        <div className="members__header">
          <span className="members__label">Gallery</span>
          <h2 className="members__title">Partners in Battle</h2>
          <p className="members__subtitle">
            Every member is a valuable treasure to ChunXia
          </p>
        </div>

        {/* Image gallery area */}
        {galleryImages.length > 0 ? (
          <div className="members__gallery">
            {galleryImages.map((img) => (
              <div
                key={img.id}
                className="members__gallery-item"
                onClick={() => setSelectedImage(img.url)}
              >
                <img src={img.url} alt={img.originalName} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className="members__empty-gallery">
            <p>📷 Capturing moments soon...</p>
            <p className="members__empty-hint">
              Want to see more about our legion?
            </p>
          </div>
        )}

        <div className="members__cta">
          <p>Want to know more about the legion?</p>
          <Link to="/legion" className="members__cta-btn">
            View Legion Info
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Image preview modal */}
      {selectedImage && (
        <div className="members__lightbox" onClick={() => setSelectedImage(null)}>
          <button className="members__lightbox-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="Preview" />
        </div>
      )}
    </section>
  );
};

export default Members;
