import { useState, useEffect } from 'react';
import './GameNotices.css';

interface Notice {
  id: string;
  title: string;
  summary: string;
  articleContent?: string; // 添加文章详细内容字段
  timestamps: {
    postDateTime: string;
    postedAt: string;
  };
  reactions: {
    viewCount: number;
  };
  rootBoard: {
    board: {
      boardName: string;
      boardAlias: string;
      boardUrlPattern: string;
    };
  };
}

interface NoticesData {
  lastUpdate: string;
  notices: Notice[];
}

type TabType = 'all' | 'notice' | 'update';

const GameNotices = () => {
  const [noticesData, setNoticesData] = useState<NoticesData>({
    lastUpdate: '',
    notices: []
  });
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const response = await fetch('/data/new/game_notices.json');
      const data = await response.json();

      if (data && data.notices) {
        // 按发布日期排序(最新的在前)
        const sortedNotices = [...data.notices].sort((a, b) => {
          const dateA = new Date(a.timestamps?.postedAt || a.timestamps?.postDateTime);
          const dateB = new Date(b.timestamps?.postedAt || b.timestamps?.postDateTime);
          return dateB.getTime() - dateA.getTime();
        });

        setNoticesData({
          ...data,
          notices: sortedNotices
        });
      }
    } catch (error) {
      console.error('Failed to load notices:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr.split(' ')[0] || '';
      }
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      }).replace(/\//g, '-');
    } catch {
      return '';
    }
  };

  const getNoticeType = (notice: Notice): string => {
    const boardAlias = notice.rootBoard?.board?.boardAlias || '';
    return boardAlias.includes('update') ? 'Update' : 'Notice';
  };

  const getNoticeTypeClass = (notice: Notice) => {
    return getNoticeType(notice) === 'Update' ? 'update' : 'notice';
  };

  const getFilteredNotices = () => {
    let filtered = noticesData.notices;

    if (activeTab === 'notice') {
      filtered = noticesData.notices.filter(n => getNoticeType(n) === 'Notice');
    } else if (activeTab === 'update') {
      filtered = noticesData.notices.filter(n => getNoticeType(n) === 'Update');
    }

    return filtered.slice(0, 5); // 只显示前5条
  };

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
  };

  const closeDetail = () => {
    setSelectedNotice(null);
  };

  const handleViewMore = () => {
    window.open('https://tw.ncsoft.com/aion2/board/notice/list', '_blank', 'noopener,noreferrer');
  };

  const handleViewOriginal = (notice: Notice) => {
    const urlPattern = notice.rootBoard?.board?.boardUrlPattern || '';
    const url = urlPattern.replace('{articleId}', notice.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredNotices = getFilteredNotices();

  return (
    <>
      <div className="game-notices">
        <div className="game-notices__header">
          <h3 className="game-notices__title">Game Notices</h3>
          {noticesData.lastUpdate && (
            <span className="game-notices__update-time">
              {formatDate(noticesData.lastUpdate)}
            </span>
          )}
        </div>

        {/* Tab切换 */}
        <div className="game-notices__tabs">
          <button
            className={`game-notices__tab ${activeTab === 'all' ? 'game-notices__tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`game-notices__tab ${activeTab === 'notice' ? 'game-notices__tab--active' : ''}`}
            onClick={() => setActiveTab('notice')}
          >
            Notices
          </button>
          <button
            className={`game-notices__tab ${activeTab === 'update' ? 'game-notices__tab--active' : ''}`}
            onClick={() => setActiveTab('update')}
          >
            Updates
          </button>
        </div>

        {filteredNotices.length > 0 ? (
          <>
            <div className="game-notices__list">
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="notice-item"
                  onClick={() => handleNoticeClick(notice)}
                >
                  <span className={`notice-item__tag notice-item__tag--${getNoticeTypeClass(notice)}`}>
                    {getNoticeType(notice)}
                  </span>
                  <span className="notice-item__title">{notice.title}</span>
                  <span className="notice-item__date">
                    {formatDate(notice.timestamps?.postDateTime || notice.timestamps?.postedAt)}
                  </span>
                </div>
              ))}
            </div>

            <button className="game-notices__more-btn" onClick={handleViewMore}>
              View More →
            </button>
          </>
        ) : (
          <div className="game-notices__empty">
            <p>No notices</p>
          </div>
        )}
      </div>

      {selectedNotice && (
        <div className="notice-modal" onClick={closeDetail}>
          <div className="notice-modal__overlay"></div>
          <div className="notice-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="notice-modal__close" onClick={closeDetail}>
              ✕
            </button>

            <div className="notice-detail">
              <div className="notice-detail__header">
                <span className={`notice-detail__tag notice-detail__tag--${getNoticeTypeClass(selectedNotice)}`}>
                  {getNoticeType(selectedNotice)}
                </span>
                <span className="notice-detail__date">
                  {formatDate(selectedNotice.timestamps?.postDateTime || selectedNotice.timestamps?.postedAt)}
                </span>
              </div>

              <h2 className="notice-detail__title">{selectedNotice.title}</h2>

              <div className="notice-detail__content">
                <div dangerouslySetInnerHTML={{
                  __html: selectedNotice.articleContent || selectedNotice.summary || 'No content available'
                }} />
              </div>

              <div className="notice-detail__footer">
                <button
                  className="notice-detail__view-btn"
                  onClick={() => handleViewOriginal(selectedNotice)}
                >
                  View Original →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameNotices;
