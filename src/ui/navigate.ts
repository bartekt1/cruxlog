import { Alert, Linking, Platform } from 'react-native';
import { navigationUrl, type LatLng } from '../domain/geo';
import i18n from '../i18n';
import { ask } from './confirm';

/**
 * Opens the phone's navigation app with the crag as the destination; the route is that app's. For an approximate position
 * it first warns that it leads to the area, not to the wall.
 */
export async function navigateTo(at: LatLng, name: string, approx: boolean): Promise<void> {
  const t = i18n.t.bind(i18n);
  if (approx && !(await ask(t('map.navigateApproxTitle'), t('map.navigateApprox'), t('map.navigate'), t('common.cancel')))) return;
  try {
    await Linking.openURL(navigationUrl(at, name, Platform.OS === 'ios' ? 'ios' : 'android'));
  } catch {
    Alert.alert(t('map.navigate'), t('map.navigateNoApp'));
  }
}
