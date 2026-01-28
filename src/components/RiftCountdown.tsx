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
  // Calculate next rift time locally
  const calculateLocalNextRift = (configOpenTimes?: string[]) => {
    // Get open times from config or defaults
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
  const [, setTick] = useState(0); // Force re-render every second

  useEffect(() => {
    loadRiftInfo();

    // Update countdown every second - force re-render
    const timer = setInterval(() => {
      setTick(t => t + 1); // Trigger re-render
      updateCountdown();
    }, 1000);

    // Refresh data every minute to ensure accuracy
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
      console.error('Failed to load rift countdown, using local calculation:', error);
      // If API fails, try to get times from config file
      try {
        const configResponse = await fetch('/data/tools_config.json');
        const configData = await configResponse.json();
        if (configData.rift?.openTimes) {
          setRiftInfo(calculateLocalNextRift(configData.rift.openTimes));
        } else {
          setRiftInfo(calculateLocalNextRift());
        }
      } catch {
        // Config file also failed, use defaults
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
      // Countdown ended, recalculate
      setRiftInfo(calculateLocalNextRift());
    }
  };

  // Calculate next 4 rift times
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
          const diffSeconds = Math.floor(diffMs / 1000);
          const diffHours = Math.floor(diffSeconds / 3600);
          const diffMinutes = Math.floor((diffSeconds % 3600) / 60);
          const remainingSeconds = diffSeconds % 60;
          const isToday = riftDate.getDate() === now.getDate();

          // Format countdown - accurate to seconds
          let countdown = '';
          if (diffHours > 0) {
            countdown = `${diffHours}h ${diffMinutes}m ${remainingSeconds}s`;
          } else if (diffMinutes > 0) {
            countdown = `${diffMinutes}m ${remainingSeconds}s`;
          } else {
            countdown = `${remainingSeconds}s`;
          }

          nextRifts.push({
            time: rift.time,
            date: isToday ? 'Today' : 'Tomorrow',
            countdown
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
        <h3 className="rift-countdown__title">⏳ Rift Countdown</h3>
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
          {expanded ? 'Collapse ▲' : `Show more (${nextFourRifts.length - 1}) ▼`}
        </button>
      )}
    </div>
  );
};

export default RiftCountdown;
