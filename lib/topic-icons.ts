/**
 * Curated Font Awesome icon set for topic icons.
 *
 * All icons are from @fortawesome/free-solid-svg-icons — fully local,
 * no CDN required. The string key is stored in the database.
 *
 * Categories: work, health, home, learning, finance, social, creative, misc.
 */

import {
  faBriefcase,
  faLaptop,
  faChartBar,
  faEnvelope,
  faPhone,
  faCalendarDays,
  faBuilding,
  faHeart,
  faDumbbell,
  faPersonRunning,
  faPills,
  faBed,
  faHouse,
  faScrewdriverWrench,
  faBroom,
  faUtensils,
  faBook,
  faGraduationCap,
  faPencil,
  faLightbulb,
  faMagnifyingGlass,
  faCoins,
  faPiggyBank,
  faWallet,
  faUsers,
  faComments,
  faPalette,
  faMusic,
  faCamera,
  faPen,
  faStar,
  faFlag,
  faClock,
  faBell,
  faBookmark,
  faFire,
  faRocket,
  faGlobe,
  faLeaf,
  faLayerGroup,
  faFolder,
  faShoppingCart,
  faPlane,
  faCar,
  faBaby,
  faPaw,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * Map from string key (stored in DB) to FA icon definition.
 * Keys are stable — do not rename existing keys.
 */
export const TOPIC_ICONS: Record<string, IconDefinition> = {
  // Work
  briefcase: faBriefcase,
  laptop: faLaptop,
  "chart-bar": faChartBar,
  envelope: faEnvelope,
  phone: faPhone,
  "calendar-days": faCalendarDays,
  building: faBuilding,
  // Health
  heart: faHeart,
  dumbbell: faDumbbell,
  "person-running": faPersonRunning,
  pills: faPills,
  bed: faBed,
  // Home
  house: faHouse,
  "screwdriver-wrench": faScrewdriverWrench,
  broom: faBroom,
  utensils: faUtensils,
  // Learning
  book: faBook,
  "graduation-cap": faGraduationCap,
  pencil: faPencil,
  lightbulb: faLightbulb,
  "magnifying-glass": faMagnifyingGlass,
  // Finance
  coins: faCoins,
  "piggy-bank": faPiggyBank,
  wallet: faWallet,
  // Social
  users: faUsers,
  comments: faComments,
  // Creative
  palette: faPalette,
  music: faMusic,
  camera: faCamera,
  pen: faPen,
  // Misc
  star: faStar,
  flag: faFlag,
  clock: faClock,
  bell: faBell,
  bookmark: faBookmark,
  fire: faFire,
  rocket: faRocket,
  globe: faGlobe,
  leaf: faLeaf,
  "layer-group": faLayerGroup,
  folder: faFolder,
  "shopping-cart": faShoppingCart,
  plane: faPlane,
  car: faCar,
  baby: faBaby,
  paw: faPaw,
};

/** Fallback icon when the stored key is not found (e.g. legacy emoji values). */
export const DEFAULT_TOPIC_ICON_KEY = "folder";

/**
 * Resolves a stored icon key to an FA icon definition.
 * Falls back to the folder icon for legacy emoji strings or unknown keys.
 *
 * @param key - Value stored in the database (e.g. "briefcase", "📁")
 * @returns FA icon definition for rendering with FontAwesomeIcon
 */
export function resolveTopicIcon(key: string | null | undefined): IconDefinition {
  if (!key) return faFolder;
  return TOPIC_ICONS[key] ?? faFolder;
}
