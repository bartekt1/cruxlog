import { flavorOf } from '../domain/flavor';

/** This build's flavor (see src/domain/flavor.ts); the value is fixed when the app is built. */
export const FLAVOR = flavorOf(process.env.EXPO_PUBLIC_FLAVOR);
