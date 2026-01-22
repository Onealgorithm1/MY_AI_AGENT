import * as samGov from './samGov.js';
import * as fpds from './fpds.js';

/**
 * Get entity profile using a multi-strategy approach.
 * 1. Official SAM.gov Entity API (most detailed, but often restricted/paid).
 * 2. Fallback: FPDS Public Contract History (extracts entity info from recent awards).
 * 
 * @param {string} uei - Vendor UEI
 * @param {string} userId - Requesting user ID
 * @param {string} organizationId - Requesting organization ID
 */
export async function getEntityProfile(uei, userId, organizationId) {
    let source = 'NONE';
    let profile = null;

    // Strategy 1: Official SAM.gov API
    try {
        console.log(`🔍 [EntityService] Trying SAM.gov API for ${uei}...`);
        const samResult = await samGov.getEntityByUEI(uei, userId, organizationId);
        if (samResult.success && samResult.entity) {
            profile = normalizeSamData(samResult.entity);
            source = 'SAM_GOV_API';
        }
    } catch (error) {
        console.warn(`⚠️ [EntityService] SAM.gov API failed (likely permissions): ${error.message}`);
    }

    // Strategy 2: FPDS Fallback (if Strategy 1 failed)
    if (!profile) {
        try {
            console.log(`🔍 [EntityService] Falling back to FPDS for ${uei}...`);
            // Search for recent contracts to extract vendor info
            const fpdsResult = await fpds.searchContractAwards({
                vendorUEI: uei,
                limit: 1 // We just need the latest one to get current info
            }, userId, organizationId);

            if (fpdsResult.success && fpdsResult.contracts && fpdsResult.contracts.length > 0) {
                profile = normalizeFpdsData(fpdsResult.contracts[0]);
                source = 'FPDS_PUBLIC_DATA';
            }
        } catch (error) {
            console.error(`❌ [EntityService] FPDS fallback failed: ${error.message}`);
        }
    }

    if (!profile) {
        return { success: false, message: 'Entity not found in SAM.gov or FPDS records.' };
    }

    return {
        success: true,
        source,
        profile
    };
}

// Helpers to normalize data into a standard "Company Profile" shape

function normalizeSamData(entity) {
    const core = entity.coreData || {};
    const reg = entity.entityRegistration || {};

    return {
        name: reg.legalBusinessName || 'Unknown Vendor',
        dba: reg.dbaName,
        uei: entity.entityRegistration?.ueiSAM,
        cage: core.cageCode,
        address: {
            street: core.physicalAddress?.addressLine1,
            city: core.physicalAddress?.city,
            state: core.physicalAddress?.stateOrProvinceCode,
            zip: core.physicalAddress?.zipCode,
            country: core.physicalAddress?.countryCode
        },
        businessTypes: core.businessTypes || [], // e.g. "23 - Minority Owned Business"
        expiryDate: reg.expirationDate,
        description: 'Sourced from SAM.gov Entity Registration'
    };
}

function normalizeFpdsData(contract) {
    // Extract info from the contract award object
    // Note: FPDS data structure varies slightly by endpoint version, adjusting for standard fields

    const busTypes = [];
    if (contract.smallBusinessCompetitiveFlag === 'Y' || contract.small_business_competitive) busTypes.push('Small Business');
    if (contract.womenOwnedSmallBusinessFlag === 'Y' || contract.woman_owned_small_business) busTypes.push('Woman Owned');
    if (contract.serviceDisabledVeteranOwnedBusinessFlag === 'Y' || contract.service_disabled_veteran_owned_business) busTypes.push('Service Disabled Veteran Owned');
    if (contract.eightAFlag === 'Y' || contract.eight_a_program_participant) busTypes.push('8(a) Program Participant');

    return {
        name: contract.vendorName || contract.vendor_name || 'Unknown Vendor',
        dba: null, // FPDS doesn't usually provide DBA
        uei: contract.vendorUeiSAM || contract.vendor_uei,
        cage: contract.vendorCageCode || contract.vendor_cage_code,
        address: {
            street: null,
            city: contract.vendorLocationCity || contract.vendor_city,
            state: contract.vendorLocationState || contract.vendor_state,
            zip: contract.vendorLocationZip || contract.vendor_zip,
            country: contract.vendorLocationCountry || contract.vendor_country
        },
        businessTypes: busTypes,
        expiryDate: null, // Cannot determine registration expiry from a contract
        description: 'Profile constructed from public contract award history.'
    };
}

export default {
    getEntityProfile
};
