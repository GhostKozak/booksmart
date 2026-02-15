/**
 * URL Cleaner - Removes tracking/UTM parameters from URLs
 * Supports exact match, prefix match, and domain-specific rules
 */

// Known tracking parameters to remove (exact match)
const TRACKING_PARAMS = new Set([
    // UTM parameters
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',

    // Google
    'gclid', 'gclsrc', 'dclid', '_ga', '_gl', '_gac',

    // Facebook / Meta
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',

    // Microsoft / Bing
    'msclkid',

    // Yandex
    'yclid', 'ymclid', '_openstat',

    // Mailchimp
    'mc_cid', 'mc_eid',

    // HubSpot
    'hsa_cam', 'hsa_grp', 'hsa_mt', 'hsa_src', 'hsa_ad', 'hsa_acc',
    'hsa_net', 'hsa_ver', 'hsa_la', 'hsa_ol', 'hsa_kw',
    '__hstc', '__hssc', '__hsfp', 'hsCtaTracking',

    // Marketo
    'mkt_tok',

    // Adobe
    's_kwcid', 'ef_id',

    // General trackers
    'ref', '_ref', 'ref_', 'referrer',
    'zanpid', 'irclickid',
    'twclid', // Twitter
    'igshid', // Instagram
    'li_fat_id', // LinkedIn

    // Misc tracking
    'si', 'feature', 'app',
    'nd', 'sref',

    // AliExpress / Alibaba / Taobao
    'spm', 'scm', 'scm_id', 'pvid', 'algo_pvid', 'algo_exp_id',
    'gps-id', 'pdp_ext_f', 'pdp_npi', 'pdp_pi',
    'utparam-url', 'curPageLogUid', 'aff_fcid', 'aff_fsk',
    'aff_platform', 'aff_trace_key', 'terminal_id',
    'sk', 'aff_short_key', 'isdl',
    '_t', 'tpp_buckets', 'tpp_rcmd_bucket_id',
    'scenario', 'fromPage',

    // Amazon
    'tag', 'linkCode', 'linkId', 'ascsubtag', 'camp', 'creative',
    'th', 'psc', 'smid', 'spIA', 'qualifier',
    '_encoding', 'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg',
    'pf_rd_i', 'pf_rd_m', 'pf_rd_p', 'pf_rd_r', 'pf_rd_s', 'pf_rd_t',
    'content-id', 'colid', 'coliid',

    // eBay
    'mkrid', 'mkcid', 'mkevt', 'campid', 'toolid', 'customid',
    'amdata', 'norover', 'orig_cvip',

    // YouTube specific
    'pp', 'ab_channel',

    // Shopify
    'variant', 'currency', 'srsltid',

    // General e-commerce / ads
    'clickid', 'click_id', 'campaign_id', 'ad_id', 'adgroup_id',
    'network', 'placement', 'matchtype', 'device',
    'gc_id', 'h_ad_id', 'gad_source',
]);

// Prefix-based patterns - any param starting with these will be removed
const TRACKING_PREFIXES = [
    'utm_',
    'scm-', 'scm_',
    'pdp_',
    'pf_rd_', 'pd_rd_',
    'hsa_',
    'aff_',
    'tpp_',
    'fb_',
    '__hs',
    'mc_',
    'mtm_', // Matomo
    'pk_',  // Piwik
    'stm_', // Some trackers
    'vero_',
    'oly_',
    'wickedid',
    'browser_id',
    '_branch_',
    'trk_',
];

// Domain-specific rules: for these domains, ONLY keep the listed params (whitelist)
// Everything else gets stripped
const DOMAIN_WHITELIST_RULES = {
    'aliexpress.com': [], // AliExpress items don't need any query params
    'temu.com': [],
    'shein.com': [],
};

// Domain-specific blacklist: for these domains, also remove these specific params
const DOMAIN_EXTRA_BLACKLIST = {
    'amazon.com': ['ref', 'ref_', 'sprefix', 'crid', 'keywords', 'dib', 'dib_tag', 'hvadid', 'hvdev', 'hvlocphy', 'hvnetw', 'hvqmt', 'hvrand', 'hvtargid'],
    'amazon.co.uk': ['ref', 'ref_', 'sprefix', 'crid', 'keywords', 'dib', 'dib_tag'],
    'amazon.de': ['ref', 'ref_', 'sprefix', 'crid', 'keywords', 'dib', 'dib_tag'],
    'youtube.com': ['si', 'feature', 'app'],
    'youtu.be': ['si', 'feature'],
};

/**
 * Check if a hostname matches a domain rule (handles subdomains)
 */
function matchesDomain(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
}

/**
 * Find matching domain rule
 */
function findDomainRule(hostname, rules) {
    for (const domain of Object.keys(rules)) {
        if (matchesDomain(hostname, domain)) {
            return rules[domain];
        }
    }
    return null;
}

/**
 * Check if a parameter key matches any tracking prefix
 */
function matchesTrackingPrefix(key) {
    const lowerKey = key.toLowerCase();
    for (const prefix of TRACKING_PREFIXES) {
        if (lowerKey.startsWith(prefix)) return true;
    }
    return false;
}

/**
 * Clean a single URL by removing tracking parameters
 * @param {string} urlString - The URL to clean
 * @returns {{ cleaned: string, changed: boolean }}
 */
export function cleanUrl(urlString) {
    if (!urlString) return { cleaned: urlString, changed: false };

    try {
        const url = new URL(urlString);

        // Skip non-http(s) URLs
        if (!url.protocol.startsWith('http')) {
            return { cleaned: urlString, changed: false };
        }

        // No params to clean
        if (url.search === '') {
            return { cleaned: urlString, changed: false };
        }

        const hostname = url.hostname.toLowerCase();

        // Check domain-specific whitelist rules (aggressive cleaning)
        const whitelist = findDomainRule(hostname, DOMAIN_WHITELIST_RULES);
        if (whitelist !== null) {
            // Only keep whitelisted params, strip everything else
            const paramsToKeep = new URLSearchParams();
            for (const key of whitelist) {
                if (url.searchParams.has(key)) {
                    paramsToKeep.set(key, url.searchParams.get(key));
                }
            }
            url.search = paramsToKeep.toString();

            let cleaned = url.toString();
            if (cleaned.endsWith('?')) cleaned = cleaned.slice(0, -1);

            return { cleaned, changed: cleaned !== urlString };
        }

        // Standard cleaning: remove known tracking params
        const paramsToDelete = [];
        const domainBlacklist = findDomainRule(hostname, DOMAIN_EXTRA_BLACKLIST);
        const domainBlacklistSet = domainBlacklist ? new Set(domainBlacklist) : null;

        for (const key of url.searchParams.keys()) {
            const lowerKey = key.toLowerCase();
            if (
                TRACKING_PARAMS.has(lowerKey) ||
                TRACKING_PARAMS.has(key) ||
                matchesTrackingPrefix(key) ||
                (domainBlacklistSet && domainBlacklistSet.has(lowerKey))
            ) {
                paramsToDelete.push(key);
            }
        }

        if (paramsToDelete.length === 0) {
            return { cleaned: urlString, changed: false };
        }

        paramsToDelete.forEach(key => url.searchParams.delete(key));

        // Remove trailing '?' if no params left
        let cleaned = url.toString();
        if (cleaned.endsWith('?')) {
            cleaned = cleaned.slice(0, -1);
        }

        return { cleaned, changed: true };
    } catch {
        // Invalid URL, return as-is
        return { cleaned: urlString, changed: false };
    }
}

/**
 * Analyze URLs and return count of cleanable ones
 * @param {Array} bookmarks
 * @returns {number}
 */
export function countCleanableUrls(bookmarks) {
    let count = 0;
    for (const b of bookmarks) {
        const { changed } = cleanUrl(b.url);
        if (changed) count++;
    }
    return count;
}
