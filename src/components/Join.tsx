import './Join.css';

const Join = () => {
  return (
    <section id="join" className="join">
      <div className="join__container">
        <div className="join__content">
          <span className="join__label">Join Us</span>
          <h2 className="join__title">Become a ChunXia Member</h2>
          <p className="join__desc">
            We welcome all Elyos players who love AION2 and enjoy PVE content.<br />
            Whether you're a new player or a veteran, there's a place for you here.
          </p>

          <div className="join__requirements">
            <h3>Requirements</h3>
            <ul>
              <li>Elyos faction, Siel server</li>
              <li>Be friendly and respectful to others</li>
              <li>Participate in basic legion activities (not mandatory)</li>
              <li>Voice chat capability preferred (Discord)</li>
            </ul>
          </div>

          <div className="join__contact">
            <h3>Contact</h3>
            <div className="join__contact-items">
              <div className="join__contact-item">
                <span className="join__contact-icon">🎮</span>
                <div>
                  <strong>In-Game Contact</strong>
                  <p>Message the Legion Leader or Elite to apply</p>
                </div>
              </div>
              <div className="join__contact-item">
                <span className="join__contact-icon">💬</span>
                <div>
                  <strong>Discord</strong>
                  <p>Join our Discord server (example)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="join__decoration">
          <div className="join__deco-circle"></div>
          <div className="join__deco-leaf"></div>
        </div>
      </div>
    </section>
  );
};

export default Join;
