import type { TestCentre } from "./types";

/**
 * Launch-area test centres (PRD §23.1). Static, public information only — no
 * availability data is ever stored or scraped. Postcode areas are seed values
 * to verify against the public GOV.UK test-centre list before launch.
 */
export const TEST_CENTRES: TestCentre[] = [
  {
    slug: "high-wycombe",
    name: "High Wycombe",
    county: "Buckinghamshire",
    postcodeArea: "HP13",
    nearby: ["aylesbury", "uxbridge", "reading", "slough"],
    blurb:
      "High Wycombe is one of Buckinghamshire’s busiest practical test centres, and learners often face long stretches with nothing showing. TestSlot Radar tracks what the community reports here so you know when it’s worth checking GOV.UK yourself.",
  },
  {
    slug: "aylesbury",
    name: "Aylesbury",
    county: "Buckinghamshire",
    postcodeArea: "HP19",
    nearby: ["high-wycombe", "bletchley", "oxford", "watford"],
    blurb:
      "Aylesbury serves much of central Buckinghamshire. Learners share when they’ve seen activity here so others know which days and times have been worth a manual check on GOV.UK.",
  },
  {
    slug: "slough",
    name: "Slough",
    county: "Berkshire",
    postcodeArea: "SL1",
    nearby: ["uxbridge", "reading", "high-wycombe", "greenford"],
    blurb:
      "Slough is a high-demand centre on the Berkshire–London border. Community reports help learners spot when nearby centres are quieter or busier than usual.",
  },
  {
    slug: "reading",
    name: "Reading",
    county: "Berkshire",
    postcodeArea: "RG2",
    nearby: ["slough", "high-wycombe", "oxford"],
    blurb:
      "Reading is one of Berkshire’s largest test centres. See what other learners have reported recently before you spend time checking GOV.UK.",
  },
  {
    slug: "uxbridge",
    name: "Uxbridge",
    county: "Greater London (Hillingdon)",
    postcodeArea: "UB8",
    nearby: ["slough", "greenford", "high-wycombe", "watford"],
    blurb:
      "Uxbridge is a popular west-London centre for learners across Hillingdon and south Bucks. Community reports show which nearby centres have been showing activity.",
  },
  {
    slug: "greenford",
    name: "Greenford",
    county: "Greater London (Ealing)",
    postcodeArea: "UB6",
    nearby: ["uxbridge", "watford", "slough"],
    blurb:
      "Greenford covers much of west London. Learners share what they’ve seen so the community knows which centres are worth a manual check.",
  },
  {
    slug: "watford",
    name: "Watford",
    county: "Hertfordshire",
    postcodeArea: "WD18",
    nearby: ["st-albans", "uxbridge", "greenford", "luton"],
    blurb:
      "Watford serves south-west Hertfordshire and the north-London fringe. Community-reported patterns help learners compare it with nearby centres.",
  },
  {
    slug: "bletchley",
    name: "Bletchley (Milton Keynes)",
    county: "Buckinghamshire",
    postcodeArea: "MK2",
    nearby: ["aylesbury", "luton", "oxford"],
    blurb:
      "Bletchley is the main practical test centre for Milton Keynes. See recent community reports before deciding where to focus your manual GOV.UK checks.",
  },
  {
    slug: "oxford",
    name: "Oxford (Cowley)",
    county: "Oxfordshire",
    postcodeArea: "OX4",
    nearby: ["aylesbury", "reading", "bletchley"],
    blurb:
      "Oxford’s Cowley centre serves the city and surrounding Oxfordshire. Learners report what they’ve seen so others know which times have been busier.",
  },
  {
    slug: "st-albans",
    name: "St Albans",
    county: "Hertfordshire",
    postcodeArea: "AL1",
    nearby: ["watford", "luton"],
    blurb:
      "St Albans serves central Hertfordshire. Community reports help learners decide whether to check here or try a nearby centre.",
  },
  {
    slug: "luton",
    name: "Luton",
    county: "Bedfordshire",
    postcodeArea: "LU4",
    nearby: ["st-albans", "watford", "bletchley"],
    blurb:
      "Luton is the main practical test centre for Bedfordshire’s south. See what the community has reported recently before checking GOV.UK yourself.",
  },
];

/** Lookup a centre by slug. */
export function getCentreBySlug(slug: string): TestCentre | undefined {
  return TEST_CENTRES.find((c) => c.slug === slug);
}

/** Resolve nearby slugs to full centre records. */
export function getNearbyCentres(centre: TestCentre): TestCentre[] {
  return centre.nearby
    .map((slug) => getCentreBySlug(slug))
    .filter((c): c is TestCentre => Boolean(c));
}

/** All known centre slugs — used to validate user input. */
export const CENTRE_SLUGS: string[] = TEST_CENTRES.map((c) => c.slug);

export function isKnownCentre(slug: string): boolean {
  return CENTRE_SLUGS.includes(slug);
}
