import { getAssetPath } from '@/lib/asset-path';
import type { ClassKey } from '@/types';

export const CLASS_IMAGES: Record<ClassKey, string> = {
  scout: getAssetPath('classes/Scout.png'),
  soldier: getAssetPath('classes/Soldier.png'),
  pyro: getAssetPath('classes/Pyro.png'),
  demoman: getAssetPath('classes/Demoman.png'),
  heavy: getAssetPath('classes/Heavy.png'),
  engineer: getAssetPath('classes/Engineer.png'),
  medic: getAssetPath('classes/Medic.png'),
  sniper: getAssetPath('classes/Sniper.png'),
  spy: getAssetPath('classes/Spy.png')
};

export const DEFAULT_CLASS: ClassKey = 'soldier';
