import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import About from '../components/About';
import { loadMembers, addApplication } from '../services/dataService';
import ServerSelect from '../components/ServerSelect';
import { SERVER_LIST } from '../data/serverList';
import './JoinLegionPage.css';

const JoinLegionPage = () => {
  // 申请表单状态
  const [formData, setFormData] = useState({
    characterName: '',
    serverId: 1001 // 默认希埃尔
  });
  const [submitted, setSubmitted] = useState(false);
  const [contacts, setContacts] = useState<{ role: string; name: string }[]>([]);
  const [nameError, setNameError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedCharacter, setParsedCharacter] = useState<{
    characterId: string;
    characterName: string;
    serverId: number;
    serverName: string;
    level: number;
    race: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // 相册状态
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 加载联系人
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const members = await loadMembers();
        const contactList = [];
        const leader = members.find(m => m.role === 'leader');
        if (leader) contactList.push({ role: 'Legion Leader', name: leader.name });
        const elites = members.filter(m => m.role === 'elite');
        elites.forEach(elite => contactList.push({ role: 'Legion Elite', name: elite.name }));
        setContacts(contactList);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };
    loadContacts();
  }, []);

  // 加载相册图片
  useEffect(() => {
    const loadGalleryImages = async () => {
      try {
        const response = await fetch('/api/gallery/list?approved=true');
        const data = await response.json();
        if (data.success) {
          setGalleryImages(data.data);
        }
      } catch (error) {
        console.error('Failed to load gallery:', error);
      }
    };
    loadGalleryImages();
  }, []);

  // 角色名称输入变化
  const handleCharacterNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, characterName: name }));
    setNameError('');
    setParsedCharacter(null);
    setShowConfirm(false);
  };

  // 服务器选择变化
  const handleServerChange = (serverId: number, _serverName: string) => {
    setFormData(prev => ({ ...prev, serverId }));
    setParsedCharacter(null);
    setShowConfirm(false);
  };

  // 验证角色信息
  const handleVerifyCharacter = async () => {
    if (!formData.characterName.trim()) {
      alert('请填写角色名称');
      return;
    }

    setParsing(true);
    setNameError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const trimmedName = formData.characterName.trim();
      const response = await fetch(
        `/api/character/search?name=${encodeURIComponent(trimmedName)}&serverId=${formData.serverId}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error || 'Character not found';
        setNameError(`❌ ${errorMsg}\nPlease check name and server`);
        return;
      }

      setParsedCharacter(data.character);
      setShowConfirm(true);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('验证角色失败:', error);

      if (error.name === 'AbortError') {
        setNameError('❌ Verification timeout (10s), please check connection');
      } else {
        const errorMsg = error.message || 'Network error, please try again';
        setNameError(`❌ Verification failed: ${errorMsg}`);
      }
    } finally {
      setParsing(false);
    }
  };

  // 提交申请
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.characterName.trim()) {
      alert('请填写角色名称');
      return;
    }

    if (!parsedCharacter) {
      alert('Please verify character info first');
      return;
    }

    try {
      const characterUrl = `https://tw.ncsoft.com/aion2/profile/character/${parsedCharacter.serverId}/${parsedCharacter.characterId}`;

      await addApplication({
        characterName: parsedCharacter.characterName,
        characterId: parsedCharacter.characterId,
        serverId: parsedCharacter.serverId,
        serverName: parsedCharacter.serverName,
        characterUrl: characterUrl
      });

      console.log('申请已提交:', parsedCharacter);
      setSubmitted(true);

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Submission failed, please try again');
    }
  };

  if (submitted) {
    return (
      <div className="join-legion-page">
        <div className="join-legion__success">
          <div className="join-legion__success-icon">✓</div>
          <h2>Application Submitted</h2>
          <p>Thank you for your interest in ChunXia!</p>
          <p>If you wish to join, please apply in-game and contact a leader or elite. We will process your application soon.</p>
          <Link to="/" className="join-legion__btn">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="join-legion-page">
      {/* 背景图层 */}
      <div className="join-legion-page__bg">
        <img src="/images/hero-bg.png" alt="" className="join-legion-page__bg-image" />
        <div className="join-legion-page__bg-overlay"></div>
      </div>

      {/* 军团介绍 Hero */}
      <Hero />

      {/* 军团理念 About */}
      <About />

      {/* 成员风采 Gallery */}
      <section id="gallery" className="join-legion__gallery">
        <div className="join-legion__gallery-container">
          <h2 className="join-legion__section-title">Legion Gallery</h2>
          <p className="join-legion__section-subtitle">Moments shared by our members</p>

          {galleryImages.length > 0 ? (
            <div className="join-legion__gallery-grid">
              {galleryImages.filter(img => img.approved).map(img => (
                <div key={img.id} className="join-legion__gallery-item">
                  <img
                    src={img.url}
                    alt={img.originalName}
                    onClick={() => setSelectedImage(img.url)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="join-legion__gallery-empty">
              <p>📷 No images found</p>
            </div>
          )}
        </div>
      </section>

      {/* 查看军团按钮区域 */}
      <section className="join-legion__cta">
        <div className="join-legion__cta-container">
          <Link to="/legion" className="join-legion__cta-btn">
            View Legion
          </Link>
        </div>
      </section>

      {/* 申请表单 Form */}
      <section id="join-form" className="join-legion__form-section">
        <div className="join-legion__form-container">
          <h2 className="join-legion__section-title">Join ChunXia</h2>
          <p className="join-legion__section-subtitle">Fill in the application to become a member</p>

          <div className="join-legion__form-content">
            {/* 左侧:提示信息 */}
            <div className="join-legion__info">
              <div className="join-legion__info-card">
                <h3>Important Notice</h3>
                <div className="join-legion__notice">
                  <span className="join-legion__notice-icon">ℹ️</span>
                  <div className="join-legion__notice-content">
                    <p>Filling this form doesn't automatically add you to the legion. It's for character display on this site.</p>
                    <p>To join officially, search for "ChunXia" in-game.</p>
                  </div>
                </div>
              </div>

              <div className="join-legion__info-card">
                <h3>Contact</h3>
                <div className="join-legion__contact">
                  {contacts.map((contact, index) => (
                    <div key={index} className="join-legion__contact-item">
                      {contact.role} "{contact.name}"
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="join-legion__contact-item">
                      Legion Leader or Elite
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧:申请表单 */}
            <form className="join-legion__form" onSubmit={handleSubmit}>
              <h3>Application Form</h3>

              <div className="join-legion__field">
                <label htmlFor="characterName">Character Name *</label>
                <input
                  type="text"
                  id="characterName"
                  name="characterName"
                  value={formData.characterName}
                  onChange={(e) => handleCharacterNameChange(e.target.value)}
                  placeholder="Enter character name"
                  required
                  disabled={showConfirm}
                />
                {nameError && (
                  <span className="join-legion__error">{nameError}</span>
                )}
              </div>

              <div className="join-legion__field">
                <label htmlFor="serverId">Server *</label>
                <ServerSelect
                  value={formData.serverId.toString()}
                  onChange={handleServerChange}
                  serverList={SERVER_LIST}
                  placeholder="Select server"
                  required
                />
                <div className="join-legion__hints">
                  <div className="join-legion__hint-item">✓ Select character server</div>
                  <div className="join-legion__hint-item">✓ Verify character info before submitting</div>
                  <div className="join-legion__hint-item">✓ Elyos and Asmodian characters are both welcome</div>
                  <div className="join-legion__hint-item">✓ No passwords involved, data is official</div>
                </div>
              </div>

              {/* 角色信息确认框 */}
              {showConfirm && parsedCharacter && (
                <div className="join-legion__confirm">
                  <div className="join-legion__confirm-title">✓ Info verified</div>
                  <div className="join-legion__confirm-info">
                    <div><strong>Name:</strong> {parsedCharacter.characterName}</div>
                    <div><strong>Level:</strong> Lv.{parsedCharacter.level}</div>
                    <div><strong>Server:</strong> {parsedCharacter.serverName}</div>
                  </div>
                </div>
              )}

              {!showConfirm ? (
                <button
                  type="button"
                  className="join-legion__verify-btn"
                  onClick={handleVerifyCharacter}
                  disabled={parsing}
                >
                  {parsing ? 'Verifying...' : 'Verify Info'}
                </button>
              ) : (
                <button type="submit" className="join-legion__submit-btn">
                  Submit Application
                </button>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div className="join-legion__lightbox" onClick={() => setSelectedImage(null)}>
          <button className="join-legion__lightbox-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="Preview" />
        </div>
      )}

    </div>
  );
};

export default JoinLegionPage;
