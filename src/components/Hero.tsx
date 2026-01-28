import './Hero.css';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="hero__bg">
        <img src="/images/hero-bg.png" alt="" className="hero__bg-image" />
        <div className="hero__bg-overlay"></div>
      </div>

      <div className="hero__content">
        <h1 className="hero__title">
          <span className="hero__title-char">Chun</span>
          <span className="hero__title-char">Xia</span>
        </h1>
        <div className="hero__badge">
          <img
            src="https://assets.playnccdn.com/static-about-game/aion2/img/elyos/emblem.webp"
            alt="Elyos"
            className="hero__badge-icon"
          />
          <span>Elyos · Siel</span>
        </div>
        <p className="hero__subtitle">
          Evergreen as the Tun tree, sharing the warmth of summer.
        </p>
        <p className="hero__desc">
          A warm PVE casual legion<br />
          Dungeons, daily companionship, and mutual support.
        </p>
        <div className="hero__actions">
          <button
            onClick={() => {
              const element = document.getElementById('about');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hero__btn hero__btn--primary"
          >
            Learn More
          </button>
          <button
            onClick={() => {
              const element = document.getElementById('join-form');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hero__btn hero__btn--secondary"
          >
            Join Us
          </button>
          <a
            href="https://tw.ncsoft.com/aion2/about/index"
            target="_blank"
            rel="noopener noreferrer"
            className="hero__btn hero__btn--outline"
          >
            AION2 Official
          </a>
        </div>
      </div>

      <div className="hero__scroll-hint">
        <span>Scroll Down</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
