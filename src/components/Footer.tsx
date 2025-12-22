import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__brand">
          <div className="footer__logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="20" cy="18" rx="10" ry="14" fill="currentColor" opacity="0.9" transform="rotate(-12 20 20)"/>
              <ellipse cx="20" cy="18" rx="10" ry="14" fill="currentColor" opacity="0.7" transform="rotate(12 20 20)"/>
              <path d="M20 6 L20 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            </svg>
          </div>
          <span className="footer__name">椿夏军团</span>
        </div>

        <div className="footer__info">
          <p>AION2 · 天族 · 希埃尔服务器</p>
          <p className="footer__slogan">愿如椿树常青，共度盛夏时光</p>
        </div>

        <div className="footer__copy">
          <p>© {currentYear} 椿夏军团. 游戏素材版权归 NCSOFT 所有.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
