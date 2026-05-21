import * as Haptics from "expo-haptics";

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const selection = () => Haptics.selectionAsync().catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const warning = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
export const error = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
