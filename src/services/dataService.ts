// Data service - handles member and application data loading, saving, exporting

import type { MemberConfig, JoinApplication, EquipmentDetailsCache } from '../types/admin';

// ============= Constants =============

const STORAGE_KEYS = {
  MEMBERS: 'chunxia_members',
  APPLICATIONS: 'chunxia_applications',
  EQUIPMENT_CACHE: 'chunxia_equipment_cache',
  ADMIN_LOGIN: 'chunxia_admin_login',
};

// ============= Member Management =============

/**
 * Load member list
 * Load from backend API for cross-device sync
 */
export async function loadMembers(): Promise<MemberConfig[]> {
  try {
    console.log('Loading member list from backend API...');
    const response = await fetch('/api/members');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('Successfully loaded member list:', result.data.length, 'members');
        return result.data;
      }
    }
  } catch (e) {
    console.error('Failed to load member list from backend:', e);
  }

  return [];
}

/**
 * Save member list to backend
 */
export async function saveMembers(members: MemberConfig[]): Promise<boolean> {
  try {
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(members),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Member list saved successfully');
      return true;
    } else {
      console.error('Save failed:', result.error);
      return false;
    }
  } catch (e) {
    console.error('Failed to save member list:', e);
    return false;
  }
}

/**
 * Add member
 */
export async function addMember(members: MemberConfig[], newMember: MemberConfig): Promise<MemberConfig[]> {
  // Check if ID already exists
  if (members.some(m => m.id === newMember.id)) {
    throw new Error(`Member ID "${newMember.id}" already exists`);
  }
  const updated = [...members, newMember];
  await saveMembers(updated);
  return updated;
}

/**
 * Update member
 */
export async function updateMember(members: MemberConfig[], updatedMember: MemberConfig): Promise<MemberConfig[]> {
  const index = members.findIndex(m => m.id === updatedMember.id);
  if (index === -1) {
    throw new Error(`Member "${updatedMember.id}" does not exist`);
  }
  const updated = [...members];
  updated[index] = updatedMember;
  await saveMembers(updated);
  return updated;
}

/**
 * Delete member
 * First call backend DELETE API to delete member data folder, then update members.json
 */
export async function deleteMember(members: MemberConfig[], memberId: string): Promise<MemberConfig[]> {
  try {
    // 1. Call backend DELETE API to delete member data folder
    console.log(`Deleting member: ${memberId}`);
    const response = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Delete failed');
    }

    console.log(`✓ Member ${memberId} deleted successfully`);

    // 2. Update local member list (remove from array)
    const updated = members.filter(m => m.id !== memberId);

    // 3. Save updated list to backend
    await saveMembers(updated);

    return updated;
  } catch (error: any) {
    console.error(`Failed to delete member ${memberId}:`, error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Export member list as JSON file
 */
export function exportMembersToFile(members: MemberConfig[]): void {
  const json = JSON.stringify(members, null, 2);
  downloadFile(json, 'members.json', 'application/json');
}

// ============= Application Management =============

/**
 * Load application list
 * Load from backend API for cross-device sync
 */
export async function loadApplications(): Promise<JoinApplication[]> {
  try {
    console.log('Loading application list from backend API...');
    const response = await fetch('/api/applications');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('Successfully loaded application list:', result.data.length, 'applications');
        return result.data;
      }
    }
  } catch (e) {
    console.error('Failed to load application list from backend:', e);
  }

  return [];
}

/**
 * Add new application
 */
export async function addApplication(
  newApp: Omit<JoinApplication, 'id' | 'submittedAt' | 'status'>
): Promise<JoinApplication> {
  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newApp),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Application submitted successfully');
      return result.data;
    } else {
      throw new Error(result.error || 'Submit failed');
    }
  } catch (e) {
    console.error('Failed to submit application:', e);
    throw e;
  }
}

/**
 * Review application
 */
export async function reviewApplication(
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<JoinApplication> {
  try {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, reviewNote }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Application reviewed successfully');
      return result.data;
    } else {
      throw new Error(result.error || 'Review failed');
    }
  } catch (e) {
    console.error('Failed to review application:', e);
    throw e;
  }
}

/**
 * Delete application
 */
export async function deleteApplication(applicationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    if (result.success) {
      console.log('Application deleted successfully');
      return true;
    } else {
      throw new Error(result.error || 'Delete failed');
    }
  } catch (e) {
    console.error('Failed to delete application:', e);
    throw e;
  }
}

/**
 * Generate safe member ID
 * Handle Chinese, special characters, numbers, etc.
 */
function generateSafeMemberId(name: string): string {
  // Remove all spaces
  let id = name.trim().replace(/\s+/g, '');

  // If pure numbers, add prefix
  if (/^\d+$/.test(id)) {
    id = 'member_' + id;
  }

  // If contains Chinese or special characters, convert to pinyin or use timestamp
  // Using simple approach: keep letters and numbers, replace other chars with underscore
  id = id.replace(/[^a-zA-Z0-9]/g, '_');

  // Convert to lowercase
  id = id.toLowerCase();

  // If ID is empty or only underscores, use timestamp
  if (!id || /^_+$/.test(id)) {
    id = 'member_' + Date.now();
  }

  // Ensure ID doesn't start with number (some systems may have this requirement)
  if (/^\d/.test(id)) {
    id = 'm_' + id;
  }

  // Limit length
  if (id.length > 50) {
    id = id.substring(0, 50);
  }

  return id;
}

/**
 * Create member config from approved application
 */
export function createMemberFromApplication(application: JoinApplication): Omit<MemberConfig, 'characterId' | 'serverId'> {
  return {
    id: generateSafeMemberId(application.characterName),
    name: application.characterName,
    role: 'member',
  };
}

/**
 * Export application list as JSON file
 */
export function exportApplicationsToFile(applications: JoinApplication[]): void {
  const json = JSON.stringify(applications, null, 2);
  downloadFile(json, 'applications.json', 'application/json');
}

// ============= Equipment Cache =============

/**
 * Get member's equipment details cache
 */
export async function getEquipmentCache(memberId: string): Promise<EquipmentDetailsCache | null> {
  try {
    const response = await fetch(`/data/${memberId}/equipment_details.json?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();

      // Check data format:
      // New format: {equipment: {...}, skill: {...}, petwing: {...}} (API raw format)
      // Old format: {memberId, lastUpdate, details: [...]} (cache format)

      if (data.equipment && data.equipment.equipmentList) {
        // New format (API raw format) - convert to cache format
        const cache: EquipmentDetailsCache = {
          memberId,
          lastUpdate: new Date().toISOString(),
          details: data.equipment.equipmentList || []
        };
        return cache;
      } else if (data.details && Array.isArray(data.details)) {
        // Old format (cache format) - return directly
        return data;
      }
    }
  } catch (e) {
    console.warn(`Failed to load equipment cache for member ${memberId}`, e);
  }

  // Try from localStorage
  const key = `${STORAGE_KEYS.EQUIPMENT_CACHE}_${memberId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.error('Failed to parse equipment cache');
    }
  }

  return null;
}

/**
 * Save equipment details cache to localStorage
 */
export function saveEquipmentCache(cache: EquipmentDetailsCache): void {
  const key = `${STORAGE_KEYS.EQUIPMENT_CACHE}_${cache.memberId}`;
  localStorage.setItem(key, JSON.stringify(cache));
}

/**
 * Export equipment cache as JSON file
 */
export function exportEquipmentCacheToFile(cache: EquipmentDetailsCache): void {
  const json = JSON.stringify(cache, null, 2);
  downloadFile(json, `${cache.memberId}_equipment_details.json`, 'application/json');
}

// ============= Admin Authentication =============

const ADMIN_PASSWORD = 'chunxia2025';

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Check if logged in
 */
export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_LOGIN) === 'true';
}

/**
 * Admin login
 */
export function adminLogin(password: string): boolean {
  if (verifyAdminPassword(password)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGIN, 'true');
    return true;
  }
  return false;
}

/**
 * Admin logout
 */
export function adminLogout(): void {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGIN);
}

// ============= Utility Functions =============

/**
 * Download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import JSON file
 */
export function importJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (err) {
        reject(new Error('JSON parse failed'));
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file, 'utf-8');
  });
}
