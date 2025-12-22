import './Join.css';

const Join = () => {
  return (
    <section id="join" className="join">
      <div className="join__container">
        <div className="join__content">
          <span className="join__label">加入我们</span>
          <h2 className="join__title">成为椿夏的一员</h2>
          <p className="join__desc">
            我们欢迎所有热爱 AION2、喜欢 PVE 内容的天族玩家加入。<br />
            无论你是萌新还是老手，这里都有你的位置。
          </p>

          <div className="join__requirements">
            <h3>入团须知</h3>
            <ul>
              <li>天族阵营，希埃尔服务器</li>
              <li>友善待人，不恶意攻击他人</li>
              <li>能够参与基本的军团活动（不强制）</li>
              <li>有语音条件更佳（QQ群/Discord）</li>
            </ul>
          </div>

          <div className="join__contact">
            <h3>联系方式</h3>
            <div className="join__contact-items">
              <div className="join__contact-item">
                <span className="join__contact-icon">🎮</span>
                <div>
                  <strong>游戏内联系</strong>
                  <p>私聊团长或副团长申请入团</p>
                </div>
              </div>
              <div className="join__contact-item">
                <span className="join__contact-icon">💬</span>
                <div>
                  <strong>QQ 群</strong>
                  <p>群号：123456789（示例）</p>
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
