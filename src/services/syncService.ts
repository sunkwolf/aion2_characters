// Data sync service - Call AION2 API through proxy

import type { MemberConfig } from '../types/admin';

// Development uses proxy, production needs backend support
const API_PROXY_PREFIX = '/api/aion2';

/**
 * Delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send request through proxy
 */
async function fetchWithProxy(url: string): Promise<any> {
  // Convert full URL to proxy URL
  // Example: https://tw.ncsoft.com/aion2/api/character/info?lang=en&characterId=...&serverId=...
  // Converts to: /api/aion2/character/info?lang=en&characterId=...&serverId=...

  let proxyUrl: string;

  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    // pathname: /aion2/api/character/info
    // Need to remove /aion2/api prefix as proxy will add it automatically
    const apiPath = urlObj.pathname.replace('/aion2/api', '');
    proxyUrl = `${API_PROXY_PREFIX}${apiPath}${urlObj.search}`;
  } else if (url.startsWith('/api/aion2')) {
    // Already in proxy URL format
    proxyUrl = url;
  } else {
    // Other formats, assume relative path
    proxyUrl = `${API_PROXY_PREFIX}${url}`;
  }

  console.log('Original URL:', url);
  console.log('Proxy URL:', proxyUrl);

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get character info
 */
async function getCharacterInfo(member: MemberConfig): Promise<any> {
  if (!member.characterId || !member.serverId) {
    throw new Error('Character info not configured (characterId or serverId)');
  }

  console.log(`[${member.name}] Step 1/3: Requesting character info...`);

  // Use backend proxy API
  const response = await fetch(
    `/api/character/info?characterId=${encodeURIComponent(member.characterId)}&serverId=${member.serverId}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get character equipment list
 */
async function getCharacterEquipment(member: MemberConfig): Promise<any> {
  if (!member.characterId || !member.serverId) {
    throw new Error('Character info not configured (characterId or serverId)');
  }

  console.log(`[${member.name}] Step 2/3: Requesting equipment list...`);

  // Build equipment list URL
  const url = `${API_PROXY_PREFIX}/character/equipment?lang=en&characterId=${encodeURIComponent(member.characterId)}&serverId=${member.serverId}`;
  return await fetchWithProxy(url);
}

/**
 * Get equipment detail
 */
async function getEquipmentDetail(
  itemId: number,
  enchantLevel: number,
  slotPos: number,
  member: MemberConfig
): Promise<any> {
  if (!member.characterId || !member.serverId) {
    throw new Error('Character info not configured (characterId or serverId)');
  }

  // Build equipment detail URL
  const url = `/api/aion2/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${encodeURIComponent(member.characterId)}&serverId=${member.serverId}&slotPos=${slotPos}&lang=en`;

  console.log(`[${member.name}] Requesting equipment detail: itemId=${itemId}, slotPos=${slotPos}`);
  return await fetchWithProxy(url);
}

/**
 * Sync single member's data
 */
export async function syncMemberData(
  member: MemberConfig,
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{
  success: boolean;
  characterInfo?: any;
  equipmentData?: any;
  equipmentDetails?: any[];
  error?: string;
}> {
  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[${member.name}] ${message}`);
    onProgress?.(message, type);
  };

  try {
    log(`Starting sync for member: ${member.name} (${member.id})`, 'info');

    // 1. Get character info
    const characterInfo = await getCharacterInfo(member);
    await delay(300);
    log('✓ Character info retrieved successfully', 'success');

    // 2. Get equipment list
    const equipmentData = await getCharacterEquipment(member);
    await delay(300);
    log('✓ Equipment list retrieved successfully', 'success');

    // 3. Get equipment details
    const equipmentList = equipmentData?.equipment?.equipmentList || [];

    if (equipmentList.length === 0) {
      log('This character has no equipment', 'info');
      return {
        success: true,
        characterInfo,
        equipmentData,
        equipmentDetails: [],
      };
    }

    log(`Step 3/3: Getting equipment details (${equipmentList.length} items total)...`, 'info');

    const equipmentDetails: any[] = [];

    for (const equip of equipmentList) {
      try {
        // Calculate total enchant level
        const totalEnchantLevel = (equip.enchantLevel || 0) + (equip.exceedLevel || 0);

        const detail = await getEquipmentDetail(
          equip.id,
          totalEnchantLevel,
          equip.slotPos,
          member
        );

        // Merge original equipment slotPos and slotPosName into detail
        const enrichedDetail = {
          ...detail,
          slotPos: equip.slotPos,
          slotPosName: equip.slotPosName
        };

        equipmentDetails.push(enrichedDetail);
        log(`✓ ${equip.slotPosName || equip.slotPos}: ${detail.name || equip.name}`, 'success');
        await delay(300);
      } catch (error: any) {
        log(`✗ ${equip.slotPosName || equip.slotPos}: ${error.message}`, 'error');
      }
    }

    log(`✓ Successfully retrieved ${equipmentDetails.length}/${equipmentList.length} equipment details`, 'success');

    // 4. Save to server file system
    try {
      log('Saving to server...', 'info');

      // Save character info
      const characterResponse = await fetch(`/api/members/${encodeURIComponent(member.id)}/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterInfo),
      });

      if (!characterResponse.ok) {
        throw new Error(`Failed to save character info: ${characterResponse.statusText}`);
      }

      // Save equipment data - merge equipment details into equipmentList
      const enrichedEquipmentData = {
        ...equipmentData,
        equipment: {
          ...equipmentData.equipment,
          equipmentList: equipmentDetails.length > 0 ? equipmentDetails : equipmentData.equipment.equipmentList
        }
      };

      const equipmentResponse = await fetch(`/api/members/${encodeURIComponent(member.id)}/equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrichedEquipmentData),
      });

      if (!equipmentResponse.ok) {
        throw new Error(`Failed to save equipment details: ${equipmentResponse.statusText}`);
      }

      log('✓ Data saved to server file system', 'success');
    } catch (saveError: any) {
      log('⚠ Failed to save to server, but data saved to local storage', 'info');
      console.warn('Failed to save to server:', saveError.message);
    }

    log(`✓ Sync complete: ${member.name}`, 'success');

    return {
      success: true,
      characterInfo,
      equipmentData,
      equipmentDetails,
    };

  } catch (error: any) {
    log(`✗ Sync failed: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch sync multiple members' data
 */
export async function syncAllMembers(
  members: MemberConfig[],
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Map<string, any>;
}> {
  const results = new Map<string, any>();
  let successCount = 0;
  let failedCount = 0;

  onProgress?.(`Starting batch sync for ${members.length} members...`, 'info');

  for (const member of members) {
    const result = await syncMemberData(member, onProgress);
    results.set(member.id, result);

    if (result.success) {
      successCount++;

      // Save to localStorage
      if (result.characterInfo) {
        localStorage.setItem(
          `aion2_character_${member.id}`,
          JSON.stringify(result.characterInfo)
        );
      }

      if (result.equipmentDetails) {
        localStorage.setItem(
          `aion2_equipment_${member.id}`,
          JSON.stringify({
            memberId: member.id,
            lastUpdate: new Date().toISOString(),
            details: result.equipmentDetails,
          })
        );
      }
    } else {
      failedCount++;
    }

    // Delay between members
    await delay(500);
  }

  onProgress?.(
    `Sync complete: Success ${successCount} / Failed ${failedCount} / Total ${members.length}`,
    successCount === members.length ? 'success' : 'info'
  );

  return {
    total: members.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}
