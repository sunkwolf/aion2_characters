import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadMembers, addApplication } from '../services/dataService';
import ServerSelect from '../components/ServerSelect';
import './JoinPage.css';

// 服务器列表类型
interface Server {
  raceId: number;
  serverId: number;
  serverName: string;
  serverShortName: string;
}

const JoinPage = () => {
  const [formData, setFormData] = useState({
    characterName: '',
    serverId: 1001 // 默认希埃尔
  });
  const [submitted, setSubmitted] = useState(false);
  const [contacts, setContacts] = useState<{ role: string; name: string }[]>([]);
  const [nameError, setNameError] = useState('');

  // 服务器列表
  const [serverList, setServerList] = useState<Server[]>([]);

  // 角色信息解析状态
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

  // 加载服务器列表
  useEffect(() => {
    const loadServers = async () => {
      try {
        const response = await fetch(`/data/serverId.json?t=${Date.now()}`);
        const data = await response.json();
        setServerList(data.serverList || []);
      } catch (error) {
        console.error('加载服务器列表失败:', error);
      }
    };
    loadServers();
  }, []);

  // 加载联系人(军团长和精英)
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const members = await loadMembers();
        const contactList = [];

        // 查找军团长
        const leader = members.find(m => m.role === 'leader');
        if (leader) {
          contactList.push({ role: '军团长', name: leader.name });
        }

        // 查找军团精英
        const elites = members.filter(m => m.role === 'elite');
        elites.forEach(elite => {
          contactList.push({ role: '军团精英', name: elite.name });
        });

        setContacts(contactList);
      } catch (error) {
        console.error('加载联系人失败:', error);
      }
    };
    loadContacts();
  }, []);

  // 角色名称输入变化
  const handleCharacterNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, characterName: name }));
    setNameError('');
    setParsedCharacter(null);
    setShowConfirm(false);
  };

  // 服务器选择变化
  const handleServerChange = (serverId: number) => {
    setFormData(prev => ({ ...prev, serverId }));
    setParsedCharacter(null);
    setShowConfirm(false);
  };

  // 验证角色信息 - 使用新的搜索API (带超时控制)
  const handleVerifyCharacter = async () => {
    if (!formData.characterName.trim()) {
      alert('请填写角色名称');
      return;
    }

    setParsing(true);
    setNameError('');

    // 创建超时控制器 - 10秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 去除角色名前后空格
      const trimmedName = formData.characterName.trim();

      // 调用后端搜索API (带超时信号)
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

      // 保存解析结果
      setParsedCharacter(data.character);
      setShowConfirm(true);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('验证角色失败:', error);

      // 区分超时错误和其他错误
      if (error.name === 'AbortError') {
        setNameError('❌ 验证超时(10秒),请检查网络连接后重试');
      } else {
        const errorMsg = error.message || '网络错误，请稍后重试';
        setNameError(`❌ 验证失败: ${errorMsg}`);
      }
    } finally {
      // 确保无论何种情况都重置loading状态
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!formData.characterName.trim()) {
      alert('请填写角色名称');
      return;
    }

    // 必须先验证角色信息
    if (!parsedCharacter) {
      alert('请先验证角色信息');
      return;
    }

    try {
      // 提交申请,包含完整的角色信息
      // 生成角色URL
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
    } catch (error) {
      console.error('提交申请失败:', error);
      alert('提交失败,请稍后重试');
    }
  };

  if (submitted) {
    return (
      <div className="join-page">
        <div className="join-page__success">
          <div className="join-page__success-icon">✓</div>
          <h2>申请已提交</h2>
          <p>感谢你对椿夏军团的关注！</p>
          <p>请在游戏内联系军团长或军团精英，我们会尽快处理你的申请。</p>
          <Link to="/" className="join-page__btn">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-page__container">
        <div className="join-page__header">
          <Link to="/" className="join-page__back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="join-page__title">加入椿夏</h1>
          <p className="join-page__subtitle">填写申请信息，成为椿夏的一员</p>
        </div>

        <div className="join-page__content">
          <div className="join-page__info">
            <h2>入团须知</h2>
            <ul>
              <li>天族阵营</li>
              <li>友善待人，不恶意攻击他人</li>
              <li>能够参与基本的军团活动（不强制）</li>
              <li>有语音条件更佳</li>
            </ul>

            <h2>重要提示</h2>
            <div className="join-page__notice">
              <span className="join-page__notice-icon">ℹ️</span>
              <div className="join-page__notice-content">
                <p>填写申请表单不代表加入军团，该表单仅用于获取游戏角色信息并展示在本网站。</p>
                <p>如需申请加入军团，请在游戏内搜索「椿夏」申请即可。</p>
              </div>
            </div>

            <h2>联系方式</h2>
            <div className="join-page__contact">
              {contacts.map((contact, index) => (
                <div key={index} className="join-page__contact-item">
                  {contact.role}「{contact.name}」
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="join-page__contact-item">
                  军团长或军团精英
                </div>
              )}
            </div>
          </div>

          <form className="join-page__form" onSubmit={handleSubmit}>
            <h2>申请表单</h2>

            <div className="join-page__field">
              <label htmlFor="characterName">
                角色名称 *
              </label>
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
                <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  {nameError}
                </span>
              )}
            </div>

            <div className="join-page__field">
              <label htmlFor="serverId">
                服务器 *
              </label>
              <ServerSelect
                value={formData.serverId.toString()}
                onChange={handleServerChange}
                serverList={serverList}
                placeholder="请选择服务器"
                required
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                选择角色所在的服务器
              </span>
            </div>

            {/* 角色信息确认框 */}
            {showConfirm && parsedCharacter && (
              <div style={{
                marginTop: '16px',
                padding: '20px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-primary)'
              }}>
                <div style={{ marginBottom: '12px', fontWeight: '600', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                  ✓ 角色信息验证成功
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>角色名称: </span>
                  <span style={{ fontWeight: '600' }}>{parsedCharacter.characterName}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>服务器: </span>
                  <span style={{ fontWeight: '600' }}>{parsedCharacter.serverName}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>等级: </span>
                  <span style={{ fontWeight: '600' }}>Lv.{parsedCharacter.level}</span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>阵营: </span>
                  <span style={{ fontWeight: '600' }}>{parsedCharacter.race === 1 ? '天族' : '魔族'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedCharacter(null);
                    setShowConfirm(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  重新验证
                </button>
              </div>
            )}

            <div className="join-page__field-notice">
              <p>✓ 验证角色信息后才能提交申请</p>
              <p>✓ 天族与魔族均可填写并展示角色信息</p>
              <p>✓ 不涉及账号密码，角色信息均为使用角色名称从官方API请求得到的数据</p>
            </div>

            {/* 底部智能按钮 - 根据验证状态和表单状态切换 */}
            {!showConfirm ? (
              <button
                type="button"
                onClick={handleVerifyCharacter}
                disabled={!formData.characterName.trim() || parsing}
                className="join-page__submit"
              >
                {parsing ? '验证中...' : '验证角色信息'}
              </button>
            ) : (
              <button type="submit" className="join-page__submit">
                提交申请
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
