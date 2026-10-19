/**
 * Photographs used on the site. All are from Wikimedia Commons under open
 * licences and are credited wherever they appear (title, author, source,
 * licence). Replace with our own site photos as we take them.
 */
export type Photo = {
  src: string;
  alt: string;
  place: string;
  w: number;
  h: number;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
};

const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
const BY_SA_3 = { license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" };
const BY_2 = { license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" };

export const photos = {
  port: {
    src: "/photos/port.jpg",
    alt: "Ship-to-shore cranes lined up along the quay at a container port at dawn",
    place: "Container port · JNPT, Navi Mumbai",
    w: 2400,
    h: 1350,
    author: "Ccmarathe",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:JNPT_Port_container_handling.jpg",
  },
  harvest: {
    src: "/photos/harvest.jpg",
    alt: "A farmer harvesting ripe rice by hand in a golden field",
    place: "Rice harvest · Raichur, Karnataka",
    w: 2400,
    h: 1600,
    author: "Nanditha Gogate, WELL Labs",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Farmer_manually_harvesting_rice_in_Raichur,_Karnataka.jpg",
  },
  canal: {
    src: "/photos/canal.jpg",
    alt: "Aerial view of an irrigation canal branching into a patchwork of green fields",
    place: "Irrigation network · Narayanpur, Karnataka",
    w: 2400,
    h: 1350,
    author: "Vraj Acharya, WELL Labs",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Narayanpur_Right_Bank_Canal_distributary_10_aerial_irrigation_network_Karnataka_India.jpg",
  },
  mandi: {
    src: "/photos/mandi.jpg",
    alt: "A busy wholesale vegetable market hall with traders and heaped produce",
    place: "Wholesale market · Koyambedu, Chennai",
    w: 2400,
    h: 1800,
    author: "McKay Savage",
    ...BY_2,
    source: "https://commons.wikimedia.org/wiki/File:India_-_Koyambedu_Market_-_Market_04_(3986889326).jpg",
  },
  hospitalQueue: {
    src: "/photos/hospital-queue.jpg",
    alt: "Patients queueing at the registration counters of a government hospital",
    place: "Outpatient registration · Government ENT hospital",
    w: 2400,
    h: 1109,
    author: "Kavali Chandrakanth KCK",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Government_E._N._T._Hospital_10.jpg",
  },
  hospitalWard: {
    src: "/photos/hospital-ward.jpg",
    alt: "A long hospital corridor with patients waiting on benches",
    place: "Waiting area · Government ENT hospital",
    w: 2400,
    h: 1109,
    author: "Kavali Chandrakanth KCK",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Government_E._N._T._Hospital_14.jpg",
  },
  factory: {
    src: "/photos/factory.jpg",
    alt: "Workers assembling electric fans on the floor of a small factory",
    place: "Fan workshop · Varanasi",
    w: 2400,
    h: 1600,
    author: "Jorge Royan",
    ...BY_SA_3,
    source: "https://commons.wikimedia.org/wiki/File:India_-_Varanasi_electric_fan_factory_-_1464.jpg",
  },
  teaFactory: {
    src: "/photos/tea-factory.jpg",
    alt: "A worker sweeps beside large steel drying drums in a tea factory",
    place: "Tea factory · Tyford estate",
    w: 2400,
    h: 1594,
    author: "shankar s.",
    ...BY_2,
    source: "https://commons.wikimedia.org/wiki/File:A_man_goes_around_sweeping_away_falling_tea_debris_(28729476096).jpg",
  },
  truck: {
    src: "/photos/truck.jpg",
    alt: "A loaded flatbed truck on an empty highway",
    place: "Freight on the highway",
    w: 2400,
    h: 1654,
    author: "Sneha G Gupta",
    ...BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Freight_transportation_by_road_on_open_truck.jpg",
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
