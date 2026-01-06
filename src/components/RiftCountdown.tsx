import { useState, useEffect } from 'react';
import './RiftCountdown.css';

interface RiftCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

interface RiftConfig {
  intervalHours: number;
  durationMinutes: number;
  doorOpenMinutes: number;
  timezone: string;
}

interface RiftInfo {
  enabled: boolean;
  config?: RiftConfig;
  nextOpenTime?: string;
  nextOpenTimeFormatted?: string;
  countdownSeconds?: number;
  countdown?: RiftCountdown;
  currentTime?: string;
  allOpenTimes?: string[];
  error?: string;
}

const RiftCountdown = () => {
  // 本地计算下一次裂缝时间
  const calculateLocalNextRift = (configOpenTimes?: string[]) => {
    // 从配置文件或默认值获取开启时间
    const openTimes = configOpenTimes || ['02:00', '05:00', '08:00', '11:00', '14:00', '17:00', '20:00', '23:00'];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const openTimesInMinutes = openTimes.map(time => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    });

    let nextOpenMinutes = openTimesInMinutes.find(t => t > currentTotalMinutes);
    let isNextDay = false;

    if (!nextOpenMinutes) {
      nextOpenMinutes = openTimesInMinutes[0];
      isNextDay = true;
    }

    const nextOpenDate = new Date(now);
    if (isNextDay) {
      nextOpenDate.setDate(nextOpenDate.getDate() + 1);
    }
    nextOpenDate.setHours(Math.floor(nextOpenMinutes / 60));
    nextOpenDate.setMinutes(nextOpenMinutes % 60);
    nextOpenDate.setSeconds(0);
    nextOpenDate.setMilliseconds(0);

    return {
      enabled: true,
      config: {
        intervalHours: 3,
        durationMinutes: 60,
        doorOpenMinutes: 5,
        timezone: 'Asia/Shanghai'
      },
      nextOpenTime: nextOpenDate.toISOString(),
      nextOpenTimeFormatted: `${String(nextOpenDate.getMonth() + 1).padStart(2, '0')}-${String(nextOpenDate.getDate()).padStart(2, '0')} ${String(nextOpenDate.getHours()).padStart(2, '0')}:${String(nextOpenDate.getMinutes()).padStart(2, '0')}`,
      allOpenTimes: openTimes
    };
  };

  const [riftInfo, setRiftInfo] = useState<RiftInfo>(calculateLocalNextRift());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadRiftInfo();

    // 每秒更新一次倒计时
    const timer = setInterval(() => {
      updateCountdown();
    }, 1000);

    // 每分钟重新获取一次数据,确保时间准确
    const refreshTimer = setInterval(() => {
      loadRiftInfo();
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const loadRiftInfo = async () => {
    try {
      const response = await fetch('/api/rift/countdown');
      const data = await response.json();

      if (data.success && data.data) {
        setRiftInfo(data.data);
      }
    } catch (error) {
      console.error('加载裂缝倒计时失败,使用本地计算:', error);
      // API失败时,尝试从配置文件获取时间
      try {
        const configResponse = await fetch('/data/tools_config.json');
        const configData = await configResponse.json();
        if (configData.rift?.openTimes) {
          setRiftInfo(calculateLocalNextRift(configData.rift.openTimes));
        } else {
          setRiftInfo(calculateLocalNextRift());
        }
      } catch {
        // 配置文件也失败,使用默认值
        setRiftInfo(calculateLocalNextRift());
      }
    }
  };

  const updateCountdown = () => {
    if (!riftInfo || !riftInfo.nextOpenTime) {
      setRiftInfo(calculateLocalNextRift());
      return;
    }

    const now = new Date();
    const nextOpen = new Date(riftInfo.nextOpenTime);
    const diff = Math.floor((nextOpen.getTime() - now.getTime()) / 1000);

    if (diff <= 0) {
      // 倒计时结束,重新计算
      setRiftInfo(calculateLocalNextRift());
    }
  };

  // 计算接下来4次裂缝时间
  const getNextFourRifts = () => {
    if (!riftInfo || !riftInfo.allOpenTimes) return [];

    const now = new Date();
    const openTimes = riftInfo.allOpenTimes;

    const openTimesInMinutes = openTimes.map(time => {
      const [h, m] = time.split(':').map(Number);
      return { time, minutes: h * 60 + m };
    });

    const nextRifts = [];
    let dayOffset = 0;

    for (let i = 0; i < openTimesInMinutes.length && nextRifts.length < 4; i++) {
      for (let j = 0; j < openTimesInMinutes.length && nextRifts.length < 4; j++) {
        const rift = openTimesInMinutes[j];
        const riftDate = new Date(now);
        riftDate.setDate(riftDate.getDate() + dayOffset);
        riftDate.setHours(Math.floor(rift.minutes / 60));
        riftDate.setMinutes(rift.minutes % 60);
        riftDate.setSeconds(0);

        if (riftDate > now && nextRifts.length < 4) {
          const diffMs = riftDate.getTime() - now.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const isToday = riftDate.getDate() === now.getDate();

          nextRifts.push({
            time: rift.time,
            date: isToday ? '今天' : '明天',
            countdown: diffHours > 0 ? `${diffHours}小时${diffMinutes}分钟` : `${diffMinutes}分钟`
          });
        }
      }
      dayOffset++;
    }

    return nextRifts;
  };

  if (!riftInfo.enabled) {
    return null;
  }

  const nextFourRifts = getNextFourRifts();

  const displayRifts = expanded ? nextFourRifts : nextFourRifts.slice(0, 1);

  return (
    <div className="rift-countdown">
      <div className="rift-countdown__header">
        <h3 className="rift-countdown__title">⏳ 时空裂隙</h3>
      </div>

      <div className="rift-countdown__list">
        {displayRifts.map((rift, index) => (
          <div key={index} className="rift-countdown__item">
            <div className="rift-countdown__item-content">
              <div className="rift-countdown__item-time">{rift.time}</div>
              <div className="rift-countdown__item-date">{rift.date}</div>
              <div className="rift-countdown__item-countdown">{rift.countdown}</div>
            </div>
          </div>
        ))}
      </div>

      {nextFourRifts.length > 1 && (
        <button
          className="rift-countdown__expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '收起 ▲' : `展开查看更多 (${nextFourRifts.length - 1}) ▼`}
        </button>
      )}
    </div>
  );
};

export default RiftCountdown;
