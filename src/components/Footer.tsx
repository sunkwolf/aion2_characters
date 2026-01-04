import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__title">椿夏</div>
        <div className="footer__subtitle">AION2 · 天族 · 希埃尔</div>
        <div className="footer__copy">© {currentYear} 椿夏. 游戏素材版权归 NCSOFT 所有</div>
      </div>
    </footer>
  );
};

export default Footer;
