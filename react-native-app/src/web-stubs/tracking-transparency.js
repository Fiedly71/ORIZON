// Web stub for expo-tracking-transparency
export async function requestTrackingPermissionsAsync() {
  return { status: 'unavailable', granted: false, canAskAgain: false };
}
export async function requestTrackingPermissionAsync() {
  return { status: 'unavailable', granted: false, canAskAgain: false };
}
export async function getTrackingPermissionsAsync() {
  return { status: 'unavailable', granted: false, canAskAgain: false };
}
export const PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' };
export default {
  requestTrackingPermissionsAsync,
  requestTrackingPermissionAsync,
  getTrackingPermissionsAsync,
  PermissionStatus,
};
