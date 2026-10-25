import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Alert, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import i18n from '../i18n';

/** Width of the sent picture in pixels; the height follows the card's ratio. */
export const OUT_WIDTH = 1080;

/** Saves the card in `ref` as a sharp PNG and opens the phone's share sheet; a failure is shown. */
export async function shareCardImage(ref: RefObject<View | null>, ratio: number): Promise<void> {
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: OUT_WIDTH, height: OUT_WIDTH * ratio });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: i18n.t('share.title') });
  } catch {
    Alert.alert(i18n.t('share.title'), i18n.t('share.failed'));
  }
}
