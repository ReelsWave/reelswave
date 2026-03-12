import { Late } from '@getlatedev/node';
import dotenv from 'dotenv';

dotenv.config();

const late = new Late({
    apiKey: process.env.LATE_DEV_API_KEY
});

/**
 * Create a new Late.dev profile for a user
 * @param {string} userId - The user's internal ID
 * @returns {Promise<string>} - The new profile ID
 */
export async function createLateProfile(userId) {
    try {
        const res = await late.profiles.createProfile({
            body: {
                name: `ReelsWave User ${userId}`,
                description: 'Created via ReelsWave Automation'
            }
        });
        // API returns { message, profile: { _id, ... } }
        return res.data?.profile?._id || res.data?._id;
    } catch (err) {
        console.error('Late.dev createProfile error:', err);
        throw new Error(`Failed to create Late.dev profile: ${err.message || err.toString()}`);
    }
}

/**
 * Generate an OAuth connection link for a specific platform
 * @param {string} profileId - The Late.dev profile ID
 * @param {string} platform - 'tiktok', 'youtube', 'instagram', etc.
 * @returns {Promise<string>} - The auth URL
 */
export async function getConnectUrl(profileId, platform) {
    try {
        const result = await late.connect.getConnectUrl({
            path: { platform },
            query: {
                profileId,
                redirect_url: `${process.env.FRONTEND_URL}/settings?connected=${platform}`
            }
        });

        // The authUrl is inside data
        return result.data?.authUrl;
    } catch (err) {
        console.error('Late.dev getConnectUrl error:', err);
        throw new Error(`Failed to generate connection link: ${err.message || err.toString()}`);
    }
}

/**
 * Upload and post a video to connected social accounts
 * @param {Object} params
 * @param {string[]} params.profileIds - Array of Late.dev profile IDs to post to
 * @param {string} params.videoUrl - Public URL of the video
 * @param {string} params.text - Caption/description for the post
 * @returns {Promise<Object>} - The created post object
 */
export async function uploadVideo({ profileIds, videoUrl, text }) {
    try {
        if (!profileIds || profileIds.length === 0) {
            throw new Error('No social profiles connected');
        }

        const result = await late.posts.createPost({
            body: {
                profileIds,
                content: text,
                mediaItems: [
                    {
                        type: 'video',
                        url: videoUrl
                    }
                ]
            }
        });

        return result;
    } catch (err) {
        console.error('Late.dev uploadVideo error:', err.message);
        throw new Error(`Failed to post video: ${err.message}`);
    }
}

/**
 * Get connected profiles/accounts for a specific Late.dev profile ID
 * @param {string} profileId - The Late.dev profile ID
 * @returns {Promise<Array>} - List of connected social accounts
 */
export async function getConnectedProfiles(profileId) {
    try {
        if (!profileId) return [];
        const accounts = await late.accounts.listAccounts({
            query: { profileId }
        });
        return accounts.data?.accounts || [];
    } catch (err) {
        console.error('Late.dev getConnectedProfiles error:', err.message);
        return [];
    }
}

/**
 * Disconnect (delete) a connected social account
 * @param {string} accountId - The Late.dev account ID to remove
 */
export async function disconnectAccount(accountId) {
    try {
        console.log('[disconnectAccount] calling Late.dev with accountId:', accountId);
        const res = await late.accounts.deleteAccount({
            path: { accountId }
        });
        console.log('[disconnectAccount] Late.dev response:', JSON.stringify(res?.data));
    } catch (err) {
        console.error('[disconnectAccount] Late.dev full error:', JSON.stringify(err?.response?.data || err?.message || err));
        throw new Error(`Failed to disconnect account: ${err?.response?.data?.message || err.message}`);
    }
}

