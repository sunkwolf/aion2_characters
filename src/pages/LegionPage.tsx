import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getRoleName, classIcons } from '../data/memberTypes';
import type { CharacterInfo, MemberRole } from '../data/memberTypes';
import { isAdminLoggedIn } from '../services/dataService';
import './LegionPage.css';

// 成员配置
interface MemberConfig {
  id: string;
  role: MemberRole;
  joinDate?: string;
}

// 带有角色信息的成员
interface MemberWithProfile extends MemberConfig {
  profile?: CharacterInfo['profile'];
}

interface GalleryImage {
  id: string;
  src: string;
  name: string;
  showOnHome: boolean;
}

// 从 localStorage 读取相册数据
const loadGalleryImages = (): GalleryImage[] => {
  try {
    const saved = localStorage.getItem('legion_gallery');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// 保存相册数据到 localStorage
const saveGalleryImages = (images: GalleryImage[]) => {
  localStorage.setItem('legion_gallery', JSON.stringify(images));
};

const LegionPage = () => {
  const [membersData, setMembersData] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'gallery'>('members');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(loadGalleryImages);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查管理员状态
  useEffect(() => {
    setIsAdmin(isAdminLoggedIn());
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        // 1. 加载成员配置
        const configRes = await fetch('/data/members.json');
        let memberConfigs: MemberConfig[] = [];

        if (configRes.ok) {
          memberConfigs = await configRes.json();
        }

        // 2. 为每个成员加载角色数据
        const loaded: MemberWithProfile[] = [];

        for (const config of memberConfigs) {
          try {
            const res = await fetch(`/data/${config.id}/character_info.json`);
            if (res.ok) {
              const data: CharacterInfo = await res.json();
              loaded.push({ ...config, profile: data.profile });
            } else {
              loaded.push(config);
            }
          } catch {
            loaded.push(config);
          }
        }

        setMembersData(loaded);
      } catch (e) {
        console.error('加载成员数据失败', e);
      }
      setLoading(false);
    };

    loadMembers();
  }, []);

  const groupByRole = (role: MemberRole) => membersData.filter(m => m.role === role);

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: GalleryImage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          src: event.target?.result as string,
          name: file.name,
          showOnHome: false
        };
        setGalleryImages(prev => {
          const updated = [...prev, newImage];
          saveGalleryImages(updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });

    // 清空 input 以便再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 切换首页展示（仅管理员）
  const toggleShowOnHome = (id: string) => {
    if (!isAdmin) return;
    setGalleryImages(prev => {
      const updated = prev.map(img =>
        img.id === id ? { ...img, showOnHome: !img.showOnHome } : img
      );
      saveGalleryImages(updated);
      return updated;
    });
  };

  // 删除图片
  const deleteImage = (id: string) => {
    if (confirm('确定要删除这张图片吗？')) {
      setGalleryImages(prev => {
        const updated = prev.filter(img => img.id !== id);
        saveGalleryImages(updated);
        return updated;
      });
    }
  };

  const renderMemberCard = (member: MemberWithProfile) => (
    <Link to={`/member/${member.id}`} key={member.id} className="legion-member-card">
      <div className="legion-member-card__avatar">
        {member.profile?.profileImage ? (
          <img src={member.profile.profileImage} alt={member.profile.characterName} />
        ) : (
          <div className="legion-member-card__avatar-placeholder">
            {member.id.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={`legion-member-card__role legion-member-card__role--${member.role}`}>
          {getRoleName(member.role)}
        </span>
      </div>
      <div className="legion-member-card__info">
        <h3 className="legion-member-card__name">{member.profile?.characterName || member.id}</h3>
        <div className="legion-member-card__details">
          {member.profile && (
            <>
              <span className="legion-member-card__class">
                {classIcons[member.profile.className] || '✨'} {member.profile.className}
              </span>
              <span className="legion-member-card__level">Lv.{member.profile.characterLevel}</span>
            </>
          )}
        </div>
        {member.joinDate && <p className="legion-member-card__join">{member.joinDate}</p>}
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
      {/* 顶部背景图 */}
      <div className="legion-banner">
        <img
          src="https://assets.playnccdn.com/uikit/cnb/3.2.0/img/header/header-aion2-2025.jpg"
          alt=""
          className="legion-banner__bg"
        />
        <div className="legion-banner__overlay"></div>
        <div className="legion-banner__content">
          <div className="legion-banner__emblem">
            <img
              src="https://assets.playnccdn.com/uikit/ncui/1.7.20/img/official/service/aion2/profile_1.png"
              alt="军团标志"
            />
          </div>
          <h1 className="legion-banner__title">椿夏军团</h1>
          <p className="legion-banner__subtitle">AION2 · 天族 · 希埃尔</p>
        </div>
      </div>

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
      </div>

      {/* 成员展示 */}
      {activeTab === 'members' && (
        <section className="legion-members">
          <div className="legion-members__container">
            {/* 军团长 */}
            {groupByRole('leader').length > 0 && (
              <div className="legion-members__section">
                <h3 className="legion-members__section-title">
                  <span className="legion-members__section-icon">👑</span>
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
                  <span className="legion-members__section-icon">⭐</span>
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
                  <span className="legion-members__section-icon">🎖️</span>
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
              {isAdmin && (
                <p className="legion-gallery__hint">
                  管理员模式：带有 ⭐ 标记的图片会展示在首页的「成员风采」区域
                </p>
              )}
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
                {galleryImages.map(img => (
                  <div key={img.id} className="legion-gallery__item">
                    <img
                      src={img.src}
                      alt={img.name}
                      onClick={() => setSelectedImage(img.src)}
                    />
                    <div className="legion-gallery__item-actions">
                      {isAdmin && (
                        <button
                          className={`legion-gallery__star-btn ${img.showOnHome ? 'legion-gallery__star-btn--active' : ''}`}
                          onClick={() => toggleShowOnHome(img.id)}
                          title={img.showOnHome ? '取消首页展示' : '设为首页展示'}
                        >
                          {img.showOnHome ? '⭐' : '☆'}
                        </button>
                      )}
                      <button
                        className="legion-gallery__delete-btn"
                        onClick={() => deleteImage(img.id)}
                        title="删除图片"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
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
    </div>
  );
};

export default LegionPage;
