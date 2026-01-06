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
        if (leader) contactList.push({ role: '军团长', name: leader.name });
        const elites = members.filter(m => m.role === 'elite');
        elites.forEach(elite => contactList.push({ role: '军团精英', name: elite.name }));
        setContacts(contactList);
      } catch (error) {
        console.error('加载联系人失败:', error);
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
        console.error('加载相册失败:', error);
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
        const errorMsg = data.error || '未找到该角色';
        setNameError(`❌ ${errorMsg}\n请核对角色名字和服务器是否正确`);
        return;
      }

      setParsedCharacter(data.character);
      setShowConfirm(true);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('验证角色失败:', error);

      if (error.name === 'AbortError') {
        setNameError('❌ 验证超时(10秒),请检查网络连接后重试');
      } else {
        const errorMsg = error.message || '网络错误，请稍后重试';
        setNameError(`❌ 验证失败: ${errorMsg}`);
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
      alert('请先验证角色信息');
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
      console.error('提交申请失败:', error);
      alert('提交失败,请稍后重试');
    }
  };

  if (submitted) {
    return (
      <div className="join-legion-page">
        <div className="join-legion__success">
          <div className="join-legion__success-icon">✓</div>
          <h2>申请已提交</h2>
          <p>感谢你对椿夏军团的关注！</p>
          <p>如你需加入军团请在游戏内申请军团并联系军团长或军团精英，我们会尽快处理你的申请。</p>
          <Link to="/" className="join-legion__btn">返回首页</Link>
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
          <h2 className="join-legion__section-title">成员风采</h2>
          <p className="join-legion__section-subtitle">分享军团的精彩瞬间</p>

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
              <p>📷 暂无图片</p>
            </div>
          )}
        </div>
      </section>

      {/* 查看军团按钮区域 */}
      <section className="join-legion__cta">
        <div className="join-legion__cta-container">
          <Link to="/legion" className="join-legion__cta-btn">
            查看军团
          </Link>
        </div>
      </section>

      {/* 申请表单 Form */}
      <section id="join-form" className="join-legion__form-section">
        <div className="join-legion__form-container">
          <h2 className="join-legion__section-title">加入椿夏</h2>
          <p className="join-legion__section-subtitle">填写申请信息，成为椿夏的一员</p>

          <div className="join-legion__form-content">
            {/* 左侧:提示信息 */}
            <div className="join-legion__info">
              <div className="join-legion__info-card">
                <h3>重要提示</h3>
                <div className="join-legion__notice">
                  <span className="join-legion__notice-icon">ℹ️</span>
                  <div className="join-legion__notice-content">
                    <p>填写申请表单不代表加入军团，该表单仅用于获取游戏角色信息并展示在本网站。</p>
                    <p>如需申请加入军团，请在游戏内搜索「椿夏」申请即可。</p>
                  </div>
                </div>
              </div>

              <div className="join-legion__info-card">
                <h3>联系方式</h3>
                <div className="join-legion__contact">
                  {contacts.map((contact, index) => (
                    <div key={index} className="join-legion__contact-item">
                      {contact.role}「{contact.name}」
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="join-legion__contact-item">
                      军团长或军团精英
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧:申请表单 */}
            <form className="join-legion__form" onSubmit={handleSubmit}>
              <h3>申请表单</h3>

              <div className="join-legion__field">
                <label htmlFor="characterName">角色名称 *</label>
                <input
                  type="text"
                  id="characterName"
                  name="characterName"
                  value={formData.characterName}
                  onChange={(e) => handleCharacterNameChange(e.target.value)}
                  placeholder="请输入游戏内角色名称"
                  required
                  disabled={showConfirm}
                />
                {nameError && (
                  <span className="join-legion__error">{nameError}</span>
                )}
              </div>

              <div className="join-legion__field">
                <label htmlFor="serverId">服务器 *</label>
                <ServerSelect
                  value={formData.serverId.toString()}
                  onChange={handleServerChange}
                  serverList={SERVER_LIST}
                  placeholder="请选择服务器"
                  required
                />
                <div className="join-legion__hints">
                  <div className="join-legion__hint-item">✓ 选择角色所在的服务器</div>
                  <div className="join-legion__hint-item">✓ 验证角色信息后才能提交申请</div>
                  <div className="join-legion__hint-item">✓ 天族与魔族均可填写并在军团页面展示角色信息</div>
                  <div className="join-legion__hint-item">✓ 不涉及账号密码，角色信息均为官方数据</div>
                </div>
              </div>

              {/* 角色信息确认框 */}
              {showConfirm && parsedCharacter && (
                <div className="join-legion__confirm">
                  <div className="join-legion__confirm-title">✓ 角色信息验证成功</div>
                  <div className="join-legion__confirm-info">
                    <div><strong>角色名:</strong> {parsedCharacter.characterName}</div>
                    <div><strong>等级:</strong> Lv.{parsedCharacter.level}</div>
                    <div><strong>服务器:</strong> {parsedCharacter.serverName}</div>
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
                  {parsing ? '验证中...' : '验证角色信息'}
                </button>
              ) : (
                <button type="submit" className="join-legion__submit-btn">
                  提交申请
                </button>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div className="join-legion__lightbox" onClick={() => setSelectedImage(null)}>
          <button className="join-legion__lightbox-close" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="预览" />
        </div>
      )}

    </div>
  );
};

export default JoinLegionPage;
