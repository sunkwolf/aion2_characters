import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServerSelector from '../components/ServerSelector';
import './CharacterBDPage.css';

// 服务器类型(从 API 获取)
interface Server {
  id: number;
  name: string;
  label: string;
}

// 角色基础信息类型
interface CharacterBasicInfo {
  characterId: string;
  characterName: string;
  serverId: number;
  serverName: string;
  serverLabel: string;
  level: number;
  race: number;
  pcId?: number;
  profileImage?: string;
}

// 搜索历史记录类型
interface SearchHistory {
  characterId: string;
  characterName: string;
  serverId: number;
  serverLabel: string;
  level?: number;
  race?: number;
  profileImage?: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = 'character_search_history';
const MAX_HISTORY_ITEMS = 5;

// 历史记录项组件 - 显示缓存的评分（不主动请求）
interface HistoryItemProps {
  history: SearchHistory;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const HistoryItem = ({ history, onClick, onDelete }: HistoryItemProps) => {
  const [cachedRating, setCachedRating] = useState<number | null>(null);

  useEffect(() => {
    // 尝试从缓存读取评分（不主动请求）
    const ratingCacheKey = `rating_${history.serverId}_${history.characterId}`;
    const cached = localStorage.getItem(ratingCacheKey);

    if (cached) {
      try {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        const eightHours = 8 * 60 * 60 * 1000;

        // 检查缓存是否有效（8小时内）
        if (now - cacheData.timestamp < eightHours && cacheData.rating?.scores?.score) {
          setCachedRating(Math.floor(cacheData.rating.scores.score));
        }
      } catch (e) {
        // 缓存解析失败，不显示评分
      }
    }
  }, [history.serverId, history.characterId]);

  return (
    <div className="history-item" onClick={onClick}>
      {history.profileImage && (
        <img src={history.profileImage} alt={history.characterName} className="history-item__avatar" />
      )}
      <div className="history-item__info">
        <div className="history-item__name-row">
          <span className="history-item__name">{history.characterName}</span>
          {cachedRating !== null && (
            <div className="history-item__rating">
              <span className="history-item__rating-label">PVE评分:</span>
              <span className="history-item__rating-value">{cachedRating}</span>
            </div>
          )}
        </div>
        <span className="history-item__meta">
          {history.serverLabel}
          {history.level && ` · Lv.${history.level}`}
          {history.race && ` · ${history.race === 1 ? '天族' : '魔族'}`}
        </span>
      </div>
      <button
        className="history-item__delete"
        onClick={onDelete}
        title="删除此记录"
      >
        ✕
      </button>
    </div>
  );
};

// 搜索结果卡片组件 - 不显示评分(避免频繁请求)
interface SearchResultCardProps {
  result: CharacterBasicInfo;
  onClick: () => void;
}

const SearchResultCard = ({ result, onClick }: SearchResultCardProps) => {
  return (
    <div className="result-card" onClick={onClick}>
      {result.profileImage && (
        <div className="result-card__avatar">
          <img src={result.profileImage} alt={result.characterName} />
        </div>
      )}
      <div className="result-card__info">
        <div className="result-card__name">{result.characterName}</div>
        <div className="result-card__details">
          <span className="result-card__server">{result.serverLabel}</span>
          <span className="result-card__divider">·</span>
          <span className="result-card__level">Lv.{result.level}</span>
          <span className="result-card__divider">·</span>
          <span className="result-card__race">
            {result.race === 1 ? '天族' : '魔族'}
          </span>
        </div>
      </div>
      <div className="result-card__action">
        <span>查看详情</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
};

const CharacterBDPage = () => {
  const navigate = useNavigate();
  const [characterName, setCharacterName] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CharacterBasicInfo[]>([]);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<'tw' | 'kr'>('tw');
  const [selectedServer, setSelectedServer] = useState<number | null>(null); // null 表示搜索所有服务器

  // 加载服务器列表和搜索历史
  useEffect(() => {
    const loadServers = async () => {
      try {
        // 直接从本地文件加载服务器列表 (添加时间戳防止缓存)
        const localResponse = await fetch(`/data/serverId.json?t=${Date.now()}`);
        const localData = await localResponse.json();
        const localServers = localData.serverList.map((server: any) => ({
          id: server.serverId,
          name: server.serverName,
          label: server.serverName
        }));
        setServers(localServers);
      } catch (error) {
        console.error('加载服务器列表失败:', error);
      }
    };

    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const history = JSON.parse(stored);
          setSearchHistory(history);
        }
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    };

    loadServers();
    loadHistory();
  }, []);

  // 保存搜索历史
  const saveToHistory = (characterId: string, name: string, serverId: number, serverLabel: string, level?: number, race?: number, profileImage?: string) => {
    try {
      const newHistory: SearchHistory = {
        characterId,
        characterName: name,
        serverId,
        serverLabel,
        level,
        race,
        profileImage,
        timestamp: Date.now()
      };

      // 去重并添加到历史记录最前面
      const filtered = searchHistory.filter(
        h => !(h.characterName === name && h.serverId === serverId)
      );
      const updated = [newHistory, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(updated);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  };

  // 清除搜索历史
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  // 删除单条历史记录
  const deleteHistoryItem = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡,防止触发查看详情
    const updated = searchHistory.filter((_, i) => i !== index);
    setSearchHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  // 搜索单个服务器
  const performSearchForServer = async (name: string, serverId: number, serverLabel: string): Promise<CharacterBasicInfo | null> => {
    try {
      const searchResponse = await fetch(
        `/api/character/search?name=${encodeURIComponent(name)}&serverId=${serverId}`
      );
      const searchData = await searchResponse.json();

      if (!searchData.success) {
        return null;
      }

      const character = searchData.character;
      const infoUrl = `/api/character/info?characterId=${character.characterId}&serverId=${character.serverId}`;
      const infoResponse = await fetch(infoUrl);
      const infoData = await infoResponse.json();

      return {
        characterId: character.characterId,
        serverId: character.serverId,
        characterName: infoData.profile?.characterName || character.characterName || character.name,
        serverName: serverLabel,
        serverLabel: serverLabel,
        level: infoData.profile?.characterLevel || character.level,
        race: infoData.profile?.raceId || character.race,
        profileImage: infoData.profile?.profileImage
      };
    } catch (error) {
      console.error(`搜索服务器 ${serverLabel} 失败:`, error);
      return null;
    }
  };

  // 搜索所有服务器或指定服务器
  const performSearchAllServers = async (name: string) => {
    setSearching(true);
    setError('');
    setSearchResults([]);

    try {
      // 如果选择了服务器,只搜索该服务器;否则搜索所有服务器
      const serversToSearch = selectedServer
        ? servers.filter(s => s.id === selectedServer)
        : servers;

      // 并发搜索服务器
      const searchPromises = serversToSearch.map(server =>
        performSearchForServer(name, server.id, server.label)
      );

      const results = await Promise.all(searchPromises);
      const validResults = results.filter((r): r is CharacterBasicInfo => r !== null);

      if (validResults.length === 0) {
        setError('未找到该角色,请检查角色名称是否正确');
        setSearching(false);
        return;
      }

      setSearchResults(validResults);
      setSearching(false);
    } catch (error) {
      console.error('搜索失败:', error);
      setError('搜索失败,请稍后重试');
      setSearching(false);
    }
  };

  // 处理搜索表单提交
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterName.trim()) {
      setError('请输入角色名称');
      return;
    }

    if (servers.length === 0) {
      setError('服务器列表加载中，请稍候...');
      return;
    }

    // 去除角色名前后空格
    performSearchAllServers(characterName.trim());
  };

  // 查看角色详情
  const handleViewDetail = async (character: CharacterBasicInfo) => {
    // 保存到搜索历史(用户点击时才保存)
    saveToHistory(
      character.characterId,
      character.characterName,
      character.serverId,
      character.serverLabel,
      character.level,
      character.race,
      character.profileImage
    );

    // 直接跳转到新的分享路由 (实时加载数据)
    navigate(`/character/${character.serverId}/${encodeURIComponent(character.characterId)}`);
  };

  // 清除输入
  const clearInput = () => {
    setCharacterName('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className="character-bd-page">
      {/* 背景图层 */}
      <div className="character-bd-page__bg">
        <img src="/images/hero-bg.png" alt="" className="character-bd-page__bg-image" />
        <div className="character-bd-page__bg-overlay"></div>
      </div>

      <div className="character-bd-page__container">
        <div className="character-bd-page__header">
          <h1 className="character-bd-page__title">角色BD查询</h1>
          <img
            src="https://download.plaync.com.tw/AION2/teaser/4th/e-text-animated.webp"
            alt="查询任意角色的完整信息"
            className="character-bd-page__subtitle-img"
          />
        </div>

        {/* 服务器区域选择 */}
        <div className="region-selector">
          <button
            className={`region-selector__btn ${selectedRegion === 'tw' ? 'active' : ''}`}
            onClick={() => setSelectedRegion('tw')}
          >
            <span className="region-selector__flag">🇹🇼</span>
            <span className="region-selector__label">Taiwan</span>
            {selectedRegion === 'tw' && <span className="region-selector__check">✓</span>}
          </button>
          <button
            className="region-selector__btn locked"
            disabled
            title="韩国服务器暂未开放"
          >
            <span className="region-selector__flag">🇰🇷</span>
            <span className="region-selector__label">Korea</span>
            <span className="region-selector__lock">🔒</span>
          </button>
        </div>

        {/* 搜索框 */}
        <form className="search-box" onSubmit={handleSearch}>
          <div className="search-box__input-wrapper">
            {/* 服务器选择器 */}
            <ServerSelector
              servers={servers}
              selectedServer={selectedServer}
              onSelectServer={setSelectedServer}
            />

            <input
              type="text"
              className="search-box__input"
              placeholder="请输入角色名称..."
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
              disabled={searching}
            />
            {characterName && (
              <button
                type="button"
                className="search-box__clear"
                onClick={clearInput}
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="search-box__submit"
              disabled={searching}
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>
        </form>

        {/* 搜索提示 */}
        <div className="search-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>💡 建议选择服务器,查询速度更快更精准</span>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h2 className="search-results__title">
              找到 {searchResults.length} 个角色
            </h2>
            <div className="search-results__list">
              {searchResults.map((result, index) => (
                <SearchResultCard
                  key={index}
                  result={result}
                  onClick={() => handleViewDetail(result)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 查询记录 */}
        <div className="favorites-section">
          <div className="favorites-section__header">
            <div className="favorites-section__title">
              查询记录 <span className="favorites-section__count">{searchHistory.length}条</span>
            </div>
            {searchHistory.length > 0 && (
              <button
                className="favorites-section__clear"
                onClick={clearHistory}
                title="一键清空"
              >
                ✕
              </button>
            )}
          </div>

          {searchHistory.length > 0 ? (
            <>
              {/* 显示最多2条预览 */}
              <div className="history-list">
                {searchHistory.slice(0, 2).map((history, index) => (
                  <HistoryItem
                    key={index}
                    history={history}
                    onClick={() => handleViewDetail({
                      characterId: history.characterId,
                      characterName: history.characterName,
                      serverId: history.serverId,
                      serverName: history.serverLabel,
                      serverLabel: history.serverLabel,
                      level: history.level || 0,
                      race: history.race || 0,
                      profileImage: history.profileImage
                    })}
                    onDelete={(e) => deleteHistoryItem(index, e)}
                  />
                ))}
              </div>

              {searchHistory.length > 2 && (
                <button
                  className="favorites-section__view-all"
                  onClick={() => setShowHistoryModal(true)}
                >
                  查看全部 ▼
                </button>
              )}
            </>
          ) : (
            <div className="favorites-section__empty">
              <p>暂无查询记录</p>
            </div>
          )}
        </div>

        {/* 查询记录完整模态框 */}
        {showHistoryModal && (
          <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
              <div className="history-modal__header">
                <div className="history-modal__title">
                  <span>所有查询记录</span>
                  <span className="history-modal__count">{searchHistory.length}条</span>
                </div>
                <button
                  className="history-modal__close"
                  onClick={() => setShowHistoryModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="history-modal__list">
                {searchHistory.map((history, index) => (
                  <HistoryItem
                    key={index}
                    history={history}
                    onClick={() => {
                      handleViewDetail({
                        characterId: history.characterId,
                        characterName: history.characterName,
                        serverId: history.serverId,
                        serverName: history.serverLabel,
                        serverLabel: history.serverLabel,
                        level: history.level || 0,
                        race: history.race || 0,
                        profileImage: history.profileImage
                      });
                      setShowHistoryModal(false);
                    }}
                    onDelete={(e) => deleteHistoryItem(index, e)}
                  />
                ))}
              </div>

              <div className="history-modal__footer">
                <button
                  className="history-modal__back"
                  onClick={() => setShowHistoryModal(false)}
                >
                  ← 返回
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterBDPage;
