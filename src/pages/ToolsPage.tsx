import { useState, useEffect } from 'react';
import './ToolsPage.css';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  icon?: string;
}

const ToolsPage = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        if (data.success) {
          setTools(data.data);
        } else {
          // 使用默认工具列表
          setTools([
            {
              id: 'character-builder',
              name: '角色BD构筑',
              description: '在线角色构筑工具,模拟技能、装备搭配',
              url: 'https://questlog.gg/aion-2/zh/character-builder',
              icon: '⚔️'
            }
          ]);
        }
      } catch (error) {
        console.error('加载工具列表失败:', error);
        // 使用默认工具列表
        setTools([
          {
            id: 'character-builder',
            name: '角色BD构筑',
            description: '在线角色构筑工具,模拟技能、装备搭配',
            url: 'https://questlog.gg/aion-2/zh/character-builder',
            icon: '⚔️'
          }
        ]);
      }
      setLoading(false);
    };

    loadTools();
  }, []);

  const handleToolClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="tools-page">
        <div className="tools-page__loading">
          <div className="tools-page__spinner"></div>
          <p>加载工具列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tools-page">
      {/* 背景图层 */}
      <div className="tools-page__bg">
        <img src="/images/hero-bg.png" alt="" className="tools-page__bg-image" />
        <div className="tools-page__bg-overlay"></div>
      </div>

      <div className="tools-page__container">
        {/* 页面标题 */}
        <div className="tools-page__header">
          <h1 className="tools-page__title">实用工具</h1>
          <p className="tools-page__subtitle">
            精选游戏辅助工具,提升游戏体验
          </p>
        </div>

        {/* 工具列表 */}
        {tools.length > 0 ? (
          <div className="tools-grid">
            {tools.map(tool => (
              <div
                key={tool.id}
                className="tool-card"
                onClick={() => handleToolClick(tool.url)}
              >
                <h3 className="tool-card__title">{tool.name}</h3>
                <p className="tool-card__description">{tool.description}</p>
                <div className="tool-card__arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tools-page__empty">
            <div className="tools-page__empty-icon">🔧</div>
            <p>暂无可用工具</p>
            <p>请联系管理员在后台添加工具</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
