import './About.css';

const features = [
  {
    icon: '🏰',
    title: 'PVE Dungeons',
    desc: 'Organize regular dungeon runs, challenge bosses together, and grow together.'
  },
  {
    icon: '☕',
    title: 'Casual',
    desc: 'No mandatory requirements, enjoy the game at your own pace.'
  },
  {
    icon: '🤝',
    title: 'Mutual Help',
    desc: 'New player guidance, material sharing, and group play so no one is left behind.'
  },
  {
    icon: '💬',
    title: 'Friendly Community',
    desc: 'Respect and inclusion, creating a comfortable communication environment.'
  }
];

const About = () => {
  return (
    <section id="about" className="about">
      <div className="about__container">
        <div className="about__header">
          <span className="about__label">About Us</span>
          <h2 className="about__title">Journeying through Atreia together</h2>
          <p className="about__subtitle">
            ChunXia is an Elyos legion focused on PVE dungeons and casual entertainment.<br />
            We believe the fun of the game lies in experiencing it together and helping each other.
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
            <p>"In the world of Atreia, the most precious thing is not gear, but the companions you fight with."</p>
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default About;
