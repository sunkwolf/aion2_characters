import { useState, useEffect, useRef, useCallback } from 'react';
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

const MEMBERS_CACHE_KEY = 'legion_members_cache_v2';
const MEMBERS_CACHE_TIME_KEY = 'legion_members_cache_time_v2';
const MEMBERS_CACHE_TTL = 2 * 60 * 60 * 1000; // 2小时

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
    voiceChannelName: 'Legion Voice',
    voiceChannelDescription: 'Click to join our voice channel',
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

  const getCachedMembers = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(MEMBERS_CACHE_KEY);
      const cacheTime = localStorage.getItem(MEMBERS_CACHE_TIME_KEY);
      if (!cachedData || !cacheTime) {
        return null;
      }

      if (Date.now() - Number(cacheTime) > MEMBERS_CACHE_TTL) {
        return null;
      }

      return JSON.parse(cachedData) as MemberWithProfile[];
    } catch {
      return null;
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const cached = getCachedMembers();
      if (cached) {
        setMembersData(cached);
        setLoading(false);
        return;
      }

      setLoading(true);

      const configRes = await fetch('/data/members.json');
      const memberConfigs: MemberConfig[] = configRes.ok ? await configRes.json() : [];

      const loaded = await Promise.all(
        memberConfigs.map(async (config) => {
          try {
            const res = await fetch(`/data/${config.id}/character_info.json`);
            if (res.ok) {
              const data: CharacterInfo = await res.json();
              return { ...config, profile: data.profile };
            }
          } catch (error) {
            console.warn(`成员 ${config.name} 的详细数据加载失败,将只显示基本信息`);
          }
          return config;
        })
      );

      setMembersData(loaded);
      localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(loaded));
      localStorage.setItem(MEMBERS_CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
      console.error('Failed to load member data', e);
    } finally {
      setLoading(false);
    }
  }, [getCachedMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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
            console.error('Copy command failed');
          }
        } catch (err) {
          console.error('Copy failed:', err);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
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
        console.error('Failed to load voice config:', error);
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
      console.error('Failed to load gallery:', error);
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
          console.error('Upload failed:', data.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
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

  // 骨架屏卡片
  const renderSkeletonCard = (index: number) => (
    <div key={index} className="legion-member-card legion-member-card--skeleton">
      <div className="legion-member-card__avatar">
        <div className="skeleton-avatar"></div>
      </div>
      <div className="legion-member-card__info">
        <div className="skeleton-text skeleton-text--name"></div>
        <div className="skeleton-text skeleton-text--details"></div>
      </div>
    </div>
  );

  // 骨架屏成员区域
  const renderSkeletonSection = (title: string, count: number, gridClass: string = '') => (
    <div className="legion-members__section">
      <h3 className="legion-members__section-title">{title}</h3>
      <div className={`legion-members__grid ${gridClass}`}>
        {Array.from({ length: count }).map((_, i) => renderSkeletonCard(i))}
      </div>
    </div>
  );

  return (
    <div className="legion-page">
      {/* 军团介绍 */}
      <section className="legion-intro">
        <div className="legion-intro__container">
          <div className="legion-intro__logo">
            <img src="/images/legion-logo.jpg" alt="ChunXia Legion" />
          </div>
          <h1 className="legion-intro__title">ChunXia Legion</h1>
          <p className="legion-intro__subtitle">AION2 · Elyos · Siel Server</p>
          <div className="legion-intro__desc">
            <p>"ChunXia" comes from Tun tree and Summer. The Tun tree symbolizes longevity and resilience, while Summer represents warmth and vitality.</p>
            <p>We are a casual legion focused on PVE dungeons, advocating Unity and Mutual Growth.</p>
            <p>Whether you are a new player or a veteran, ChunXia welcomes you.</p>
          </div>
          <div className="legion-intro__values">
            <div className="legion-intro__value">
              <span>PVE Dungeons</span>
            </div>
            <div className="legion-intro__value">
              <span>Casual</span>
            </div>
            <div className="legion-intro__value">
              <span>Mutual Help</span>
            </div>
            <div className="legion-intro__value">
              <span>Friendly</span>
            </div>
          </div>
        </div>
      </section>

      {/* 兑换码展示区域 */}
      {voiceConfig.redeemCode && (
        <section className="legion-redeem">
          <div className="legion-redeem__container">
            <span className="legion-redeem__label">Code:</span>
            <code className="legion-redeem__code">{voiceConfig.redeemCode}</code>
            <button
              className={`legion-redeem__copy ${copySuccess ? 'legion-redeem__copy--success' : ''}`}
              onClick={handleCopyRedeemCode}
            >
              {copySuccess ? 'Copied' : 'Copy'}
            </button>
            {voiceConfig.redeemCodeExpiry && (
              <span className={`legion-redeem__expiry ${new Date(voiceConfig.redeemCodeExpiry) < new Date() ? 'legion-redeem__expiry--expired' : ''}`}>
                {new Date(voiceConfig.redeemCodeExpiry) < new Date() ? (
                  'Expired'
                ) : (
                  `Expiry: ${new Date(voiceConfig.redeemCodeExpiry).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }).replace(/\//g, '-').replace(/,/g, '')}`
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
          Members
        </button>
        <button
          className={`legion-tabs__btn ${activeTab === 'gallery' ? 'legion-tabs__btn--active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          Gallery
        </button>
        <button
          className={`legion-tabs__btn ${activeTab === 'voice' ? 'legion-tabs__btn--active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          Voice
        </button>
      </div>

      {/* 成员展示 */}
      {activeTab === 'members' && (
        <section className="legion-members">
          <div className="legion-members__container">
            {loading ? (
              // 加载中显示骨架屏
              <>
                {renderSkeletonSection('Legion Leader', 1, 'legion-members__grid--leader')}
                {renderSkeletonSection('Legion Elite', 3, 'legion-members__grid--elite')}
                {renderSkeletonSection('Legion Member', 6, '')}
              </>
            ) : (
              <>
                {/* 军团长 */}
                {groupByRole('leader').length > 0 && (
                  <div className="legion-members__section">
                    <h3 className="legion-members__section-title">
                      Legion Leader
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
                      Legion Elite
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
                      Legion Member
                    </h3>
                    <div className="legion-members__grid">
                      {groupByRole('member').map(renderMemberCard)}
                    </div>
                  </div>
                )}

                {membersData.length === 0 && (
                  <div className="legion-members__empty">
                    <p>No members found</p>
                  </div>
                )}
              </>
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
                Upload legion moments
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
                Upload Image
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
                <p>📷 No images uploaded yet</p>
                <p>Click the button above to share moments!</p>
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
                  Join Voice Channel
                </a>
              </div>
            ) : (
              <div className="legion-voice__empty">
                <div className="legion-voice__empty-icon">🎤</div>
                <p>Voice channel not configured</p>
                <p>Please contact admin to set voice link</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div className="legion-lightbox" onClick={() => setSelectedImage(null)}>
          <button className="legion-lightbox__close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage} alt="Preview" />
        </div>
      )}

      {/* 上传成功通知 */}
      {showNotification && (
        <div className="legion-notification">
          <div className="legion-notification__content">
            <div className="legion-notification__icon">⏳</div>
            <div className="legion-notification__text">
              <strong>Upload Successful!</strong>
              <p>Your image is being reviewed. It will appear once approved. If it takes too long, contact the leader.</p>
            </div>
            <button
              className="legion-notification__close"
              onClick={() => setShowNotification(false)}
              aria-label="Close"
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
