export interface AnimeArcDefinition {
  name: string;
  shortName?: string;
  seasonNumber?: number;
  startEp: number;
  endEp: number;
}

// Pre-defined story arcs for major continuous and multi-arc anime
const POPULAR_ANIME_ARCS: Record<string, AnimeArcDefinition[]> = {
  // One Piece
  "one piece": [
    { name: "East Blue Arc", shortName: "East Blue", seasonNumber: 1, startEp: 1, endEp: 61 },
    { name: "Entering into the Grand Line", shortName: "Grand Line", seasonNumber: 2, startEp: 62, endEp: 77 },
    { name: "Drum Island Arc", shortName: "Drum Island", seasonNumber: 3, startEp: 78, endEp: 92 },
    { name: "Alabasta Arc", shortName: "Alabasta", seasonNumber: 4, startEp: 93, endEp: 130 },
    { name: "Post-Alabasta & Dreams", shortName: "Post-Alabasta", seasonNumber: 5, startEp: 131, endEp: 143 },
    { name: "Jaya & Skypiea Arc", shortName: "Skypiea", seasonNumber: 6, startEp: 144, endEp: 195 },
    { name: "G-8 & Long Ring Long Land", shortName: "G-8 & Foxy", seasonNumber: 7, startEp: 196, endEp: 228 },
    { name: "Water 7 Arc", shortName: "Water 7", seasonNumber: 8, startEp: 229, endEp: 263 },
    { name: "Enies Lobby Arc", shortName: "Enies Lobby", seasonNumber: 9, startEp: 264, endEp: 336 },
    { name: "Thriller Bark Arc", shortName: "Thriller Bark", seasonNumber: 10, startEp: 337, endEp: 381 },
    { name: "Sabaody Archipelago Arc", shortName: "Sabaody", seasonNumber: 11, startEp: 382, endEp: 405 },
    { name: "Amazon Lily Arc", shortName: "Amazon Lily", seasonNumber: 12, startEp: 406, endEp: 421 },
    { name: "Impel Down Arc", shortName: "Impel Down", seasonNumber: 13, startEp: 422, endEp: 458 },
    { name: "Marineford (Summit War) Arc", shortName: "Marineford", seasonNumber: 14, startEp: 459, endEp: 516 },
    { name: "Fish-Man Island Arc", shortName: "Fish-Man", seasonNumber: 15, startEp: 517, endEp: 574 },
    { name: "Punk Hazard Arc", shortName: "Punk Hazard", seasonNumber: 16, startEp: 575, endEp: 628 },
    { name: "Dressrosa Arc", shortName: "Dressrosa", seasonNumber: 17, startEp: 629, endEp: 746 },
    { name: "Zou Arc", shortName: "Zou", seasonNumber: 18, startEp: 747, endEp: 782 },
    { name: "Whole Cake Island Arc", shortName: "Whole Cake", seasonNumber: 19, startEp: 783, endEp: 877 },
    { name: "Levely Arc", shortName: "Levely", seasonNumber: 20, startEp: 878, endEp: 891 },
    { name: "Wano Country Arc", shortName: "Wano", seasonNumber: 21, startEp: 892, endEp: 1085 },
    { name: "Egghead Island Arc", shortName: "Egghead", seasonNumber: 22, startEp: 1086, endEp: 2000 },
  ],

  // Naruto (Part 1)
  "naruto": [
    { name: "Prologue: Land of Waves", shortName: "Land of Waves", seasonNumber: 1, startEp: 1, endEp: 19 },
    { name: "Chūnin Exams Arc", shortName: "Chunin Exams", seasonNumber: 2, startEp: 20, endEp: 67 },
    { name: "Konoha Crush Arc", shortName: "Konoha Crush", seasonNumber: 3, startEp: 68, endEp: 80 },
    { name: "Search for Tsunade Arc", shortName: "Search for Tsunade", seasonNumber: 4, startEp: 81, endEp: 100 },
    { name: "Sasuke Recovery Mission Arc", shortName: "Sasuke Retrieval", seasonNumber: 5, startEp: 107, endEp: 135 },
    { name: "Original Filler Arcs", shortName: "Ninja Missions", seasonNumber: 6, startEp: 136, endEp: 220 },
  ],

  // Naruto Shippuden
  "naruto shippuden": [
    { name: "Kazekage Rescue Mission", shortName: "Kazekage Rescue", seasonNumber: 1, startEp: 1, endEp: 32 },
    { name: "Tenchi Bridge Reconnaissance", shortName: "Tenchi Bridge", seasonNumber: 2, startEp: 33, endEp: 53 },
    { name: "Twelve Guardian Ninja", shortName: "Guardian Ninja", seasonNumber: 3, startEp: 54, endEp: 71 },
    { name: "Immortal Devastators: Hidan & Kakuzu", shortName: "Hidan & Kakuzu", seasonNumber: 4, startEp: 72, endEp: 88 },
    { name: "Three-Tails' Appearance", shortName: "Three-Tails", seasonNumber: 5, startEp: 89, endEp: 112 },
    { name: "Itachi Pursuit & Tale of Jiraiya", shortName: "Master's Prophecy", seasonNumber: 6, startEp: 113, endEp: 143 },
    { name: "Six-Tails Unleashed", shortName: "Six-Tails", seasonNumber: 7, startEp: 144, endEp: 151 },
    { name: "Two Saviors: Pain's Assault", shortName: "Pain's Assault", seasonNumber: 8, startEp: 152, endEp: 175 },
    { name: "Five Kage Summit Arc", shortName: "Five Kage Summit", seasonNumber: 9, startEp: 197, endEp: 214 },
    { name: "Fourth Shinobi World War: Countdown", shortName: "War Countdown", seasonNumber: 10, startEp: 215, endEp: 260 },
    { name: "Fourth Shinobi World War: Confrontation", shortName: "War: Confrontation", seasonNumber: 11, startEp: 261, endEp: 320 },
    { name: "Fourth Shinobi World War: Climax", shortName: "War: Climax", seasonNumber: 12, startEp: 321, endEp: 375 },
    { name: "Birth of the Ten-Tails' Jinchūriki", shortName: "Ten-Tails", seasonNumber: 13, startEp: 376, endEp: 413 },
    { name: "Kaguya Ōtsutsuki Strikes & Final Battle", shortName: "Final Battle", seasonNumber: 14, startEp: 458, endEp: 479 },
    { name: "Konoha Hiden & Epilogue", shortName: "Epilogue", seasonNumber: 15, startEp: 480, endEp: 500 },
  ],

  // Bleach
  "bleach": [
    { name: "Substitute Shinigami Arc", shortName: "Substitute", seasonNumber: 1, startEp: 1, endEp: 20 },
    { name: "Soul Society: Sneak Entry Arc", shortName: "SS: Sneak Entry", seasonNumber: 2, startEp: 21, endEp: 41 },
    { name: "Soul Society: The Rescue Arc", shortName: "SS: The Rescue", seasonNumber: 3, startEp: 42, endEp: 63 },
    { name: "The Bount Arc", shortName: "The Bount", seasonNumber: 4, startEp: 64, endEp: 109 },
    { name: "Arrancar: The Arrival Arc", shortName: "Arrancar Arrival", seasonNumber: 5, startEp: 110, endEp: 131 },
    { name: "Arrancar: Hueco Mundo Sneak Entry", shortName: "Hueco Mundo", seasonNumber: 6, startEp: 132, endEp: 151 },
    { name: "Arrancar: The Fierce Fight Arc", shortName: "Fierce Fight", seasonNumber: 7, startEp: 152, endEp: 167 },
    { name: "The New Captain Shūsuke Amagai", shortName: "Captain Amagai", seasonNumber: 8, startEp: 168, endEp: 189 },
    { name: "Arrancar: Decisive Battle of Karakura", shortName: "Fake Karakura", seasonNumber: 9, startEp: 190, endEp: 229 },
    { name: "Zanpakutō: The Alternate Tale Arc", shortName: "Zanpakuto Tale", seasonNumber: 10, startEp: 230, endEp: 265 },
    { name: "Arrancar: Downfall Arc (Aizen's Defeat)", shortName: "Arrancar Downfall", seasonNumber: 11, startEp: 266, endEp: 316 },
    { name: "Gotei 13 Invading Army Arc", shortName: "Invading Army", seasonNumber: 12, startEp: 317, endEp: 342 },
    { name: "The Lost Substitute Shinigami (Fullbring)", shortName: "Fullbring Arc", seasonNumber: 13, startEp: 343, endEp: 366 },
    { name: "Thousand-Year Blood War (TYBW)", shortName: "TYBW", seasonNumber: 14, startEp: 367, endEp: 500 },
  ],

  // Hunter x Hunter (2011)
  "hunter x hunter": [
    { name: "Hunter Exam Arc", shortName: "Hunter Exam", seasonNumber: 1, startEp: 1, endEp: 26 },
    { name: "Heavens Arena Arc", shortName: "Heavens Arena", seasonNumber: 2, startEp: 27, endEp: 38 },
    { name: "Yorknew City (Phantom Rouge) Arc", shortName: "Yorknew City", seasonNumber: 3, startEp: 39, endEp: 58 },
    { name: "Greed Island Arc", shortName: "Greed Island", seasonNumber: 4, startEp: 59, endEp: 75 },
    { name: "Chimera Ant Arc", shortName: "Chimera Ant", seasonNumber: 5, startEp: 76, endEp: 136 },
    { name: "13th Hunter Chairman Election Arc", shortName: "Election Arc", seasonNumber: 6, startEp: 137, endEp: 148 },
  ],

  // Dragon Ball Z
  "dragon ball z": [
    { name: "Saiyan Saga (Raditz & Vegeta)", shortName: "Saiyan Saga", seasonNumber: 1, startEp: 1, endEp: 35 },
    { name: "Namek & Captain Ginyu Saga", shortName: "Namek Saga", seasonNumber: 2, startEp: 36, endEp: 74 },
    { name: "Frieza Saga", shortName: "Frieza Saga", seasonNumber: 3, startEp: 75, endEp: 107 },
    { name: "Garlic Jr. Saga", shortName: "Garlic Jr.", seasonNumber: 4, startEp: 108, endEp: 117 },
    { name: "Androids Saga & Imperfect Cell", shortName: "Androids Saga", seasonNumber: 5, startEp: 118, endEp: 152 },
    { name: "Cell Games Saga", shortName: "Cell Games", seasonNumber: 6, startEp: 153, endEp: 194 },
    { name: "Great Saiyaman & World Tournament", shortName: "Tournament", seasonNumber: 7, startEp: 195, endEp: 219 },
    { name: "Majin Buu Saga", shortName: "Majin Buu", seasonNumber: 8, startEp: 220, endEp: 253 },
    { name: "Fusion & Kid Buu Saga", shortName: "Kid Buu", seasonNumber: 9, startEp: 254, endEp: 291 },
  ],

  // Dragon Ball Super
  "dragon ball super": [
    { name: "God of Destruction Beerus Saga", shortName: "Battle of Gods", seasonNumber: 1, startEp: 1, endEp: 14 },
    { name: "Golden Frieza Saga", shortName: "Resurrection F", seasonNumber: 2, startEp: 15, endEp: 27 },
    { name: "Universe 6 Saga (Champa Tournament)", shortName: "Universe 6", seasonNumber: 3, startEp: 28, endEp: 46 },
    { name: "Future Trunks & Goku Black Saga", shortName: "Goku Black", seasonNumber: 4, startEp: 47, endEp: 76 },
    { name: "Universe Survival (Tournament of Power)", shortName: "Tournament of Power", seasonNumber: 5, startEp: 77, endEp: 131 },
  ],

  // Demon Slayer
  "demon slayer": [
    { name: "Tanjiro Kamado, Unwavering Resolve Arc", shortName: "Season 1", seasonNumber: 1, startEp: 1, endEp: 26 },
    { name: "Mugen Train Arc", shortName: "Mugen Train", seasonNumber: 2, startEp: 27, endEp: 33 },
    { name: "Entertainment District Arc", shortName: "Entertainment District", seasonNumber: 3, startEp: 34, endEp: 44 },
    { name: "Swordsmith Village Arc", shortName: "Swordsmith Village", seasonNumber: 4, startEp: 45, endEp: 55 },
    { name: "Hashira Training Arc", shortName: "Hashira Training", seasonNumber: 5, startEp: 56, endEp: 63 },
    { name: "Infinity Castle Arc", shortName: "Infinity Castle", seasonNumber: 6, startEp: 64, endEp: 100 },
  ],

  // Jujutsu Kaisen
  "jujutsu kaisen": [
    { name: "Season 1: Fearsome Womb & Kyoto Goodwill Event", shortName: "Season 1", seasonNumber: 1, startEp: 1, endEp: 24 },
    { name: "Hidden Inventory / Premature Death Arc", shortName: "Hidden Inventory", seasonNumber: 2, startEp: 25, endEp: 29 },
    { name: "Shibuya Incident Arc", shortName: "Shibuya Incident", seasonNumber: 3, startEp: 30, endEp: 47 },
    { name: "Culling Game Arc", shortName: "Culling Game", seasonNumber: 4, startEp: 48, endEp: 75 },
  ],

  // Attack on Titan
  "attack on titan": [
    { name: "Season 1: Fall of Shiganshina & Female Titan", shortName: "Season 1", seasonNumber: 1, startEp: 1, endEp: 25 },
    { name: "Season 2: Clash of the Titans", shortName: "Season 2", seasonNumber: 2, startEp: 26, endEp: 37 },
    { name: "Season 3 Part 1: Royal Government Arc", shortName: "Season 3 (Pt 1)", seasonNumber: 3, startEp: 38, endEp: 49 },
    { name: "Season 3 Part 2: Return to Shiganshina", shortName: "Season 3 (Pt 2)", seasonNumber: 4, startEp: 50, endEp: 59 },
    { name: "The Final Season Part 1: Marley Arc", shortName: "Final Season (Pt 1)", seasonNumber: 5, startEp: 60, endEp: 75 },
    { name: "The Final Season Part 2: War for Paradis", shortName: "Final Season (Pt 2)", seasonNumber: 6, startEp: 76, endEp: 87 },
    { name: "The Final Chapters: The Rumbling", shortName: "The Final Chapters", seasonNumber: 7, startEp: 88, endEp: 94 },
  ],

  // JoJo's Bizarre Adventure
  "jojo": [
    { name: "Part 1: Phantom Blood & Battle Tendency", shortName: "Parts 1 & 2", seasonNumber: 1, startEp: 1, endEp: 26 },
    { name: "Part 3: Stardust Crusaders", shortName: "Part 3: Crusaders", seasonNumber: 2, startEp: 27, endEp: 74 },
    { name: "Part 4: Diamond is Unbreakable", shortName: "Part 4: Diamond", seasonNumber: 3, startEp: 75, endEp: 113 },
    { name: "Part 5: Golden Wind", shortName: "Part 5: Golden Wind", seasonNumber: 4, startEp: 114, endEp: 152 },
    { name: "Part 6: Stone Ocean", shortName: "Part 6: Stone Ocean", seasonNumber: 5, startEp: 153, endEp: 190 },
  ],

  // My Hero Academia
  "my hero academia": [
    { name: "Season 1: U.A. Entrance Exam & U.S.J. Arc", shortName: "Season 1", seasonNumber: 1, startEp: 1, endEp: 13 },
    { name: "Season 2: Sports Festival & Hero Killer Stain", shortName: "Season 2", seasonNumber: 2, startEp: 14, endEp: 38 },
    { name: "Season 3: Training Camp & All Might vs All For One", shortName: "Season 3", seasonNumber: 3, startEp: 39, endEp: 63 },
    { name: "Season 4: Shie Hassaikai (Overhaul) & School Festival", shortName: "Season 4", seasonNumber: 4, startEp: 64, endEp: 88 },
    { name: "Season 5: Joint Training & My Villain Academia", shortName: "Season 5", seasonNumber: 5, startEp: 89, endEp: 113 },
    { name: "Season 6: Paranormal Liberation War & Dark Hero", shortName: "Season 6", seasonNumber: 6, startEp: 114, endEp: 138 },
    { name: "Season 7: Star and Stripe & Final War Arc", shortName: "Season 7", seasonNumber: 7, startEp: 139, endEp: 159 },
  ],

  // Black Clover
  "black clover": [
    { name: "Magic Knights Entrance & Dungeon Arc", shortName: "Dungeon Arc", seasonNumber: 1, startEp: 1, endEp: 19 },
    { name: "Royal Capital & Eye of the Midnight Sun", shortName: "Royal Capital", seasonNumber: 2, startEp: 20, endEp: 39 },
    { name: "Seabed Temple Arc", shortName: "Seabed Temple", seasonNumber: 3, startEp: 40, endEp: 50 },
    { name: "Witches' Forest Arc", shortName: "Witches' Forest", seasonNumber: 4, startEp: 51, endEp: 65 },
    { name: "Royal Knights Selection Arc", shortName: "Royal Knights", seasonNumber: 5, startEp: 66, endEp: 84 },
    { name: "Elf Reincarnation Arc", shortName: "Elf Reincarnation", seasonNumber: 6, startEp: 85, endEp: 129 },
    { name: "Heart Kingdom Joint Training & Spade Kingdom", shortName: "Spade Kingdom", seasonNumber: 7, startEp: 130, endEp: 170 },
  ],

  // Fairy Tail
  "fairy tail": [
    { name: "Macao through Phantom Lord Arc", shortName: "Early Missions", seasonNumber: 1, startEp: 1, endEp: 29 },
    { name: "Tower of Heaven & Battle of Fairy Tail", shortName: "Tower of Heaven", seasonNumber: 2, startEp: 30, endEp: 48 },
    { name: "Oración Seis & Edolas Arc", shortName: "Oracion Seis & Edolas", seasonNumber: 3, startEp: 49, endEp: 96 },
    { name: "Tenrou Island (Grimoire Heart) Arc", shortName: "Tenrou Island", seasonNumber: 4, startEp: 97, endEp: 122 },
    { name: "Grand Magic Games Arc", shortName: "Grand Magic Games", seasonNumber: 5, startEp: 151, endEp: 201 },
    { name: "Tartaros Arc", shortName: "Tartaros", seasonNumber: 6, startEp: 227, endEp: 265 },
    { name: "Avatar & Alvarez Empire (Final Series)", shortName: "Alvarez Empire", seasonNumber: 7, startEp: 278, endEp: 328 },
  ],

  // Gintama
  "gintama": [
    { name: "Season 1 (Episodes 1 - 49)", shortName: "Season 1", seasonNumber: 1, startEp: 1, endEp: 49 },
    { name: "Season 2: Benizakura & Yagyu Arc (50 - 99)", shortName: "Season 2", seasonNumber: 2, startEp: 50, endEp: 99 },
    { name: "Season 3: Shinsengumi Crisis & Yoshiwara in Flames (100 - 150)", shortName: "Season 3", seasonNumber: 3, startEp: 100, endEp: 150 },
    { name: "Season 4: Red Spider & Character Poll Arc (151 - 201)", shortName: "Season 4", seasonNumber: 4, startEp: 151, endEp: 201 },
    { name: "Gintama' (2011) (202 - 252)", shortName: "Gintama'", seasonNumber: 5, startEp: 202, endEp: 252 },
    { name: "Gintama' Enchousen & Courtesan of a Nation (253 - 265)", shortName: "Enchousen", seasonNumber: 6, startEp: 253, endEp: 265 },
    { name: "Gintama°: Shogun Assassination & Farewell Shinsengumi (266 - 316)", shortName: "Gintama°", seasonNumber: 7, startEp: 266, endEp: 316 },
    { name: "Gintama. (2017) & Silver Soul Arc (317 - 367)", shortName: "Silver Soul Arc", seasonNumber: 8, startEp: 317, endEp: 367 },
  ],
};

/**
 * Detect matching known arcs for a given anime title
 */
export function getKnownAnimeArcs(title: string): AnimeArcDefinition[] | null {
  if (!title) return null;
  const clean = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

  // Try exact or substring key matching
  for (const [key, arcs] of Object.entries(POPULAR_ANIME_ARCS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return arcs;
    }
  }

  // Common aliases
  if (clean.includes("kimetsu") || clean.includes("yaiba")) return POPULAR_ANIME_ARCS["demon slayer"];
  if (clean.includes("shingeki") || clean.includes("kyojin")) return POPULAR_ANIME_ARCS["attack on titan"];
  if (clean.includes("boku no hero")) return POPULAR_ANIME_ARCS["my hero academia"];
  if (clean.includes("hxh")) return POPULAR_ANIME_ARCS["hunter x hunter"];
  if (clean.includes("jjk")) return POPULAR_ANIME_ARCS["jujutsu kaisen"];
  if (clean.includes("dbz")) return POPULAR_ANIME_ARCS["dragon ball z"];
  if (clean.includes("dbs")) return POPULAR_ANIME_ARCS["dragon ball super"];

  return null;
}
