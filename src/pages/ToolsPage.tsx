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
        console.error('Failed to load tools list:', error);
      }
    };

    loadTools();
  }, []);

  const handleToolClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="tools-page">
      {/* Background layer */}
      <div className="tools-page__bg">
        <img src="/images/hero-bg.png" alt="" className="tools-page__bg-image" />
        <div className="tools-page__bg-overlay"></div>
      </div>

      <div className="tools-page__container">
        {/* Page title */}
        <div className="tools-page__header">
          <h1 className="tools-page__title">Tools</h1>
        </div>

        {/* Main content area - single column layout */}
        <div className="tools-page__layout">
          {/* Left main content */}
          <div className="tools-page__main-content">
            {/* Game notices */}
            <section className="tools-page__section">
              <GameNotices />
            </section>

            {/* Tool cards */}
            <section className="tools-page__section">
              <div className="tools-section__header">
                <h2 className="tools-section__title">🔧 Tools</h2>
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
                  <p>No tools available</p>
                  <p>Please contact admin to add tools</p>
                </div>
              )}
            </section>
          </div>

          {/* Right side - Rift countdown (fixed) */}
          <aside className="tools-page__sidebar">
            <RiftCountdown />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
