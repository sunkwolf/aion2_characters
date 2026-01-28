import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import './AdminLoginModal.css';

const AdminLoginModal = () => {
  const { showLoginModal, setShowLoginModal, login, isAdmin, logout } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleClose = () => {
    setShowLoginModal(false);
    setPassword('');
    setError('');
  };

  // If logged in, show admin status
  if (isAdmin && !showLoginModal) {
    return null;
  }

  if (!showLoginModal) return null;

  return (
    <div className="admin-modal-overlay" onClick={handleClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <button className="admin-modal__close" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {isAdmin ? (
          <div className="admin-modal__content">
            <div className="admin-modal__icon admin-modal__icon--success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h2>Admin Logged In</h2>
            <p>You can now manage the legion gallery and members</p>
            <div className="admin-modal__actions">
              <Link
                to="/admin"
                className="admin-modal__btn admin-modal__btn--primary"
                onClick={handleClose}
              >
                Go to Admin Panel
              </Link>
              <button className="admin-modal__btn admin-modal__btn--logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-modal__content" onSubmit={handleSubmit}>
            <div className="admin-modal__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Admin Login</h2>
            <p>Please enter the admin password</p>
            <div className="admin-modal__input-group">
              <input
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                autoFocus
              />
              {error && <span className="admin-modal__error">{error}</span>}
            </div>
            <button type="submit" className="admin-modal__btn">
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLoginModal;
