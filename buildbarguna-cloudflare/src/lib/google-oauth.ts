import * as oauth from 'oauth4webapi'

/**
 * Google OAuth 2.0 Service with PKCE
 * Handles Google Sign-In/Sign-Up authentication
 */

// Google OAuth configuration
const GOOGLE_ISSUER = new URL('https://accounts.google.com')
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'

export interface Env {
  GOOGLE_CLIENT_ID?: string
}

// Cached authorization server discovery
let cachedAuthorizationServer: oauth.AuthorizationServer | null = null

async function getAuthorizationServer(): Promise<oauth.AuthorizationServer> {
  if (!cachedAuthorizationServer) {
    const response = await oauth.discoveryRequest(GOOGLE_ISSUER)
    const as = await oauth.processDiscoveryResponse(GOOGLE_ISSUER, response)
    cachedAuthorizationServer = as
  }
  return cachedAuthorizationServer
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = oauth.generateRandomCodeVerifier()
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge }
}

/**
 * Generate state parameter for CSRF protection
 */
export function generateState(): string {
  return oauth.generateRandomState()
}

/**
 * Build Google OAuth authorization URL
 */
export async function buildGoogleAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string,
  env?: Env
): Promise<string> {
  const as = await getAuthorizationServer()
  const authorizationUrl = new URL(as.authorization_endpoint!)
  authorizationUrl.searchParams.set('client_id', env?.GOOGLE_CLIENT_ID || '')
  authorizationUrl.searchParams.set('redirect_uri', redirectUri)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('scope', 'openid email profile')
  authorizationUrl.searchParams.set('state', state)
  authorizationUrl.searchParams.set('code_challenge', codeChallenge)
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  authorizationUrl.searchParams.set('access_type', 'offline')
  authorizationUrl.searchParams.set('prompt', 'select_account')

  return authorizationUrl.toString()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  env?: Env
): Promise<oauth.TokenEndpointResponse> {
  const as = await getAuthorizationServer()
  const client = { client_id: env?.GOOGLE_CLIENT_ID || '' }
  
  // Create callback parameters from the authorization code
  const callbackParams = new URLSearchParams()
  callbackParams.set('code', code)
  callbackParams.set('state', '') // State is validated separately
  
  const clientAuth = oauth.ClientSecretPost('')
  
  const tokenResponse = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    callbackParams,
    redirectUri,
    codeVerifier
  )

  return oauth.processAuthorizationCodeResponse(as, client, tokenResponse)
}

/**
 * Fetch user info from Google
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google')
  }

  return response.json()
}

/**
 * Google UserInfo response type
 */
export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
  locale: string
}

/**
 * Store OAuth state in KV for later verification
 * State is stored with 10 minute expiry
 */
export async function storeOAuthState(
  kv: KVNamespace,
  state: string,
  data: { codeVerifier: string; redirectPath?: string }
): Promise<void> {
  await kv.put(`oauth:state:${state}`, JSON.stringify(data), { expirationTtl: 600 })
}

/**
 * Retrieve and delete OAuth state from KV
 */
export async function consumeOAuthState(
  kv: KVNamespace,
  state: string
): Promise<{ codeVerifier: string; redirectPath?: string } | null> {
  const data = await kv.get(`oauth:state:${state}`)
  if (data) {
    await kv.delete(`oauth:state:${state}`)
    return JSON.parse(data)
  }
  return null
}

/**
 * Get Google OAuth redirect URI based on environment
 */
export function getGoogleRedirectUrl(environment?: string): string {
  // Use explicit environment variable if provided
  if (environment === 'production') {
    return 'https://buildbargunainitiative.org/api/auth/google/callback'
  }
  
  // Default to development
  return 'http://localhost:5173/api/auth/google/callback'
}
