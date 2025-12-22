// 成员数据 - 可根据实际情况修改
export interface Member {
  id: string;
  name: string;
  role: 'leader' | 'officer' | 'member';
  class: string;
  title?: string;
  joinDate?: string;
  avatar?: string;
}

export const members: Member[] = [
  {
    id: '1',
    name: '团长名字',
    role: 'leader',
    class: '职业',
    title: '军团长',
    joinDate: '创团成员'
  },
  {
    id: '2',
    name: '副团1',
    role: 'officer',
    class: '职业',
    title: '副团长'
  },
  {
    id: '3',
    name: '副团2',
    role: 'officer',
    class: '职业',
    title: '副团长'
  },
  // 可以继续添加更多成员...
];

// 职业图标映射（可扩展）
export const classIcons: Record<string, string> = {
  '剑星': '⚔️',
  '守护星': '🛡️',
  '魔道星': '🔮',
  '精灵星': '🏹',
  '治愈星': '💚',
  '护法星': '📿',
  '弓星': '🎯',
  '杀星': '🗡️',
  '吟游星': '🎵',
  '枪星': '🔱',
  '机甲星': '⚙️',
  '画师': '🎨',
  '默认': '✨'
};
