/**
 * API utility helper for making requests to backend
 */

// Get the backend API base URL
export function getApiUrl(): string {
  // Use relative /api - nginx will proxy to backend via Railway internal network
  return "/api";
}
