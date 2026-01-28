import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__title">ChunXia</div>
        <div className="footer__subtitle">AION2 · Elyos · Siel</div>
        <div className="footer__copy">© {currentYear} ChunXia. Game assets copyright by NCSOFT</div>
      </div>
    </footer>
  );
};

export default Footer;
