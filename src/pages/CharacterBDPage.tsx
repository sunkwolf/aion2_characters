import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

// 缓存数据类型
interface CachedCharacter {
  data: any;
  timestamp: number;
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

const CharacterBDPage = () => {
  const navigate = useNavigate();
  const [characterName, setCharacterName] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchResults, setSearchResults] = useState<CharacterBasicInfo[]>([]);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<'tw' | 'kr'>('tw');

  // 加载服务器列表和搜索历史
  useEffect(() => {
    const loadServers = async () => {
      try {
        // 先尝试从缓存加载
        const cached = localStorage.getItem('server_list_cache');
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
            if (Date.now() - timestamp < CACHE_DURATION) {
              setServers(data);
              console.log('使用缓存的服务器列表');
              return;
            }
          } catch (e) {
            console.error('解析服务器缓存失败:', e);
          }
        }

        // 缓存不存在或已过期,先加载本地备份
        const localResponse = await fetch('/data/serverId.json');
        const localData = await localResponse.json();
        const localServers = localData.serverList.map((server: any) => ({
          id: server.serverId,
          name: server.serverName,
          label: server.serverName  // 使用完整服务器名称而非简写
        }));
        setServers(localServers);
        console.log('加载本地服务器列表');

        // 然后异步更新远程列表
        try {
          const response = await fetch('https://tw.ncsoft.com/aion2/api/gameinfo/servers?lang=zh');
          const data = await response.json();
          const serverList: Server[] = data.map((server: any) => ({
            id: server.id,
            name: server.name,
            label: server.label
          }));
          setServers(serverList);

          // 保存到缓存
          localStorage.setItem('server_list_cache', JSON.stringify({
            data: serverList,
            timestamp: Date.now()
          }));
          console.log('更新远程服务器列表');
        } catch (error) {
          console.error('加载远程服务器列表失败,使用本地列表:', error);
        }
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

  // 搜索所有服务器
  const performSearchAllServers = async (name: string) => {
    setSearching(true);
    setError('');
    setSearchResults([]);

    try {
      // 并发搜索所有服务器
      const searchPromises = servers.map(server =>
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
      setError('搜索失败，请稍后重试');
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

    performSearchAllServers(characterName);
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

    const cacheKey = `character_${character.characterId}`;
    const now = Date.now();
    const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4小时

    // 检查缓存
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData: CachedCharacter = JSON.parse(cached);
        if (now - cachedData.timestamp < CACHE_DURATION) {
          // 导航到详情页
          navigate('/character-detail', {
            state: { characterData: cachedData.data }
          });
          return;
        }
      } catch (e) {
        console.error('解析缓存失败:', e);
      }
    }

    // 缓存不存在或已过期,请求新数据
    setLoadingDetail(true);
    setError('');

    try {
      const infoUrl = `/api/character/info?characterId=${character.characterId}&serverId=${character.serverId}`;
      const equipUrl = `/api/character/equipment?characterId=${character.characterId}&serverId=${character.serverId}`;

      const [infoResponse, equipmentResponse] = await Promise.all([
        fetch(infoUrl),
        fetch(equipUrl)
      ]);

      const [infoData, equipmentData] = await Promise.all([
        infoResponse.json(),
        equipmentResponse.json()
      ]);

      const characterData = {
        info: infoData,
        equipment: equipmentData
      };

      // 保存到 LocalStorage
      const cacheData: CachedCharacter = {
        data: characterData,
        timestamp: now
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // 关闭 loading 状态
      setLoadingDetail(false);

      // 导航到详情页
      navigate('/character-detail', {
        state: { characterData }
      });
    } catch (error) {
      console.error('获取角色详情失败:', error);
      setError('获取角色详情失败，请稍后重试');
      setLoadingDetail(false);
    }
  };

  // 清除输入
  const clearInput = () => {
    setCharacterName('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className="character-bd-page">
      <div className="character-bd-page__container">
        <div className="character-bd-page__header">
          <h1 className="character-bd-page__title">角色BD查询</h1>
          <p className="character-bd-page__subtitle">查询任意角色的完整信息</p>
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
            <span className="search-box__icon">🔍</span>
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
                <div
                  key={index}
                  className="result-card"
                  onClick={() => handleViewDetail(result)}
                >
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
              ))}
            </div>
          </div>
        )}

        {/* 查询记录 */}
        <div className="favorites-section">
          <div className="favorites-section__header">
            <div className="favorites-section__title">
              <span>查询记录</span>
              <span className="favorites-section__count">{searchHistory.length}条</span>
            </div>
            {searchHistory.length > 0 && (
              <button
                className="favorites-section__clear"
                onClick={clearHistory}
                title="清空查询记录"
              >
                🗑️
              </button>
            )}
          </div>

          {searchHistory.length > 0 ? (
            <>
              {/* 显示最多3条预览 */}
              <div className="search-results__list">
                {searchHistory.slice(0, 3).map((history, index) => (
                  <div
                    key={index}
                    className="result-card"
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
                  >
                    {history.profileImage && (
                      <div className="result-card__avatar">
                        <img src={history.profileImage} alt={history.characterName} />
                      </div>
                    )}
                    <div className="result-card__info">
                      <div className="result-card__name">{history.characterName}</div>
                      <div className="result-card__details">
                        <span className="result-card__server">{history.serverLabel}</span>
                        {history.level && (
                          <>
                            <span className="result-card__divider">·</span>
                            <span className="result-card__level">Lv.{history.level}</span>
                          </>
                        )}
                        {history.race && (
                          <>
                            <span className="result-card__divider">·</span>
                            <span className="result-card__race">
                              {history.race === 1 ? '天族' : '魔族'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      className="result-card__delete"
                      onClick={(e) => deleteHistoryItem(index, e)}
                      title="删除此记录"
                    >
                      🗑️
                    </button>
                    <div className="result-card__action">
                      <span>查看详情</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {searchHistory.length > 3 && (
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
                  <div
                    key={index}
                    className="result-card"
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
                  >
                    {history.profileImage && (
                      <div className="result-card__avatar">
                        <img src={history.profileImage} alt={history.characterName} />
                      </div>
                    )}
                    <div className="result-card__info">
                      <div className="result-card__name">{history.characterName}</div>
                      <div className="result-card__details">
                        <span className="result-card__server">{history.serverLabel}</span>
                        {history.level && (
                          <>
                            <span className="result-card__divider">·</span>
                            <span className="result-card__level">Lv.{history.level}</span>
                          </>
                        )}
                        {history.race && (
                          <>
                            <span className="result-card__divider">·</span>
                            <span className="result-card__race">
                              {history.race === 1 ? '天族' : '魔族'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      className="result-card__delete"
                      onClick={(e) => deleteHistoryItem(index, e)}
                      title="删除此记录"
                    >
                      🗑️
                    </button>
                    <div className="result-card__action">
                      <span>查看详情</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
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

      {/* 加载角色详情模态框 */}
      {loadingDetail && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>载入角色信息中...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterBDPage;
