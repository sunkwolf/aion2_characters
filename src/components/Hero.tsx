import './Hero.css';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="hero__bg">
        <img src="/images/hero-bg.png" alt="" className="hero__bg-image" />
        <div className="hero__bg-overlay"></div>
      </div>

      <div className="hero__content">
        <img
          src="https://fizz-download.playnccdn.com/download/v2/buckets/conti-upload/files/196c7011305-f0c28862-ef32-4a1f-9d47-529292b0c46b"
          alt="AION2"
          className="hero__game-logo"
        />
        <div className="hero__badge">天族 · 希埃尔</div>
        <div className="hero__logos">
          <div className="hero__legion-logo">
            <img src="/images/legion-logo.jpg" alt="椿夏军团" />
          </div>
          <div className="hero__legion-emblem">
            <img src="https://assets.playnccdn.com/uikit/ncui/1.7.20/img/official/service/aion2/profile_1.png" alt="军团标志" />
          </div>
        </div>
        <h1 className="hero__title">
          <span className="hero__title-char">椿</span>
          <span className="hero__title-char">夏</span>
        </h1>
        <p className="hero__subtitle">
          愿如椿树常青，共度盛夏时光
        </p>
        <p className="hero__desc">
          一个温暖的 PVE 休闲军团<br />
          副本开荒、日常陪伴、团结互助
        </p>
        <div className="hero__actions">
          <a href="#about" className="hero__btn hero__btn--primary">
            了解更多
          </a>
          <a href="#join" className="hero__btn hero__btn--secondary">
            加入我们
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
