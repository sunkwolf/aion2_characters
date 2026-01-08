import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import './Header.css';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin, setShowLoginModal } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 关闭移动菜单当路由变化时
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <header className={`header ${isScrolled ? 'header--scrolled' : ''}`}>
      <div className="header__container">
        {/* 左侧：游戏Logo + 导航链接 */}
        <div className="header__left">
          <img
            src="https://fizz-download.playnccdn.com/download/v2/buckets/conti-upload/files/196c7011305-f0c28862-ef32-4a1f-9d47-529292b0c46b"
            alt="AION2"
            className="header__game-logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
          <nav className={`header__nav ${isMobileMenuOpen ? 'header__nav--open' : ''}`}>
            <Link
              to="/"
              className={`header__nav-link ${location.pathname === '/' ? 'header__nav-link--active' : ''}`}
            >
              首页
            </Link>
            <Link
              to="/tools"
              className={`header__nav-link ${location.pathname === '/tools' ? 'header__nav-link--active' : ''}`}
            >
              工具
            </Link>
            <Link
              to="/join-legion"
              className={`header__nav-link ${location.pathname === '/join-legion' ? 'header__nav-link--active' : ''}`}
            >
              军团介绍
            </Link>
          </nav>
        </div>

        {/* 右侧：军团Logo + 管理员按钮 */}
        <div className="header__right">
          <Link to="/legion" className="header__logo">
            <div className="header__logo-icon">
              <img src="/images/legion-logo.jpg" alt="椿夏军团" />
            </div>
            <div className="header__logo-text">
              <span className="header__logo-name">椿夏</span>
              <span className="header__logo-sub">AION2 · 天族希埃尔</span>
            </div>
          </Link>
          <button
            onClick={() => setShowLoginModal(true)}
            className={`header__admin-btn ${isAdmin ? 'header__admin-btn--active' : ''}`}
            title={isAdmin ? '管理员已登录' : '管理员登录'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

        <button
          className={`header__mobile-toggle ${isMobileMenuOpen ? 'header__mobile-toggle--open' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
