let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('emotune:token', { detail: accessToken }));
}

export function clearAccessToken() {
  accessToken = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('emotune:token', { detail: null }));
}
