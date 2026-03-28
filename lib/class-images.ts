import type { ClassKey } from '@/types';

export const CLASS_IMAGES: Record<ClassKey, string> = {
  scout: '/classes/Scout.png',
  soldier: '/classes/Soldier.png',
  pyro: '/classes/Pyro.png',
  demoman: '/classes/Demoman.png',
  heavy: '/classes/Heavy.png',
  engineer: '/classes/Engineer.png',
  medic: '/classes/Medic.png',
  sniper: '/classes/Sniper.png',
  spy: '/classes/Spy.png'
};

export const DEFAULT_CLASS: ClassKey = 'soldier';