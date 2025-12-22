import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import './Header.css';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const { isAdmin, setShowLoginModal } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // 只在首页检测当前区域
      if (isHome) {
        const sections = ['members', 'about', 'hero'];
        for (const sectionId of sections) {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            // 当区域顶部接近视口顶部时激活
            if (rect.top <= 150 && rect.bottom > 150) {
              setActiveSection(sectionId);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // 关闭移动菜单当路由变化时
  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (!isHome) {
      setActiveSection('');
    } else {
      setActiveSection('hero');
    }
  }, [location, isHome]);

  // 平滑滚动到锚点
  const scrollToSection = (sectionId: string) => {
    if (!isHome) {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  // 判断导航项是否激活
  const isNavActive = (section: string) => {
    if (!isHome) return false;
    if (section === 'home') return activeSection === 'hero';
    return activeSection === section;
  };

  return (
    <header className={`header ${isScrolled ? 'header--scrolled' : ''}`}>
      <div className="header__container">
        {/* Logo - 点击进入军团介绍页 */}
        <Link to="/legion" className="header__logo">
          <div className="header__logo-icon">
            <img src="/images/legion-logo.jpg" alt="椿夏军团" />
          </div>
          <div className="header__logo-text">
            <span className="header__logo-name">椿夏</span>
            <span className="header__logo-sub">AION2 · 天族希埃尔</span>
          </div>
        </Link>

        <nav className={`header__nav ${isMobileMenuOpen ? 'header__nav--open' : ''}`}>
          <Link
            to="/"
            className={`header__nav-link ${isNavActive('home') ? 'header__nav-link--active' : ''}`}
          >
            首页
          </Link>
          <button
            onClick={() => scrollToSection('about')}
            className={`header__nav-link header__nav-link--btn ${isNavActive('about') ? 'header__nav-link--active' : ''}`}
          >
            关于我们
          </button>
          <button
            onClick={() => scrollToSection('members')}
            className={`header__nav-link header__nav-link--btn ${isNavActive('members') ? 'header__nav-link--active' : ''}`}
          >
            成员风采
          </button>
          <Link
            to="/join"
            className={`header__nav-link ${location.pathname === '/join' ? 'header__nav-link--active' : ''}`}
          >
            加入军团
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`header__nav-link ${location.pathname === '/admin' ? 'header__nav-link--active' : ''}`}
            >
              管理后台
            </Link>
          )}
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
        </nav>

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
