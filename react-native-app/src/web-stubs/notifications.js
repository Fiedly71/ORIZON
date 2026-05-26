// Web stub for expo-notifications (no-op, web push not used)
const noopSub = { remove: () => {} };
export async function getPermissionsAsync() { return { status: 'unavailable', granted: false }; }
export async function requestPermissionsAsync() { return { status: 'unavailable', granted: false }; }
export async function getExpoPushTokenAsync() { return { data: '' }; }
export async function getDevicePushTokenAsync() { return { data: '' }; }
export async function setNotificationChannelAsync() { return null; }
export function addNotificationReceivedListener() { return noopSub; }
export function addNotificationResponseReceivedListener() { return noopSub; }
export function addPushTokenListener() { return noopSub; }
export function removeNotificationSubscription() {}
export async function scheduleNotificationAsync() { return ''; }
export async function cancelAllScheduledNotificationsAsync() {}
export async function dismissAllNotificationsAsync() {}
export function setNotificationHandler() {}
export const AndroidImportance = { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 };
export default {
  getPermissionsAsync, requestPermissionsAsync, getExpoPushTokenAsync, getDevicePushTokenAsync,
  setNotificationChannelAsync, addNotificationReceivedListener, addNotificationResponseReceivedListener,
  addPushTokenListener, removeNotificationSubscription, scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync, dismissAllNotificationsAsync, setNotificationHandler,
  AndroidImportance,
};
