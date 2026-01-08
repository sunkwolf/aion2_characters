import { useState, useEffect } from 'react';
import GameNotices from '../components/GameNotices';
import RiftCountdown from '../components/RiftCountdown';
import './ToolsPage.css';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
}

const ToolsPage = () => {
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        if (data.success && data.tools && data.tools.length > 0) {
          setTools(data.tools);
        }
      } catch (error) {
        console.error('加载工具列表失败:', error);
      }
    };

    loadTools();
  }, []);

  const handleToolClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
        </div>

        {/* 主内容区 - 单栏布局 */}
        <div className="tools-page__layout">
          {/* 左侧主内容 */}
          <div className="tools-page__main-content">
            {/* 游戏通知 */}
            <section className="tools-page__section">
              <GameNotices />
            </section>

            {/* 工具卡片 */}
            <section className="tools-page__section">
              <div className="tools-section__header">
                <h2 className="tools-section__title">🔧 工具</h2>
              </div>

              {tools.length > 0 ? (
                <div className="tools-list">
                  {tools.map(tool => (
                    <div
                      key={tool.id}
                      className="tool-item"
                      onClick={() => handleToolClick(tool.url)}
                    >
                      <div className="tool-item__content">
                        <h3 className="tool-item__name">{tool.name}</h3>
                        <p className="tool-item__description">{tool.description}</p>
                      </div>
                      <div className="tool-item__arrow">→</div>
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
            </section>
          </div>

          {/* 右侧 - 裂缝倒计时(固定) */}
          <aside className="tools-page__sidebar">
            <RiftCountdown />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
