/**
 * Photographs, from Unsplash (unsplash.com, Unsplash License). Images are
 * served straight from Unsplash's CDN, as their API guidelines ask, and each
 * one is credited to its photographer where it appears.
 * Replace with our own site photos as we take them.
 */
export type Photo = {
  /** Unsplash's base image URL; size and format are added by the image loader. */
  src: string;
  alt: string;
  author: string;
  /** The photographer's Unsplash profile. */
  profile: string;
  /** Average colour, shown while the image loads. */
  color: string;
  w: number;
  h: number;
};

const ref = "utm_source=unmapped_labs&utm_medium=referral";
const u = (raw: string, alt: string, author: string, username: string, color: string, w: number, h: number): Photo => ({
  src: raw,
  alt,
  author,
  profile: `https://unsplash.com/@${username}?${ref}`,
  color,
  w,
  h,
});

/** Link to Unsplash itself, required next to every credit. */
export const unsplashHome = `https://unsplash.com/?${ref}`;

export const photos = {
  yardAerial: u("https://images.unsplash.com/photo-1613690413712-dbe316605644?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Mnx8Y29udGFpbmVyJTIwdGVybWluYWwlMjBhZXJpYWx8ZW58MXwwfHx8MTc5MjQ3MjY0NHww&ixlib=rb-4.1.0", "Container stacks and gantry cranes in a port yard, seen from above", "Venti Views", "ventiviews", "#0c2626", 5251, 3549),
  portShip: u("https://images.unsplash.com/photo-1769144256207-bc4bb75b29db?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTV8fGNvbnRhaW5lciUyMHRlcm1pbmFsJTIwYWVyaWFsfGVufDF8MHx8fDE3OTI0NzI2NDR8MA&ixlib=rb-4.1.0", "A container ship being loaded by quay cranes, seen from above", "Daniel Miksha", "danielmiksha", "#0c4040", 3880, 2183),
  portWide: u("https://images.unsplash.com/photo-1494412651409-8963ce7935a7?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8M3x8Y29udGFpbmVyJTIwdGVybWluYWwlMjBhZXJpYWx8ZW58MXwwfHx8MTc5MjQ3MjY0NHww&ixlib=rb-4.1.0", "A busy container port stretching to the city", "CHUTTERSNAP", "chuttersnap", "#c0c0c0", 3763, 2509),
  truckIndia: u("https://images.unsplash.com/photo-1635774152029-17bf0a3e1cb4?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MXx8dHJ1Y2slMjBpbmRpYSUyMGhpZ2h3YXl8ZW58MXwwfHx8MTc5MjQ3MjY0NXww&ixlib=rb-4.1.0", "A brightly painted Indian goods truck on the highway", "Siddhesh Mangela", "siddacool", "#8ca6c0", 6000, 4000),
  truckGhat: u("https://images.unsplash.com/photo-1791216996440-19b88cecf702?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8NXx8dHJ1Y2slMjBpbmRpYSUyMGhpZ2h3YXl8ZW58MXwwfHx8MTc5MjQ3MjY0NXww&ixlib=rb-4.1.0", "Loaded trucks climbing a monsoon ghat road", "Zoshua Colah", "zoshuacolah", "#26260c", 4850, 3230),
  warehouseUnload: u("https://images.unsplash.com/photo-1764116858779-f314ee1feb03?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTF8fHdhcmVob3VzZSUyMHdvcmtlcnMlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyNjQ2fDA&ixlib=rb-4.1.0", "Workers unloading a truck at a depot", "Zoshua Colah", "zoshuacolah", "#262626", 5776, 3476),
  warehouseSacks: u("https://images.unsplash.com/photo-1591511870720-f84d1cf52d4e?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTZ8fHdhcmVob3VzZSUyMHdvcmtlcnMlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyNjQ2fDA&ixlib=rb-4.1.0", "A worker carrying a sack past stacked bags in a warehouse", "AJITH S", "ajiths10", "#c07340", 4656, 2778),
  crateStacks: u("https://images.unsplash.com/photo-1780401573423-8ed2d8e469d8?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8NXx8Y3JhdGVzJTIwb2YlMjB2ZWdldGFibGVzfGVufDF8MHx8fDE3OTI0NzI5MjZ8MA&ixlib=rb-4.1.0", "Stacks of empty produce crates at a market yard", "Kelvin Zyteng", "zyteng", "#8c8c8c", 6048, 4032),
  harvestWoman: u("https://images.unsplash.com/photo-1707811179851-c1f93698ad46?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Mnx8aW5kaWFuJTIwZmFybWVyJTIwaGFydmVzdHxlbnwxfDB8fHwxNzkyNDcyNjQ3fDA&ixlib=rb-4.1.0", "A farmer holding freshly cut rice in a golden field", "EqualStock", "equalstock", "#f3f3f3", 5824, 3883),
  paddyPlanting: u("https://images.unsplash.com/photo-1623211265647-acf8ad307e0b?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8M3x8aW5kaWFuJTIwZmFybWVyJTIwaGFydmVzdHxlbnwxfDB8fHwxNzkyNDcyNjQ3fDA&ixlib=rb-4.1.0", "A farmer transplanting rice seedlings in a flooded field", "Guru Moorthy Gokul", "mp_gokul", "#8c7359", 6720, 4480),
  grainDrying: u("https://images.unsplash.com/photo-1691693813200-1b2ef1836a03?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MjN8fGluZGlhbiUyMGZhcm1lciUyMGhhcnZlc3R8ZW58MXwwfHx8MTc5MjQ3MjY0N3ww&ixlib=rb-4.1.0", "Workers raking grain laid out to dry in long rows", "Dibakar Roy", "dibakar16roy", "#c07326", 5400, 3600),
  harvestCarry: u("https://images.unsplash.com/photo-1734688245923-50f121b18c7f?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MjB8fGluZGlhbiUyMGZhcm1lciUyMGhhcnZlc3R8ZW58MXwwfHx8MTc5MjQ3MjY0N3ww&ixlib=rb-4.1.0", "A farmer carrying bundles of harvested rice across the field", "Wietse Jongsma", "wietsej", "#f3f3f3", 2865, 1910),
  fieldsGrid: u("https://images.unsplash.com/photo-1750353127953-bf1f4943c343?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTF8fGZhcm0lMjBmaWVsZHMlMjBhZXJpYWwlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyNjQ4fDA&ixlib=rb-4.1.0", "Aerial view of a patchwork of green paddy fields", "Sujit Bangarshettar", "sujit_b", "#26730c", 8064, 4536),
  fieldsWide: u("https://images.unsplash.com/photo-1772512799691-004541bc2f7c?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Nnx8ZmFybSUyMGZpZWxkcyUyMGFlcmlhbCUyMGluZGlhfGVufDF8MHx8fDE3OTI0NzI2NDh8MA&ixlib=rb-4.1.0", "Aerial view of rice fields and water channels", "Impressions PKD", "impressionspkd", "#40590c", 5464, 3070),
  canalAerial: u("https://images.unsplash.com/photo-1775762951322-d382fcb43fef?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Nnx8aXJyaWdhdGlvbiUyMGNhbmFsfGVufDF8MHx8fDE3OTI0NzI5MjN8MA&ixlib=rb-4.1.0", "An irrigation canal running straight between fields, seen from above", "Bernd Dittrich", "hdbernd", "#59730c", 8064, 5754),
  sprinklers: u("https://images.unsplash.com/photo-1738598665698-7fd7af4b5e0c?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Mnx8c3ByaW5rbGVyJTIwaXJyaWdhdGlvbiUyMGZpZWxkfGVufDF8MHx8fDE3OTI0NzI5MjR8MA&ixlib=rb-4.1.0", "Sprinklers watering rows of young crops", "Being Organic in EU", "beingorganicineu", "#8c8c59", 6960, 4640),
  pumpOutlet: u("https://images.unsplash.com/photo-1611320289425-2543f3ff4408?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTR8fHdhdGVyJTIwcHVtcCUyMGZhcm18ZW58MXwwfHx8MTc5MjQ3MjkyNHww&ixlib=rb-4.1.0", "Water gushing from a farm pump outlet into a field channel", "sushant sodanwar", "sushant_m_s", "#597326", 6000, 4000),
  pumpEngine: u("https://images.unsplash.com/photo-1654352041254-ff78224c1479?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTB8fHdhdGVyJTIwcHVtcCUyMGZhcm18ZW58MXwwfHx8MTc5MjQ3MjkyNHww&ixlib=rb-4.1.0", "A diesel pump set beside a field", "Swastik Arora", "swastikarora", "#d9c0a6", 6000, 4000),
  mandiStalls: u("https://images.unsplash.com/photo-1709450516752-ef31c0f0ed62?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTl8fHZlZ2V0YWJsZSUyMG1hcmtldCUyMGluZGlhfGVufDF8MHx8fDE3OTI0NzI2NTB8MA&ixlib=rb-4.1.0", "Heaped vegetables and grain at a wholesale market", "Harshal More", "shadowtrails_photos", "#26260c", 5184, 3456),
  mandiOnions: u("https://images.unsplash.com/photo-1558458654-a145c979a342?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTN8fHZlZ2V0YWJsZSUyMG1hcmtldCUyMGluZGlhfGVufDF8MHx8fDE3OTI0NzI2NTB8MA&ixlib=rb-4.1.0", "A trader among sacks of onions at a market", "Ela Abbou", "elaabbou", "#400c0c", 5152, 3864),
  nurseDesk: u("https://images.unsplash.com/photo-1741707040287-7c0228b2fca7?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8OXx8aW5kaWFuJTIwbnVyc2V8ZW58MXwwfHx8MTc5MjQ3MjkyMnww&ixlib=rb-4.1.0", "A nurse at work at a hospital station", "EqualStock", "equalstock", "#f3f3f3", 6000, 4000),
  nurseComputer: u("https://images.unsplash.com/photo-1742934027594-876ca3626df4?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MjB8fGluZGlhbiUyMG51cnNlfGVufDF8MHx8fDE3OTI0NzI5MjJ8MA&ixlib=rb-4.1.0", "A nurse entering records at a hospital computer", "EqualStock", "equalstock", "#f3f3f3", 6000, 4000),
  wardBeds: u("https://images.unsplash.com/photo-1778151270757-f3793f65e2de?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Mnx8aG9zcGl0YWwlMjB3YXJkJTIwYmVkc3xlbnwxfDB8fHwxNzkyNDcyOTIwfDA&ixlib=rb-4.1.0", "A hospital ward with a row of beds", "Irshad Pathan", "alrighthospital", "#8c8c8c", 7008, 4672),
  waitingHall: u("https://images.unsplash.com/photo-1713524078454-ce85bdc26149?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTB8fGhvc3BpdGFsJTIwd2FpdGluZyUyMHJvb218ZW58MXwwfHx8MTc5MjQ3MjkyMXww&ixlib=rb-4.1.0", "A hospital waiting hall with rows of steel chairs", "Barun Ghosh", "barunghosh", "#8c8c8c", 4096, 3072),
  waitingPeople: u("https://images.unsplash.com/photo-1719155483042-20d5763ea0b1?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8OXx8ZG9jdG9yJTIwcGF0aWVudCUyMGluZGlhfGVufDF8MHx8fDE3OTI0NzI5MTl8MA&ixlib=rb-4.1.0", "Two people waiting on blue seats in a hospital", "Sourav Debnath", "souravdnath1", "#a6a6a6", 3592, 2021),
  hospitalCrowd: u("https://images.unsplash.com/photo-1699547283492-7a8b85165edd?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MjJ8fGRvY3RvciUyMHBhdGllbnQlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyOTE5fDA&ixlib=rb-4.1.0", "A crowded hospital entrance with a patient in a wheelchair", "Dibakar Roy", "dibakar16roy", "#8c7373", 5400, 3633),
  workersHelmet: u("https://images.unsplash.com/photo-1577199001468-44c049e7603f?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MXx8ZmFjdG9yeSUyMHdvcmtlcnMlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyNjUyfDA&ixlib=rb-4.1.0", "Plant workers in hard hats and safety vests", "Shubham Verma", "ess_vee_production_house", "#262626", 4941, 3294),
  workersPlant: u("https://images.unsplash.com/photo-1668243304566-2e78ebd48960?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8OHx8ZmFjdG9yeSUyMHdvcmtlcnMlMjBpbmRpYXxlbnwxfDB8fHwxNzkyNDcyNjUyfDA&ixlib=rb-4.1.0", "A shift of workers walking past an industrial plant", "Bhupathi Srinu", "bhupathi_", "#8ca6d9", 7952, 5304),
  grinding: u("https://images.unsplash.com/photo-1564183063457-680b3759a5bd?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8NHx8ZmFjdG9yeSUyMG1hY2hpbmVyeSUyMHdvcmtlcnxlbnwxfDB8fHwxNzkyNDcyNjU0fDA&ixlib=rb-4.1.0", "A worker grinding metal in a workshop, sparks flying", "Spencer Davis", "spencerdavis", "#0c2626", 4792, 3195),
  lathe: u("https://images.unsplash.com/photo-1565954786194-d22abeaac3ae?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8Mnx8ZmFjdG9yeSUyMG1hY2hpbmVyeSUyMHdvcmtlcnxlbnwxfDB8fHwxNzkyNDcyNjU0fDA&ixlib=rb-4.1.0", "A machinist working a lathe", "Rafael Juárez", "movidagrafica", "#0c2640", 4512, 3008),
  pipesBlue: u("https://images.unsplash.com/photo-1664087783968-0cd7deee8390?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8N3x8aW5kdXN0cmlhbCUyMHBpcGVzJTIwdmFsdmVzfGVufDF8MHx8fDE3OTI0NzI5MjV8MA&ixlib=rb-4.1.0", "Blue compressed-air pipework and a receiver tank in a plant room", "iSawRed", "isawred", "#0c2640", 5365, 3375),
  pumpsGauges: u("https://images.unsplash.com/photo-1693463735697-73df1f35930d?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MTV8fGluZHVzdHJpYWwlMjBwaXBlcyUyMHZhbHZlc3xlbnwxfDB8fHwxNzkyNDcyOTI1fDA&ixlib=rb-4.1.0", "Pumps, valves and pressure gauges in a plant room", "IYYM IYYM", "iyym", "#0c408c", 5120, 3404),
  substation: u("https://images.unsplash.com/photo-1681495628907-592089c3a546?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8MjN8fHBvd2VyJTIwcGxhbnQlMjBlbGVjdHJpY2l0eXxlbnwxfDB8fHwxNzkyNDcyNjU1fDA&ixlib=rb-4.1.0", "A transformer and switchgear at an electrical substation", "Aldward Castillo", "aldwardcv31", "#c0d9f3", 5472, 3648),
  plantAerial: u("https://images.unsplash.com/photo-1764885200617-95eec696d49b?ixid=M3wxMTA3ODM3fDB8MXxzZWFyY2h8M3x8aW5kdXN0cmlhbCUyMHBsYW50JTIwYWVyaWFsfGVufDF8MHx8fDE3OTI0NzI2NTN8MA&ixlib=rb-4.1.0", "An industrial plant at sunrise, steam rising, seen from above", "LEDC", "ledc", "#262626", 7673, 5755),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

/** Look up several photos by key. */
export const pick = (keys: readonly PhotoKey[]) => keys.map((k) => photos[k]);
