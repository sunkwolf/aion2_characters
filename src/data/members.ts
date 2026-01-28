// Member data - can be modified according to actual situation
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
    name: 'Leader Name',
    role: 'leader',
    class: 'Class',
    title: 'Legion Leader',
    joinDate: 'Founding Member'
  },
  {
    id: '2',
    name: 'Officer 1',
    role: 'officer',
    class: 'Class',
    title: 'Vice Leader'
  },
  {
    id: '3',
    name: 'Officer 2',
    role: 'officer',
    class: 'Class',
    title: 'Vice Leader'
  },
  // Can add more members...
];

// Class icon mapping (extensible)
export const classIcons: Record<string, string> = {
  'Gladiator': '⚔️',
  'Templar': '🛡️',
  'Sorcerer': '🔮',
  'Spiritmaster': '🏹',
  'Cleric': '💚',
  'Chanter': '📿',
  'Ranger': '🎯',
  'Assassin': '🗡️',
  'Songweaver': '🎵',
  'Gunslinger': '🔱',
  'Aethertech': '⚙️',
  'Painter': '🎨',
  'Default': '✨'
};
