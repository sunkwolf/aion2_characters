import './About.css';

const features = [
  {
    icon: '🏰',
    title: 'PVE 副本',
    desc: '组织常规副本开荒，一起挑战 BOSS，共同成长'
  },
  {
    icon: '☕',
    title: '休闲氛围',
    desc: '没有强制要求，按自己的节奏享受游戏乐趣'
  },
  {
    icon: '🤝',
    title: '互帮互助',
    desc: '萌新指导、材料分享、组队刷本，不让任何人掉队'
  },
  {
    icon: '💬',
    title: '友善社区',
    desc: '尊重包容、禁止喷人，营造舒适的交流环境'
  }
];

const About = () => {
  return (
    <section id="about" className="about">
      <div className="about__container">
        <div className="about__header">
          <span className="about__label">关于我们</span>
          <h2 className="about__title">一起走过的亚特雷亚</h2>
          <p className="about__subtitle">
            椿夏是一个以 PVE 副本和休闲娱乐为主的天族军团。<br />
            我们相信游戏的乐趣在于一起经历、互相帮助，而非追逐极致效率。
          </p>
        </div>

        <div className="about__features">
          {features.map((feature, index) => (
            <div key={index} className="about__feature">
              <div className="about__feature-icon">{feature.icon}</div>
              <h3 className="about__feature-title">{feature.title}</h3>
              <p className="about__feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="about__quote">
          <blockquote>
            <p>"在亚特雷亚的世界里，最珍贵的不是装备，而是一起奋战的伙伴。"</p>
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default About;
