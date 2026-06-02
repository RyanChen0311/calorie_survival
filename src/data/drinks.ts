import { config } from '../config'
export type { Drink } from '../config'

// DRINKS 指向 config 陣列本身，loadRemoteConfig 原地修改後自動反映
export const DRINKS = config.drinks
