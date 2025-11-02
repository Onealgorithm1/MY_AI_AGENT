import axios from 'axios';
import crypto from 'crypto';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth.js';

export class GoogleOAuthService {
  generateAuthUrl(state, loginHint = null) {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      response_type: 'code',
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    
    if (loginHint) {
      params.append('login_hint', loginHint);
    }
    
    return `${GOOGLE_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
  }
  
  generateStateToken(userId, action = 'connect') {
    const data = JSON.stringify({
      userId,
      action,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    });
    
    return Buffer.from(data).toString('base64url');
  }
  
  parseStateToken(state) {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid state token');
    }
  }
  
  async exchangeCodeForTokens(code) {
    try {
      const params = new URLSearchParams({
        code,
        client_id: GOOGLE_OAUTH_CONFIG.clientId,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
      });
      
      const response = await axios.post(GOOGLE_OAUTH_CONFIG.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        scope: response.data.scope,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }
  
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_OAUTH_CONFIG.clientId,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
        grant_type: 'refresh_token',
      });
      
      const response = await axios.post(GOOGLE_OAUTH_CONFIG.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        scope: response.data.scope,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }
  
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(GOOGLE_OAUTH_CONFIG.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      return {
        googleId: response.data.id,
        email: response.data.email,
        emailVerified: response.data.verified_email,
        name: response.data.name,
        picture: response.data.picture,
        givenName: response.data.given_name,
        familyName: response.data.family_name,
      };
    } catch (error) {
      console.error('Get user info error:', error.response?.data || error.message);
      throw new Error('Failed to get user information');
    }
  }
  
  async revokeToken(token) {
    try {
      await axios.post(`https://oauth2.googleapis.com/revoke?token=${token}`);
      return true;
    } catch (error) {
      console.error('Token revocation error:', error.response?.data || error.message);
      return false;
    }
  }
}

export default new GoogleOAuthService();
