import { query } from '../utils/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth.js';
import googleOAuthService from './googleOAuth.js';

export class TokenManager {
  async storeTokens(userId, tokens, provider = 'google') {
    const { accessToken, refreshToken, expiresIn, scope, tokenType } = tokens;
    
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    await query(
      `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_type, expires_at, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
         token_type = EXCLUDED.token_type,
         expires_at = EXCLUDED.expires_at,
         scope = EXCLUDED.scope,
         last_refreshed_at = CURRENT_TIMESTAMP`,
      [userId, provider, encryptedAccessToken, encryptedRefreshToken, tokenType, expiresAt, scope]
    );
  }
  
  async getValidToken(userId, provider = 'google') {
    const result = await query(
      'SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tokenData = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const refreshBuffer = new Date(expiresAt.getTime() - GOOGLE_OAUTH_CONFIG.tokenRefreshBuffer);
    
    if (now >= refreshBuffer) {
      if (!tokenData.refresh_token) {
        console.error('⚠️ Token expired with no refresh token available for user:', userId);
        await this.deleteTokens(userId, provider);
        throw new Error('GOOGLE_TOKEN_EXPIRED_RECONNECT_REQUIRED');
      }
      
      try {
        const decryptedRefreshToken = decrypt(tokenData.refresh_token);
        const newTokens = await googleOAuthService.refreshAccessToken(decryptedRefreshToken);
        
        console.log(`✅ Token refreshed successfully for user: ${userId}`);
        
        await this.storeTokens(userId, {
          ...newTokens,
          refreshToken: decryptedRefreshToken,
        }, provider);
        
        return newTokens.accessToken;
      } catch (error) {
        console.error('❌ Token refresh failed for user:', userId, error.message);
        
        await this.deleteTokens(userId, provider);
        
        throw new Error('GOOGLE_TOKEN_REFRESH_FAILED_RECONNECT_REQUIRED');
      }
    }
    
    return decrypt(tokenData.access_token);
  }
  
  async hasValidToken(userId, provider = 'google') {
    try {
      const token = await this.getValidToken(userId, provider);
      return !!token;
    } catch (error) {
      return false;
    }
  }
  
  async deleteTokens(userId, provider = 'google') {
    const result = await query(
      'SELECT access_token, refresh_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (result.rows.length > 0) {
      const { access_token, refresh_token } = result.rows[0];
      
      let accessRevoked = false;
      let refreshRevoked = false;
      
      try {
        const decryptedAccessToken = decrypt(access_token);
        accessRevoked = await googleOAuthService.revokeToken(decryptedAccessToken);
        
        if (accessRevoked) {
          console.log(`✅ Access token revoked successfully for user: ${userId}`);
        } else {
          console.log(`⚠️ Access token revocation returned false for user: ${userId}`);
        }
      } catch (error) {
        console.error('❌ Error revoking access token:', error.message);
      }
      
      if (refresh_token) {
        try {
          const decryptedRefreshToken = decrypt(refresh_token);
          refreshRevoked = await googleOAuthService.revokeToken(decryptedRefreshToken);
          
          if (refreshRevoked) {
            console.log(`✅ Refresh token revoked successfully for user: ${userId}`);
          } else {
            console.log(`⚠️ Refresh token revocation returned false for user: ${userId}`);
          }
        } catch (error) {
          console.error('❌ Error revoking refresh token:', error.message);
        }
      }
      
      console.log(`🗑️ Deleting local tokens for user: ${userId}`);
    }
    
    await query(
      'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    console.log(`✅ Local tokens deleted for user: ${userId}`);
  }
  
  async getTokenInfo(userId, provider = 'google') {
    const result = await query(
      'SELECT expires_at, scope, created_at, last_refreshed_at FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tokenData = result.rows[0];
    return {
      expiresAt: tokenData.expires_at,
      scope: tokenData.scope,
      createdAt: tokenData.created_at,
      lastRefreshedAt: tokenData.last_refreshed_at,
      isExpired: new Date() >= new Date(tokenData.expires_at),
    };
  }
}

export default new TokenManager();
