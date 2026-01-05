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
          <span className="hero__title-char">椿</span>
          <span className="hero__title-char">夏</span>
        </h1>
        <div className="hero__badge">
          <img
            src="https://assets.playnccdn.com/static-about-game/aion2/img/elyos/emblem.webp"
            alt="天族"
            className="hero__badge-icon"
          />
          <span>天族 · 希埃尔</span>
        </div>
        <p className="hero__subtitle">
          愿如椿树常青，共度盛夏时光
        </p>
        <p className="hero__desc">
          一个温暖的 PVE 休闲军团<br />
          副本开荒、日常陪伴、团结互助
        </p>
        <div className="hero__actions">
          <button
            onClick={() => {
              const element = document.getElementById('about');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hero__btn hero__btn--primary"
          >
            了解更多
          </button>
          <button
            onClick={() => {
              const element = document.getElementById('join-form');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hero__btn hero__btn--secondary"
          >
            加入我们
          </button>
          <a
            href="https://tw.ncsoft.com/aion2/about/index"
            target="_blank"
            rel="noopener noreferrer"
            className="hero__btn hero__btn--outline"
          >
            AION2官网
          </a>
        </div>
      </div>

      <div className="hero__scroll-hint">
        <span>向下滚动</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
