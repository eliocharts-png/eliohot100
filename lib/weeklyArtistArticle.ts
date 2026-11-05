
import type {
  WeeklyArtistEntry,
} from '@/lib/weeklyArtistData';

import type {
  ArtistMover,
  WeeklyArtistAnalysis,
} from '@/lib/weeklyArtistAnalysis';

/*
 * =========================================================
 * HEADLINE VERB ROTATION
 * =========================================================
 */

const headlineVerbs = {
  debut: [
    'Debuts',
    'Arrives',
    'Enters',
    'Opens',
    'Lands',
  ],
  holds: [
    'Holds',
    'Remains',
    'Stays',
    'Retains',
    'Defends',
  ],
  rises: [
    'Rises',
    'Climbs',
    'Ascends',
    'Surges',
    'Soars',
    'Claims',
  ],
  returns: [
    'Returns',
    'Reclaims',
    'Regains',
    'Retakes',
    'Recaptures',
  ],
  reenters: [
    'Re-enters',
    'Arrives',
    'Returns',
    'Lands',
  ],
} as const;

function getHeadlineVerb(
  category: keyof typeof headlineVerbs,
  analysis: WeeklyArtistAnalysis,
): string {
  const options = headlineVerbs[category];

  const seed = [
    analysis.week,
    analysis.numberOne?.artist ?? '',
    category,
  ].join('|');

  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return options[hash % options.length];
}

/*
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

function artistName(
  entry: WeeklyArtistEntry,
): string {
  return entry.artist;
}

function formatMovement(
  entry: WeeklyArtistEntry,
): string {
  if (entry.movementIcon === 'debut') {
    return `debuts at No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'reentry') {
    return `re-enters at No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'up') {
    const movement =
      entry.lastWeekRank! - entry.rank;

    return `rises ${movement} ${
      movement === 1 ? 'place' : 'places'
    } to No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'down') {
    return `falls to No. ${entry.rank}`;
  }

  return `holds at No. ${entry.rank}`;
}

function hasPreviouslyReachedNumberOne(
  entry: WeeklyArtistEntry,
): boolean {
  if (!Array.isArray(entry.chartHistory)) {
    return false;
  }

  return entry.chartHistory.some(
    (history) =>
      history.rank === 1 &&
      history.week !== entry.week,
  );
}

/*
 * =========================================================
 * NUMBER ONE
 * =========================================================
 */

function getNumberOneParagraph(
  analysis: WeeklyArtistAnalysis,
): string {
  const entry = analysis.numberOne;

  if (!entry) {
    return '';
  }

  const name = artistName(entry);

  let paragraph: string;

  if (entry.movementIcon === 'debut') {
    paragraph = `${name} makes an impressive debut at No. 1 on the Artist Chart.`;
  } else if (entry.movementIcon === 'reentry') {
    paragraph = `${name} returns to the Artist Chart at No. 1.`;
  } else if (entry.lastWeekRank === 1) {
    paragraph = `${name} holds at No. 1 on the Artist Chart for another week.`;
  } else {
    paragraph = `${name} climbs to No. 1 on the Artist Chart, taking over the top position this week.`;
  }

  if (entry.weeksAtNumberOne > 1) {
    paragraph += ` The artist has now spent ${entry.weeksAtNumberOne} weeks at No. 1.`;
  } else if (entry.weeksAtNumberOne === 1) {
    paragraph += ' It marks the artist’s first week at the summit.';
  }

  paragraph += ` ${entry.songsOnChart} ${
    entry.songsOnChart === 1
      ? 'song contributes'
      : 'songs contribute'
  } to the artist’s chart points this week.`;

  return paragraph;
}

/*
 * =========================================================
 * TOP THREE
 * =========================================================
 */

function getTopThreeParagraph(
  analysis: WeeklyArtistAnalysis,
): string {
  const entries = analysis.top10.filter(
    (entry) =>
      entry.rank === 2 ||
      entry.rank === 3,
  );

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(
      (entry) =>
        `${artistName(entry)} ${formatMovement(entry)}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * TOP 10 MOVEMENTS
 * =========================================================
 */

function getTop10MovementParagraph(
  analysis: WeeklyArtistAnalysis,
): string {
  const entries = analysis.top10.filter(
    (entry) => entry.rank >= 4,
  );

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(
      (entry) =>
        `${artistName(entry)} ${formatMovement(entry)}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
 */

function getDebutParagraph(
  analysis: WeeklyArtistAnalysis,
): string {
  const debuts = analysis.debuts
    .filter((entry) => entry.rank <= 20)
    .sort((a, b) => a.rank - b.rank);

  if (debuts.length === 0) {
    return '';
  }

  const highest = debuts[0];

  if (debuts.length === 1) {
    return `${artistName(highest)} earns the week's highest debut, entering the Artist Chart at No. ${highest.rank}.`;
  }

  const others = debuts
    .slice(1)
    .map(
      (entry) =>
        `${artistName(entry)} at No. ${entry.rank}`,
    );

  return `${artistName(highest)} leads this week's new entries, debuting at No. ${highest.rank}. Other debuts inside the top 20 include ${others.join('; ')}.`;
}

/*
 * =========================================================
 * RE-ENTRIES
 * =========================================================
 */

function getReentryParagraph(
  analysis: WeeklyArtistAnalysis,
): string {
  const reentries = analysis.reentries
    .filter((entry) => entry.rank <= 20)
    .sort((a, b) => a.rank - b.rank);

  if (reentries.length === 0) {
    return '';
  }

  return reentries
    .map(
      (entry) =>
        `${artistName(entry)} returns to the Artist Chart at No. ${entry.rank}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * BIGGEST CLIMBER
 * =========================================================
 */

function getClimberParagraph(
  climber: ArtistMover | null,
): string {
  if (!climber || climber.movement < 2) {
    return '';
  }

  const { entry, movement } = climber;

  return `${artistName(entry)} makes the week's biggest climb, moving up ${movement} places to No. ${entry.rank}.`;
}

/*
 * =========================================================
 * MAIN ARTICLE
 * =========================================================
 */

export function generateWeeklyArtistArticle(
  analysis: WeeklyArtistAnalysis,
): string {
  if (
    !analysis.numberOne &&
    analysis.top10.length === 0
  ) {
    return '';
  }

  const paragraphs = [
    getNumberOneParagraph(analysis),
    getTopThreeParagraph(analysis),
    getTop10MovementParagraph(analysis),
    getDebutParagraph(analysis),
    getReentryParagraph(analysis),
    getClimberParagraph(analysis.biggestClimber),
  ].filter(Boolean);

  return paragraphs.join('\n\n');
}

/*
 * =========================================================
 * HEADLINE
 * =========================================================
 */

export function getWeeklyArtistArticleTitle(
  analysis: WeeklyArtistAnalysis,
): string {
  const numberOne = analysis.numberOne;

  if (!numberOne) {
    return 'This Week on the Artist Chart';
  }

  let category: keyof typeof headlineVerbs;

  if (numberOne.lastWeekRank === 1) {
    category = 'holds';
  } else if (hasPreviouslyReachedNumberOne(numberOne)) {
    category = 'returns';
  } else if (numberOne.movementIcon === 'debut') {
    category = 'debut';
  } else if (numberOne.movementIcon === 'reentry') {
    category = 'reenters';
  } else {
    category = 'rises';
  }

  const verb = getHeadlineVerb(
    category,
    analysis,
  );

  const destination =
    category === 'holds' ||
    category === 'reenters'
      ? 'at No. 1'
      : 'to No. 1';

  return `${numberOne.artist} ${verb} ${destination} on the Artist Chart`;
}
