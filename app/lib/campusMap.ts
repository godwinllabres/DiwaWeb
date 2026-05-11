// CvSU Don Severino de las Alas Campus (Indang) — all 48 numbered locations
// from the official campus map by the Matayuyon Crop Science Society.
//
// Coordinates (x, y) are in the campus image's reference frame
// (2000 x 2000 px). Treat them as starting approximations — open the
// rendered map in the browser, hover the highlighted target, and nudge
// any building's x/y here if the marker is off.

export interface Building {
  /** snake_case id used as the backend's `place_id`. */
  id: string;
  /** Legend number (1–48) on the official map. */
  num: number;
  /** Full name as printed on the legend. */
  name: string;
  /** Short label shown next to the highlight pin. */
  abbr: string;
  /** Pixel center on the campus image (2000 x 2000). */
  x: number;
  y: number;
  /** Walking directions from Gate 1 (Main Gate). One line per step. */
  steps: readonly string[];
}

// Image dimensions = SVG viewBox. The campus PNG must be saved at this aspect.
export const CAMPUS_W = 2000;
export const CAMPUS_H = 2000;

// Background image served by Vite from /public.
export const CAMPUS_IMAGE_URL = "/cvsu-campus-map.png";

// Main Gate position — origin for walking directions.
export const MAIN_GATE = { x: 508, y: 1767 } as const;

export const BUILDINGS: readonly Building[] = [
  {
    id: "plaza", num: 1, name: "University Plaza (Laya't Diwa)", abbr: "Plaza",
    x: 397, y: 1800,
    steps: ["You are just inside Gate 1 — the plaza is the open area at the south entrance."],
  },
  {
    id: "gate_1", num: 2, name: "Gate 1 (Main Gate)", abbr: "Gate 1",
    x: 508, y: 1767,
    steps: ["You are at Gate 1, the main southern entrance to campus."],
  },
  {
    id: "softball", num: 3, name: "Softball Field", abbr: "Softball",
    x: 270, y: 1522,
    steps: [
      "From Gate 1, head west along the southern boundary.",
      "The softball field is to your left, near the southwest corner.",
    ],
  },
  {
    id: "intl_house", num: 4, name: "International House — Marketing", abbr: "Intl House",
    x: 606, y: 1767,
    steps: [
      "From Gate 1, walk east a short distance along the southern road.",
      "International House — Marketing is on your right.",
    ],
  },
  {
    id: "bleachers", num: 5, name: "Bleachers", abbr: "Bleachers",
    x: 699, y: 1678,
    steps: [
      "From Gate 1, walk north toward the University Oval.",
      "The bleachers face the oval grandstand.",
    ],
  },
  {
    id: "open_court", num: 6, name: "Open Court", abbr: "Open Court",
    x: 734, y: 1578,
    steps: [
      "From Gate 1, walk north past the bleachers.",
      "The open court is east of the University Oval.",
    ],
  },
  {
    id: "oval", num: 7, name: "University Oval — Grandstand", abbr: "Oval",
    x: 647, y: 1322,
    steps: [
      "From Gate 1, walk straight north.",
      "The University Oval and grandstand are the large track in the center of campus.",
    ],
  },
  {
    id: "mall", num: 8, name: "University Mall", abbr: "Mall",
    x: 804, y: 1767,
    steps: [
      "From Gate 1, walk east along the southern row.",
      "The University Mall is part of the south-east cluster, before the dormitories.",
    ],
  },
  {
    id: "osas", num: 9,
    name: "Office of Student Affairs and Services (OSAS) — University Registrar",
    abbr: "OSAS / Registrar",
    x: 920, y: 1544,
    steps: [
      "From Gate 1, walk north along the central road past the oval.",
      "OSAS / University Registrar is on the east side, near the gymnasium.",
    ],
  },
  {
    id: "gym", num: 10,
    name: "College of Sports and Physical Education and Recreation — University Gymnasium",
    abbr: "Gymnasium",
    x: 931, y: 1700,
    steps: [
      "From Gate 1, walk north past the bleachers and open court.",
      "The University Gymnasium is on the east side of campus.",
    ],
  },
  {
    id: "boys_dorm", num: 11, name: "Boy's Dormitory", abbr: "Boys Dorm",
    x: 1024, y: 1767,
    steps: [
      "From Gate 1, walk east along the southern road past the mall.",
      "Boy's Dormitory is in the southeast dorm cluster.",
    ],
  },
  {
    id: "bahay_alumni", num: 12, name: "Bahay Alumni", abbr: "Bahay Alumni",
    x: 1117, y: 1678,
    steps: [
      "From Gate 1, walk east past the mall and gymnasium.",
      "Bahay Alumni is in the east-central area near the dormitories.",
    ],
  },
  {
    id: "girls_dorm", num: 13, name: "Girl's Dormitory", abbr: "Girls Dorm",
    x: 1245, y: 1767,
    steps: [
      "From Gate 1, walk east along the southern row past Bahay Alumni.",
      "Girl's Dormitory is at the eastern end of the south boundary.",
    ],
  },
  {
    id: "ncrdec", num: 14,
    name: "National Coffee Research, Development, and Extension Center (NCRDEC)",
    abbr: "NCRDEC",
    x: 1430, y: 1578,
    steps: [
      "From Gate 1, walk east to the far edge of campus.",
      "NCRDEC is in the eastern strip, near the agri-extension area.",
    ],
  },
  {
    id: "demo_farm", num: 15, name: "Technology Demonstration Farm", abbr: "Demo Farm",
    x: 1361, y: 1467,
    steps: [
      "From Gate 1, walk northeast past the gymnasium.",
      "The Demonstration Farm is in the east-central agri zone.",
    ],
  },
  {
    id: "processing", num: 16, name: "Fruits and Vegetable Processing Center", abbr: "Processing",
    x: 1268, y: 1467,
    steps: [
      "From Gate 1, walk northeast past the gymnasium.",
      "The Fruits and Vegetable Processing Center is next to the demo farm.",
    ],
  },
  {
    id: "cafenr", num: 17,
    name: "College of Agriculture, Food, Environment, and Natural Resources (CAFENR)",
    abbr: "CAFENR",
    x: 1152, y: 1300,
    steps: [
      "From Gate 1, walk north past the oval and Admin.",
      "CAFENR is in the central-east area of campus.",
    ],
  },
  {
    id: "dcs", num: 18, name: "Department of Crop Science (DCS)", abbr: "DCS",
    x: 1082, y: 1300,
    steps: [
      "Walk north from Gate 1 past the oval.",
      "DCS sits right beside CAFENR in the central-east cluster.",
    ],
  },
  {
    id: "cemds", num: 19,
    name: "College of Economics, Management, and Development Studies (CEMDS)",
    abbr: "CEMDS",
    x: 1245, y: 1178,
    steps: [
      "Walk north from Gate 1 past Admin and the oval.",
      "CEMDS is in the north-central area, east side.",
    ],
  },
  {
    id: "research_center", num: 20, name: "Research Center", abbr: "Research",
    x: 1187, y: 1100,
    steps: [
      "Walk north past Admin, then continue past CAFENR.",
      "The Research Center is just north of CEMDS.",
    ],
  },
  {
    id: "cthm", num: 21, name: "College of Tourism and Hospitality Management (CTHM)", abbr: "CTHM",
    x: 1175, y: 967,
    steps: [
      "Walk north along the eastern road past CEMDS.",
      "CTHM is in the upper-central area, east side.",
    ],
  },
  {
    id: "cas", num: 22, name: "College of Arts and Sciences (CAS)", abbr: "CAS",
    x: 943, y: 967,
    steps: [
      "Walk north from Gate 1 past Admin and the oval.",
      "CAS is in the upper-central cluster, west of CTHM.",
    ],
  },
  {
    id: "old_cemds", num: 23, name: "Old CEMDS Building", abbr: "Old CEMDS",
    x: 734, y: 967,
    steps: [
      "Walk north from Gate 1 past Admin.",
      "The Old CEMDS building is in the upper-central area, west of CAS.",
    ],
  },
  {
    id: "admin", num: 24,
    name: "Administration Building — University Cashier",
    abbr: "Admin",
    x: 473, y: 1100,
    steps: [
      "Walk straight north from Gate 1 along the central road.",
      "The Administration Building (University Cashier) is the first major structure on your left.",
    ],
  },
  {
    id: "ceit", num: 25,
    name: "College of Engineering and Information Technology (CEIT)",
    abbr: "CEIT",
    x: 339, y: 1033,
    steps: [
      "Walk north from Gate 1, then bear left past Admin.",
      "CEIT is in the west-central cluster, near Gate 2.",
    ],
  },
  {
    id: "child_dev", num: 26, name: "Child Development Center", abbr: "Child Dev",
    x: 281, y: 967,
    steps: [
      "Enter from Gate 2 on the west, or walk north-west from Gate 1.",
      "The Child Development Center is in the western strip, near CEIT.",
    ],
  },
  {
    id: "gate_2", num: 27, name: "Gate 2", abbr: "Gate 2",
    x: 223, y: 1078,
    steps: ["Gate 2 is the western entrance, on the side of CEIT and the Chapel."],
  },
  {
    id: "chapel", num: 28, name: "University Chapel", abbr: "Chapel",
    x: 246, y: 1178,
    steps: [
      "Enter via Gate 2, or walk west from the central road past Admin.",
      "The Chapel is on the western edge of campus.",
    ],
  },
  {
    id: "ccj", num: 29, name: "College of Criminal Justice (CCJ)", abbr: "CCJ",
    x: 235, y: 1300,
    steps: [
      "Enter from Gate 2 or walk west from the central road.",
      "CCJ is on the western edge, south of the Chapel.",
    ],
  },
  {
    id: "clinic", num: 30, name: "University Clinic (Infirmary)", abbr: "Clinic",
    x: 275, y: 1411,
    steps: [
      "Walk west from Gate 1 along the southern road, then turn north.",
      "The University Clinic (Infirmary) is on the western edge of campus.",
    ],
  },
  {
    id: "sci_hs", num: 31, name: "Science Highschool", abbr: "Sci HS",
    x: 421, y: 1300,
    steps: [
      "Walk north from Gate 1, then west of the Admin Building.",
      "Science Highschool is in the south-west sector.",
    ],
  },
  {
    id: "quadrangle", num: 32, name: "Quadrangle", abbr: "Quad",
    x: 467, y: 1300,
    steps: [
      "Walk north from Gate 1; the quadrangle is the open area just south of Admin.",
    ],
  },
  {
    id: "coed", num: 33, name: "College of Education (CED)", abbr: "CEd",
    x: 397, y: 1100,
    steps: [
      "Walk north from Gate 1 past Admin.",
      "CED is in the west-central cluster, near CEIT.",
    ],
  },
  {
    id: "hostel", num: 34, name: "Hostel Tropicana", abbr: "Hostel",
    x: 1268, y: 900,
    steps: [
      "Walk north past CEMDS and the Research Center.",
      "Hostel Tropicana is in the northeast cluster.",
    ],
  },
  {
    id: "agri_eco", num: 35, name: "CvSU Agri-Eco Park", abbr: "Agri-Eco",
    x: 1291, y: 800,
    steps: [
      "Walk north along the eastern road past CTHM and the hostel.",
      "The Agri-Eco Park is in the northeast section.",
    ],
  },
  {
    id: "saluysoy", num: 36, name: "Saluysoy", abbr: "Saluysoy",
    x: 1245, y: 711,
    steps: [
      "Walk north past CTHM into the north-central area.",
      "Saluysoy is in the upper-east section of campus.",
    ],
  },
  {
    id: "bano_resort", num: 37, name: "Baño De Señora Resort", abbr: "Baño Resort",
    x: 1245, y: 622,
    steps: [
      "Walk north all the way past CTHM and the Agri-Eco area.",
      "Baño De Señora Resort is at the northeast edge of campus.",
    ],
  },
  {
    id: "icon", num: 38, name: "International Convention Center (ICON)", abbr: "ICON",
    x: 856, y: 711,
    steps: [
      "Walk north past CAS and the library cluster.",
      "The International Convention Center is in the north-central area.",
    ],
  },
  {
    id: "con", num: 39, name: "College of Nursing (CON)", abbr: "CON",
    x: 925, y: 900,
    steps: [
      "Walk north past Admin and the library.",
      "The College of Nursing is in the north-central area, near CAS.",
    ],
  },
  {
    id: "cvmbs", num: 40,
    name: "College of Veterinary Medicine and Biological Sciences (CVMBS)",
    abbr: "CVMBS",
    x: 856, y: 478,
    steps: [
      "Walk far north past CAS, the library, and ICON.",
      "CVMBS is in the upper-north section of campus.",
    ],
  },
  {
    id: "star_farm", num: 41, name: "CvSU Star Farm", abbr: "Star Farm",
    x: 1013, y: 356,
    steps: [
      "Walk all the way north past CVMBS.",
      "The CvSU Star Farm is at the far northern tip of campus.",
    ],
  },
  {
    id: "das", num: 42, name: "Department of Animal Science (DAS)", abbr: "DAS",
    x: 1134, y: 478,
    steps: [
      "Walk far north past CTHM and the Agri-Eco area.",
      "DAS is in the upper-north cluster, east of CVMBS.",
    ],
  },
  {
    id: "gate_3", num: 43, name: "Gate 3", abbr: "Gate 3",
    x: 850, y: 1767,
    steps: ["Gate 3 is the third entrance, on the south side near the dormitory row."],
  },
  {
    id: "lagoon", num: 44, name: "Lagoon", abbr: "Lagoon",
    x: 995, y: 711,
    steps: [
      "Walk north past Admin, then past the library and CAS.",
      "The Lagoon is the water feature in the north-central area.",
    ],
  },
  {
    id: "library", num: 45, name: "Ladislao N. Diwa Memorial Library", abbr: "Library",
    x: 1053, y: 1100,
    steps: [
      "Walk north from Gate 1 past the Admin Building.",
      "Continue past CAFENR. The Ladislao N. Diwa Memorial Library is in the central area.",
    ],
  },
  {
    id: "gender_dev", num: 46,
    name: "Gender and Development Research Center", abbr: "GAD",
    x: 937, y: 1000,
    steps: [
      "Walk north past Admin and the library.",
      "The Gender and Development Research Center is in the central area, near CAS.",
    ],
  },
  {
    id: "grad", num: 47, name: "Graduate School", abbr: "Grad School",
    x: 798, y: 1078,
    steps: [
      "Walk north from Gate 1 past Admin.",
      "The Graduate School is in the central area, near the library.",
    ],
  },
  {
    id: "rolle_hall", num: 48, name: "S.M Rolle Hall", abbr: "Rolle Hall",
    x: 711, y: 711,
    steps: [
      "Walk north past CAS into the upper-central area.",
      "S.M Rolle Hall is in the north-central section.",
    ],
  },
];

export function findBuilding(id: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

// ============================================================================
// Background illustration (replaces the PNG dependency)
// ============================================================================
// Light pathways drawn as wide light-green strokes on the map background.
// Each road is a polyline of (x, y) points in 2000 x 2000 image space.

export interface Road {
  points: ReadonlyArray<{ x: number; y: number }>;
}

// Road network calibrated to the latest Google Maps view. Architect Edward
// Alimboyoguen St. runs *north–south* (parallel to Purok 1) on the western
// edge of the campus; the main gate sits where it meets Indang–Trece Martires
// Rd. The central Oval has its own loop. The river forms a soft east-side
// boundary so the eastern agri ring runs as a separate cluster.
export const ROADS: readonly Road[] = [
  // 1. South perimeter (Indang-Trece Martires Rd public road)
  { points: [{ x: 100, y: 1850 }, { x: 1500, y: 1850 }] },

  // 2. South gate row (Plaza -> Gate 1 -> Mall -> Gate 3 -> dorms)
  { points: [
    { x: 397, y: 1800 }, { x: 508, y: 1767 }, { x: 606, y: 1767 },
    { x: 700, y: 1767 }, { x: 804, y: 1767 }, { x: 850, y: 1767 },
    { x: 1024, y: 1767 }, { x: 1117, y: 1678 }, { x: 1245, y: 1767 },
  ] },

  // 3. Main entrance road (Alimboyoguen St) from Gate 1 north, curving NW past the Oval west side
  { points: [
    { x: 508, y: 1767 }, { x: 530, y: 1620 }, { x: 555, y: 1450 },
    { x: 545, y: 1280 }, { x: 510, y: 1180 }, { x: 480, y: 1100 },
  ] },

  // 4. East curve of the entrance road wrapping the Oval east side
  { points: [
    { x: 555, y: 1450 }, { x: 700, y: 1450 }, { x: 770, y: 1380 },
    { x: 780, y: 1280 }, { x: 740, y: 1180 }, { x: 650, y: 1180 },
  ] },

  // 5. East-west cross at Admin / CEd row (y ~ 1100)
  { points: [
    { x: 223, y: 1100 }, { x: 397, y: 1100 }, { x: 473, y: 1100 },
    { x: 600, y: 1100 }, { x: 798, y: 1078 }, { x: 937, y: 1000 },
    { x: 1053, y: 1100 }, { x: 1187, y: 1100 }, { x: 1245, y: 1178 },
  ] },

  // 6. East-west cross at upper-college row (y ~ 970)
  { points: [
    { x: 281, y: 967 }, { x: 397, y: 970 }, { x: 600, y: 970 },
    { x: 734, y: 967 }, { x: 943, y: 967 }, { x: 1080, y: 970 },
    { x: 1175, y: 967 }, { x: 1290, y: 880 },
  ] },

  // 7. West side connector (Gate 2 -> Chapel -> CCJ -> Clinic -> Softball)
  { points: [
    { x: 223, y: 1078 }, { x: 246, y: 1178 }, { x: 235, y: 1300 },
    { x: 275, y: 1411 }, { x: 270, y: 1522 },
  ] },

  // 8. Sci HS / Quad cross at y ~ 1300
  { points: [
    { x: 235, y: 1300 }, { x: 421, y: 1300 }, { x: 467, y: 1300 },
    { x: 545, y: 1280 },
  ] },

  // 9. East ring road (OSAS -> Gym -> Bahay -> NCRDEC area)
  { points: [
    { x: 780, y: 1280 }, { x: 920, y: 1300 }, { x: 920, y: 1544 },
    { x: 931, y: 1700 }, { x: 1024, y: 1767 }, { x: 1117, y: 1678 },
    { x: 1245, y: 1767 }, { x: 1430, y: 1578 },
  ] },

  // 10. East agri ring (CAFENR -> CEMDS -> Processing -> Demo -> NCRDEC)
  { points: [
    { x: 1245, y: 1178 }, { x: 1245, y: 1300 }, { x: 1152, y: 1300 },
    { x: 1082, y: 1300 }, { x: 1100, y: 1410 }, { x: 1268, y: 1467 },
    { x: 1361, y: 1467 }, { x: 1430, y: 1578 },
  ] },

  // 11. Library / GAD / CTHM internal road
  { points: [
    { x: 937, y: 1000 }, { x: 1053, y: 1100 }, { x: 1175, y: 967 },
    { x: 1268, y: 900 },
  ] },

  // 12. Upper road (Rolle -> ICON -> Lagoon -> Saluysoy)
  { points: [
    { x: 711, y: 711 }, { x: 856, y: 711 }, { x: 995, y: 711 },
    { x: 1245, y: 711 }, { x: 1245, y: 622 },
  ] },

  // 13. Far north (CVMBS -> Star Farm -> DAS)
  { points: [
    { x: 856, y: 478 }, { x: 1013, y: 356 }, { x: 1134, y: 478 },
  ] },

  // 14. North spine to upper area from college row
  { points: [
    { x: 798, y: 1078 }, { x: 711, y: 711 },
  ] },

  // 15. East spine (CON -> Lagoon -> Saluysoy -> Bano -> DAS)
  { points: [
    { x: 925, y: 900 }, { x: 995, y: 711 }, { x: 1245, y: 711 },
    { x: 1245, y: 622 }, { x: 1134, y: 478 },
  ] },

  // 16. North-east branch (Agri-Eco / Hostel / Bano)
  { points: [
    { x: 1268, y: 900 }, { x: 1291, y: 800 }, { x: 1245, y: 711 },
  ] },
];

// River traced from the latest Google Maps view: enters from the north-east
// (above Saluysoy), arcs south-west past the Convention Center and Coffee
// Trading, curves down past Bio Sciences / SPRINT Field Office, hugs the east
// edge of the Oval, then exits south near Indang–Trece Martires Rd.
export const CAMPUS_RIVER: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1320, y: 50 },   { x: 1290, y: 200 },  { x: 1240, y: 360 },
  { x: 1180, y: 520 },  { x: 1130, y: 680 },  { x: 1090, y: 830 },
  { x: 1080, y: 970 },  { x: 1100, y: 1110 }, { x: 1130, y: 1240 },
  { x: 1160, y: 1370 }, { x: 1190, y: 1500 }, { x: 1240, y: 1640 },
  { x: 1290, y: 1780 }, { x: 1360, y: 1920 },
];

// Major street labels overlaid on/near the campus map.
export interface StreetLabel {
  text: string;
  x: number;
  y: number;
  rotation: number; // degrees, 0 = horizontal
}

export const STREET_LABELS: readonly StreetLabel[] = [
  { text: "Indang-Trece Martires Road", x: 780, y: 1900, rotation: 0 },
  { text: "Purok 1", x: 90, y: 1100, rotation: -90 },
  { text: "Architect Edward Alimboyoguen St.", x: 560, y: 1480, rotation: -90 },
];

// Campus outline — simplified polygon roughly tracing the official boundary.
export const CAMPUS_OUTLINE: ReadonlyArray<{ x: number; y: number }> = [
  // South perimeter (Indang-Trece Martires Rd side)
  { x: 270, y: 1840 }, { x: 880, y: 1840 }, { x: 1290, y: 1825 },
  // South-east corner (NCRDEC bulge)
  { x: 1310, y: 1730 }, { x: 1410, y: 1660 }, { x: 1490, y: 1620 },
  // Eastern boundary curling around NCRDEC and Demo Farm
  { x: 1490, y: 1500 }, { x: 1400, y: 1420 }, { x: 1320, y: 1380 },
  { x: 1300, y: 1270 }, { x: 1290, y: 1190 }, { x: 1320, y: 1080 },
  // Continues north past Hostel / Agri-Eco
  { x: 1310, y: 970 }, { x: 1320, y: 880 }, { x: 1290, y: 770 },
  { x: 1280, y: 660 }, { x: 1320, y: 550 }, { x: 1240, y: 430 },
  // North apex (Star Farm)
  { x: 1140, y: 320 }, { x: 1050, y: 280 }, { x: 940, y: 290 },
  { x: 900, y: 220 }, { x: 820, y: 220 }, { x: 820, y: 320 },
  // Western shoulder going down past CEIT
  { x: 700, y: 320 }, { x: 700, y: 430 }, { x: 540, y: 430 },
  { x: 540, y: 660 }, { x: 200, y: 660 }, { x: 180, y: 760 },
  // West boundary down to clinic / softball
  { x: 180, y: 1420 }, { x: 200, y: 1500 }, { x: 220, y: 1620 },
  { x: 230, y: 1740 }, { x: 270, y: 1840 },
];

// Decorative building footprints — drawn as soft rounded rects behind each
// numbered marker so the map reads like a campus illustration rather than a
// page of pins on green grass.
export function footprintFor(b: Building): { x: number; y: number; w: number; h: number } {
  // Custom footprint sizes for landmark buildings. The Oval is by far the
  // largest single feature on the real campus, so it gets a much bigger
  // green ellipse-style rectangle than everything else.
  const customSizes: Record<string, { w: number; h: number }> = {
    oval: { w: 280, h: 180 },
    cafenr: { w: 200, h: 110 },
    cemds: { w: 200, h: 110 },
    cvmbs: { w: 200, h: 110 },
    icon: { w: 200, h: 110 },
    cas: { w: 200, h: 110 },
    admin: { w: 200, h: 100 },
    library: { w: 200, h: 110 },
    gym: { w: 200, h: 110 },
    agri_eco: { w: 200, h: 110 },
    ncrdec: { w: 220, h: 120 },
    mall: { w: 200, h: 100 },
    star_farm: { w: 220, h: 130 },
    rolle_hall: { w: 200, h: 100 },
  };
  const size = customSizes[b.id] ?? { w: 130, h: 70 };
  return { x: b.x - size.w / 2, y: b.y - size.h / 2, w: size.w, h: size.h };
}

// ============================================================================
// Waypoint graph for shortest-path routing
// ============================================================================
// Each waypoint sits at a major road intersection. Edges connect waypoints
// that share a road segment. Buildings snap to their nearest waypoint, so
// the route from any building A to any building B is:
//   A.center -> A.waypoint -> ... Dijkstra ... -> B.waypoint -> B.center

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  neighbors: readonly string[];
}

// Waypoints sit at real road intersections (re-calibrated to the latest
// Google Maps view). Edges are bidirectional — declare each neighbor on
// both ends. The graph is intentionally sparse: ~30 nodes is enough to keep
// Dijkstra fast and routes legible.
export const WAYPOINTS: Record<string, Waypoint> = {
  // South gate row
  gate1:        { id: "gate1",        x: 508, y: 1767, neighbors: ["s_plaza", "s_intl", "main_n"] },
  s_plaza:      { id: "s_plaza",      x: 397, y: 1800, neighbors: ["gate1", "softball_jct"] },
  s_intl:       { id: "s_intl",       x: 606, y: 1767, neighbors: ["gate1", "s_bleach", "s_mall"] },
  s_bleach:     { id: "s_bleach",     x: 699, y: 1678, neighbors: ["s_intl", "s_court"] },
  s_court:      { id: "s_court",      x: 734, y: 1578, neighbors: ["s_bleach", "oval_se"] },
  s_mall:       { id: "s_mall",       x: 804, y: 1767, neighbors: ["s_intl", "gate3", "gym_jct"] },
  gate3:        { id: "gate3",        x: 850, y: 1767, neighbors: ["s_mall", "s_boys"] },
  s_boys:       { id: "s_boys",       x: 1024, y: 1767, neighbors: ["gate3", "s_bahay", "gym_jct"] },
  s_bahay:      { id: "s_bahay",      x: 1117, y: 1678, neighbors: ["s_boys", "s_girls"] },
  s_girls:      { id: "s_girls",      x: 1245, y: 1767, neighbors: ["s_bahay", "ncrdec_s"] },
  softball_jct: { id: "softball_jct", x: 270, y: 1522, neighbors: ["s_plaza", "west_clinic"] },

  // Oval loop
  main_n:  { id: "main_n",  x: 530, y: 1620, neighbors: ["gate1", "oval_sw"] },
  oval_sw: { id: "oval_sw", x: 555, y: 1450, neighbors: ["main_n", "oval_w", "oval_se"] },
  oval_w:  { id: "oval_w",  x: 545, y: 1280, neighbors: ["oval_sw", "scihs_jct", "oval_n"] },
  oval_se: { id: "oval_se", x: 700, y: 1450, neighbors: ["oval_sw", "s_court", "oval_e"] },
  oval_e:  { id: "oval_e",  x: 780, y: 1280, neighbors: ["oval_se", "osas_jct", "oval_n"] },
  oval_n:  { id: "oval_n",  x: 650, y: 1180, neighbors: ["oval_w", "oval_e", "admin_jct", "grad_jct"] },

  // Admin / CEd row
  admin_jct: { id: "admin_jct", x: 473, y: 1100, neighbors: ["oval_n", "coed_jct", "ceit_jct", "quad_jct"] },
  coed_jct:  { id: "coed_jct",  x: 397, y: 1100, neighbors: ["admin_jct", "ceit_jct", "scihs_jct"] },
  ceit_jct:  { id: "ceit_jct",  x: 339, y: 1033, neighbors: ["coed_jct", "child_dev_jct", "admin_jct"] },
  grad_jct:  { id: "grad_jct",  x: 798, y: 1078, neighbors: ["oval_n", "gad_jct", "library_jct", "rolle_jct"] },

  // Upper-college row (y ~ 970)
  child_dev_jct: { id: "child_dev_jct", x: 281, y: 967, neighbors: ["ceit_jct", "gate2_jct", "old_cemds_jct"] },
  gate2_jct:     { id: "gate2_jct",     x: 223, y: 1078, neighbors: ["child_dev_jct", "chapel_jct"] },
  old_cemds_jct: { id: "old_cemds_jct", x: 734, y: 967, neighbors: ["child_dev_jct", "cas_jct", "grad_jct"] },
  cas_jct:       { id: "cas_jct",       x: 943, y: 967, neighbors: ["old_cemds_jct", "cthm_jct", "gad_jct"] },
  cthm_jct:      { id: "cthm_jct",      x: 1175, y: 967, neighbors: ["cas_jct", "cemds_jct", "agri_eco_jct"] },
  gad_jct:       { id: "gad_jct",       x: 937, y: 1000, neighbors: ["cas_jct", "library_jct", "grad_jct", "con_jct"] },

  // East cluster
  library_jct:  { id: "library_jct",  x: 1053, y: 1100, neighbors: ["grad_jct", "gad_jct", "research_jct", "cemds_jct"] },
  research_jct: { id: "research_jct", x: 1187, y: 1100, neighbors: ["library_jct", "cthm_jct", "cemds_jct"] },
  cemds_jct:    { id: "cemds_jct",    x: 1245, y: 1178, neighbors: ["library_jct", "research_jct", "cafenr_jct"] },
  cafenr_jct:   { id: "cafenr_jct",   x: 1152, y: 1300, neighbors: ["cemds_jct", "dcs_jct", "processing_jct"] },
  dcs_jct:      { id: "dcs_jct",      x: 1082, y: 1300, neighbors: ["cafenr_jct", "osas_jct"] },

  // East agri ring
  processing_jct: { id: "processing_jct", x: 1268, y: 1467, neighbors: ["cafenr_jct", "demo_jct"] },
  demo_jct:       { id: "demo_jct",       x: 1361, y: 1467, neighbors: ["processing_jct", "ncrdec_s"] },
  ncrdec_s:       { id: "ncrdec_s",       x: 1430, y: 1578, neighbors: ["demo_jct", "s_girls"] },

  // West side
  chapel_jct:  { id: "chapel_jct",  x: 246, y: 1178, neighbors: ["gate2_jct", "ccj_jct"] },
  ccj_jct:     { id: "ccj_jct",     x: 235, y: 1300, neighbors: ["chapel_jct", "west_clinic", "scihs_jct"] },
  west_clinic: { id: "west_clinic", x: 275, y: 1411, neighbors: ["ccj_jct", "softball_jct"] },
  scihs_jct:   { id: "scihs_jct",   x: 421, y: 1300, neighbors: ["ccj_jct", "quad_jct", "oval_w", "coed_jct"] },
  quad_jct:    { id: "quad_jct",    x: 467, y: 1300, neighbors: ["scihs_jct", "admin_jct"] },

  // Sports / OSAS / Gym
  osas_jct: { id: "osas_jct", x: 920, y: 1544, neighbors: ["oval_e", "gym_jct", "dcs_jct"] },
  gym_jct:  { id: "gym_jct",  x: 931, y: 1700, neighbors: ["osas_jct", "s_mall", "s_boys"] },

  // Upper / North
  rolle_jct:  { id: "rolle_jct",  x: 711, y: 711, neighbors: ["grad_jct", "icon_jct", "old_cemds_jct"] },
  icon_jct:   { id: "icon_jct",   x: 856, y: 711, neighbors: ["rolle_jct", "lagoon_jct", "cvmbs_jct"] },
  lagoon_jct: { id: "lagoon_jct", x: 995, y: 711, neighbors: ["icon_jct", "saluysoy_jct", "con_jct"] },
  con_jct:    { id: "con_jct",    x: 925, y: 900, neighbors: ["gad_jct", "lagoon_jct", "cvmbs_jct"] },

  // North-east cluster
  saluysoy_jct: { id: "saluysoy_jct", x: 1245, y: 711, neighbors: ["lagoon_jct", "bano_jct", "agri_eco_jct"] },
  bano_jct:     { id: "bano_jct",     x: 1245, y: 622, neighbors: ["saluysoy_jct", "das_jct"] },
  agri_eco_jct: { id: "agri_eco_jct", x: 1291, y: 800, neighbors: ["saluysoy_jct", "hostel_jct", "cthm_jct"] },
  hostel_jct:   { id: "hostel_jct",   x: 1268, y: 900, neighbors: ["agri_eco_jct", "cthm_jct"] },

  // Far north
  cvmbs_jct:     { id: "cvmbs_jct",     x: 856, y: 478, neighbors: ["icon_jct", "con_jct", "star_farm_jct"] },
  star_farm_jct: { id: "star_farm_jct", x: 1013, y: 356, neighbors: ["cvmbs_jct", "das_jct"] },
  das_jct:       { id: "das_jct",       x: 1134, y: 478, neighbors: ["star_farm_jct", "bano_jct"] },
};

const _WAYPOINT_LIST = Object.values(WAYPOINTS);

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Nearest waypoint to a building, used as the entry/exit point onto the road graph. */
export function nearestWaypoint(p: { x: number; y: number }): Waypoint {
  let best = _WAYPOINT_LIST[0];
  let bestD = dist2(p, best);
  for (const w of _WAYPOINT_LIST) {
    const d = dist2(p, w);
    if (d < bestD) { best = w; bestD = d; }
  }
  return best;
}

/** Dijkstra's algorithm on the waypoint graph. Returns the sequence of waypoint ids. */
function dijkstra(startId: string, goalId: string): string[] {
  if (startId === goalId) return [startId];
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set<string>();
  for (const id of Object.keys(WAYPOINTS)) {
    dist[id] = Infinity;
    prev[id] = null;
    unvisited.add(id);
  }
  dist[startId] = 0;

  while (unvisited.size > 0) {
    // Pick the unvisited node with smallest dist.
    let current: string | null = null;
    let currentD = Infinity;
    for (const id of unvisited) {
      if (dist[id] < currentD) { current = id; currentD = dist[id]; }
    }
    if (current === null || currentD === Infinity) break;
    if (current === goalId) break;
    unvisited.delete(current);
    const node = WAYPOINTS[current];
    for (const nId of node.neighbors) {
      if (!unvisited.has(nId)) continue;
      const alt = dist[current] + Math.sqrt(dist2(node, WAYPOINTS[nId]));
      if (alt < dist[nId]) {
        dist[nId] = alt;
        prev[nId] = current;
      }
    }
  }

  // Reconstruct path.
  const path: string[] = [];
  let cur: string | null = goalId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path[0] === startId ? path : [];
}

/** Build a complete route from building A to building B as an array of (x, y) points. */
/**
 * Build a route from building A to building B as an array of points that
 * strictly hugs the waypoint graph (road network). The building centers are
 * **not** included — the polyline ends at the nearest waypoint to each
 * building, so the line never cuts diagonally through other buildings.
 * The FROM/TO badges on the map continue to mark the actual building
 * locations, so the user still sees where the trip starts and ends.
 *
 * Empty array means same building or no path; the caller should skip drawing.
 */
export function routeBetween(
  from: Building,
  to: Building,
): ReadonlyArray<{ x: number; y: number }> {
  if (from.id === to.id) return [];
  const fromW = nearestWaypoint(from);
  const toW = nearestWaypoint(to);
  const wpIds = dijkstra(fromW.id, toW.id);
  return wpIds.map((id) => ({ x: WAYPOINTS[id].x, y: WAYPOINTS[id].y }));
}

/** Polyline path attribute string from an array of points. */
export function pointsToPath(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
}
