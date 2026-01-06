import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { classIconsSmall } from '../data/memberTypes';
import type { CharacterInfo, MemberRole } from '../data/memberTypes';
import './LegionPage.css';

// 成员配置
interface MemberConfig {
  id: string;
  name: string;
  role: MemberRole;
  title?: string;
}

// 带有角色信息的成员
interface MemberWithProfile extends MemberConfig {
  profile?: CharacterInfo['profile'];
}

interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  showOnHome: boolean;
  approved: boolean;
  uploadTime?: string;
}

const LegionPage = () => {
  const location = useLocation();
  const [membersData, setMembersData] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'gallery' | 'voice'>('members');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState<{
    voiceChannelUrl: string;
    voiceChannelName: string;
    voiceChannelDescription: string;
    redeemCode: string;
    redeemCodeExpiry: string;
  }>({
    voiceChannelUrl: '',
    voiceChannelName: '军团语音',
    voiceChannelDescription: '点击加入我们的语音频道',
    redeemCode: '',
    redeemCodeExpiry: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasScrolled = useRef(false);

  // 从其他页面跳转过来时滚动到顶部,刷新页面时保持滚动位置
  useEffect(() => {
    // 使用 location.key 来判断是否是路由切换
    // 如果没有 key 或者已经滚动过,就不滚动
    if (location.key && !hasScrolled.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      hasScrolled.current = true;
    }
  }, [location.key]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        // 1. 尝试从缓存加载成员数据
        const cachedData = sessionStorage.getItem('legion_members_cache');
        const cacheTime = sessionStorage.getItem('legion_members_cache_time');
        const now = Date.now();

        // 如果缓存存在且未过期(5分钟内),直接使用缓存
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          const cached = JSON.parse(cachedData);
          setMembersData(cached);
          setLoading(false);
          console.log('✓ 使用缓存的成员数据');
          return;
        }

        // 2. 加载成员配置 (添加时间戳防止缓存)
        const configRes = await fetch(`/data/members.json?t=${Date.now()}`);
        let memberConfigs: MemberConfig[] = [];

        if (configRes.ok) {
          memberConfigs = await configRes.json();
        }

        // 3. 为每个成员加载角色数据 (添加时间戳防止缓存)
        const loaded: MemberWithProfile[] = [];
        const timestamp = Date.now();

        for (const config of memberConfigs) {
          try {
            const res = await fetch(`/data/${config.id}/character_info.json?t=${timestamp}`);
            if (res.ok) {
              const data: CharacterInfo = await res.json();
              loaded.push({ ...config, profile: data.profile });
            } else {
              // 文件不存在,只显示基本信息
              loaded.push(config);
            }
          } catch (error) {
            // 文件不存在或加载失败,只显示基本信息
            console.warn(`成员 ${config.name} 的详细数据加载失败,将只显示基本信息`);
            loaded.push(config);
          }
        }

        setMembersData(loaded);

        // 4. 保存到缓存
        sessionStorage.setItem('legion_members_cache', JSON.stringify(loaded));
        sessionStorage.setItem('legion_members_cache_time', now.toString());
        console.log('✓ 成员数据已缓存');
      } catch (e) {
        console.error('加载成员数据失败', e);
      }
      setLoading(false);
    };

    loadMembers();
  }, []);

  // 复制兑换码
  const handleCopyRedeemCode = async () => {
    try {
      // 优先使用现代 Clipboard API (需要 HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(voiceConfig.redeemCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        // HTTP 环境降级方案: 使用传统 document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = voiceConfig.redeemCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
          } else {
            console.error('复制命令执行失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 加载语音配置
  useEffect(() => {
    const loadVoiceConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (data.success) {
          setVoiceConfig(data.data);
        }
      } catch (error) {
        console.error('加载语音配置失败:', error);
      }
    };
    loadVoiceConfig();
  }, []);

  // 加载相册图片（切换到相册标签时）
  useEffect(() => {
    if (activeTab === 'gallery') {
      loadGalleryImages();
    }
  }, [activeTab]);

  // 从后端加载相册图片
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

  const groupByRole = (role: MemberRole) => membersData.filter(m => m.role === role);

  // 处理图片上传（对接后端 API）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('isAdmin', 'false'); // 普通用户上传

        const response = await fetch('/api/gallery/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          console.log('上传成功:', data.data);
        } else {
          console.error('上传失败:', data.error);
        }
      } catch (error) {
        console.error('上传错误:', error);
      }
    }

    // 显示上传成功提示
    setShowNotification(true);

    // 5秒后自动关闭提示
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);

    // 清空 input 以便再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderMemberCard = (member: MemberWithProfile) => (
    <Link to={`/member/${member.id}`} key={member.id} className="legion-member-card">
      <div className="legion-member-card__avatar">
        {member.profile?.profileImage ? (
          <img src={member.profile.profileImage} alt={member.profile.characterName} />
        ) : (
          <div className="legion-member-card__avatar-placeholder">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="legion-member-card__info">
        <h3 className="legion-member-card__name">{member.profile?.characterName || member.name}</h3>
        <div className="legion-member-card__details">
          {member.profile && (
            <>
              <span className="legion-member-card__class">
                <img
                  src={classIconsSmall[member.profile.className] || classIconsSmall['劍星']}
                  alt={member.profile.className}
                  className="legion-member-card__class-icon"
                />
                {member.profile.className}
              </span>
              <span className="legion-member-card__level">Lv.{member.profile.characterLevel}</span>
            </>
          )}
        </div>
        {member.title && <p className="legion-member-card__join">{member.title}</p>}
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="legion-page">
        <div className="legion-page__loading">
          <div className="legion-page__spinner"></div>
          <p>载入军团数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="legion-page">
      {/* 军团介绍 */}
      <section className="legion-intro">
        <div className="legion-intro__container">
          <div className="legion-intro__logo">
            <img src="/images/legion-logo.jpg" alt="椿夏军团" />
          </div>
          <h1 className="legion-intro__title">椿夏军团</h1>
          <p className="legion-intro__subtitle">AION2 · 天族 · 希埃尔服务器</p>
          <div className="legion-intro__desc">
            <p>「椿夏」取自椿树与夏日。椿树象征长寿与坚韧，夏日代表温暖与活力。</p>
            <p>我们是一个以 PVE 副本为主的休闲军团，崇尚团结互助、共同成长。</p>
            <p>无论你是刚入坑的萌新，还是久经沙场的老手，椿夏都欢迎你的加入。</p>
          </div>
          <div className="legion-intro__values">
            <div className="legion-intro__value">
              <span className="legion-intro__value-icon">🏰</span>
              <span>PVE 副本</span>
            </div>
            <div className="legion-intro__value">
              <span className="legion-intro__value-icon">☕</span>
              <span>休闲氛围</span>
            </div>
            <div className="legion-intro__value">
              <span className="legion-intro__value-icon">🤝</span>
              <span>互帮互助</span>
            </div>
            <div className="legion-intro__value">
              <span className="legion-intro__value-icon">💬</span>
              <span>友善交流</span>
            </div>
          </div>
        </div>
      </section>

      {/* 兑换码展示区域 */}
      {voiceConfig.redeemCode && (
        <section className="legion-redeem">
          <div className="legion-redeem__container">
            <span className="legion-redeem__label">兑换码：</span>
            <code className="legion-redeem__code">{voiceConfig.redeemCode}</code>
            <button
              className={`legion-redeem__copy ${copySuccess ? 'legion-redeem__copy--success' : ''}`}
              onClick={handleCopyRedeemCode}
            >
              {copySuccess ? '已复制' : '复制'}
            </button>
            {voiceConfig.redeemCodeExpiry && (
              <span className={`legion-redeem__expiry ${new Date(voiceConfig.redeemCodeExpiry) < new Date() ? 'legion-redeem__expiry--expired' : ''}`}>
                {new Date(voiceConfig.redeemCodeExpiry) < new Date() ? (
                  '已过期'
                ) : (
                  `到期时间：${new Date(voiceConfig.redeemCodeExpiry).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }).replace(/\//g, '/').replace(/,/g, '')}`
                )}
              </span>
            )}
          </div>
        </section>
      )}

      {/* 标签切换 */}
      <div className="legion-tabs">
        <button
          className={`legion-tabs__btn ${activeTab === 'members' ? 'legion-tabs__btn--active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <span className="legion-tabs__icon">👥</span>
          军团成员
        </button>
        <button
          className={`legion-tabs__btn ${activeTab === 'gallery' ? 'legion-tabs__btn--active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <span className="legion-tabs__icon">📷</span>
          军团相册
        </button>
        <button
          className={`legion-tabs__btn ${activeTab === 'voice' ? 'legion-tabs__btn--active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <span className="legion-tabs__icon">🎤</span>
          军团语音
        </button>
      </div>

      {/* 成员展示 */}
      {activeTab === 'members' && (
        <section className="legion-members">
          <div className="legion-members__container">
            {/* 军团长 */}
            {groupByRole('leader').length > 0 && (
              <div className="legion-members__section">
                <h3 className="legion-members__section-title">
                  军团长
                </h3>
                <div className="legion-members__grid legion-members__grid--leader">
                  {groupByRole('leader').map(renderMemberCard)}
                </div>
              </div>
            )}

            {/* 军团精英 */}
            {groupByRole('elite').length > 0 && (
              <div className="legion-members__section">
                <h3 className="legion-members__section-title">
                  军团精英
                </h3>
                <div className="legion-members__grid legion-members__grid--elite">
                  {groupByRole('elite').map(renderMemberCard)}
                </div>
              </div>
            )}

            {/* 军团成员 */}
            {groupByRole('member').length > 0 && (
              <div className="legion-members__section">
                <h3 className="legion-members__section-title">
                  军团成员
                </h3>
                <div className="legion-members__grid">
                  {groupByRole('member').map(renderMemberCard)}
                </div>
              </div>
            )}

            {membersData.length === 0 && (
              <div className="legion-members__empty">
                <p>暂无成员数据</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 相册展示 */}
      {activeTab === 'gallery' && (
        <section className="legion-gallery">
          <div className="legion-gallery__container">
            <div className="legion-gallery__header">
              <p className="legion-gallery__hint">
                上传军团的精彩瞬间
              </p>
              <button
                className="legion-gallery__upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                上传图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>

            {galleryImages.length > 0 ? (
              <div className="legion-gallery__grid">
                {galleryImages.filter(img => img.approved).map(img => (
                  <div key={img.id} className="legion-gallery__item">
                    <img
                      src={img.url}
                      alt={img.originalName}
                      onClick={() => setSelectedImage(img.url)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="legion-gallery__empty">
                <p>📷 还没有上传任何图片</p>
                <p>点击上方按钮上传军团的精彩瞬间吧！</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 语音频道展示 */}
      {activeTab === 'voice' && (
        <section className="legion-voice">
          <div className="legion-voice__container">
            {voiceConfig.voiceChannelUrl ? (
              <div className="legion-voice__content">
                <div className="legion-voice__icon">🎤</div>
                <h3 className="legion-voice__title">{voiceConfig.voiceChannelName}</h3>
                <p className="legion-voice__description">{voiceConfig.voiceChannelDescription}</p>
                <a
                  href={voiceConfig.voiceChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="legion-voice__button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  加入语音频道
                </a>
              </div>
            ) : (
              <div className="legion-voice__empty">
                <div className="legion-voice__empty-icon">🎤</div>
                <p>暂未配置语音频道</p>
                <p>请联系管理员在后台配置语音频道链接</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div className="legion-lightbox" onClick={() => setSelectedImage(null)}>
          <button className="legion-lightbox__close" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="预览" />
        </div>
      )}

      {/* 上传成功通知 */}
      {showNotification && (
        <div className="legion-notification">
          <div className="legion-notification__content">
            <div className="legion-notification__icon">⏳</div>
            <div className="legion-notification__text">
              <strong>上传成功！</strong>
              <p>上传的图片正在审核，审核通过即可在军团相册查看。如过长时间未通过请联系军团长。</p>
            </div>
            <button
              className="legion-notification__close"
              onClick={() => setShowNotification(false)}
              aria-label="关闭"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegionPage;
