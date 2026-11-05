
import type {
  AlbumWeeklyEntry,
} from '@/lib/albumChartData';

import type {
  AlbumMover,
  AlbumNewPeak,
  WeeklyAlbumAnalysis,
} from '@/lib/weeklyAlbumAnalysis';

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
  analysis: WeeklyAlbumAnalysis,
): string {
  const options = headlineVerbs[category];

  const seed = [
    analysis.week,
    analysis.numberOne?.title ?? '',
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

function albumName(
  entry: AlbumWeeklyEntry,
): string {
  return `"${entry.title}" by ${entry.artist}`;
}

function formatMovement(
  entry: AlbumWeeklyEntry,
): string {
  if (entry.movementIcon === 'debut') {
    return `debuts at No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'reentry') {
    return `re-enters at No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'up') {
    return `rises ${entry.lastWeekRank! - entry.rank} ${
      entry.lastWeekRank! - entry.rank === 1
        ? 'place'
        : 'places'
    } to No. ${entry.rank}`;
  }

  if (entry.movementIcon === 'down') {
    return `falls to No. ${entry.rank}`;
  }

  return `holds at No. ${entry.rank}`;
}

function hasPreviouslyReachedNumberOne(
  entry: AlbumWeeklyEntry,
): boolean {
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
  analysis: WeeklyAlbumAnalysis,
): string {
  const entry = analysis.numberOne;

  if (!entry) {
    return '';
  }

  const name = albumName(entry);
  const weeks = analysis.weeksAtNumberOne;

  let opening: string;

  if (entry.movementIcon === 'debut') {
    opening = `${name} makes an impressive entrance, debuting at No. 1 on the Top Records chart.`;
  } else if (entry.movementIcon === 'reentry') {
    opening = `${name} returns to the chart at No. 1.`;
  } else if (entry.lastWeekRank === 1) {
    opening = `${name} holds at No. 1 for another week.`;
  } else {
    opening = `${name} climbs to No. 1, taking over the top position this week.`;
  }

  if (weeks > 1) {
    opening += ` The album has now spent ${weeks} ${
      weeks === 1 ? 'week' : 'weeks'
    } at the summit.`;
  } else {
    opening += ' It earns its first week at the summit.';
  }

  return opening;
}

/*
 * =========================================================
 * TOP THREE
 * =========================================================
 */

function getTopThreeParagraph(
  analysis: WeeklyAlbumAnalysis,
): string {
  const entries = analysis.top10.filter(
    (entry) => entry.rank === 2 || entry.rank === 3,
  );

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(
      (entry) =>
        `${albumName(entry)} ${formatMovement(entry)}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * TOP 10 MOVEMENTS
 * =========================================================
 */

function getTop10MovementParagraph(
  analysis: WeeklyAlbumAnalysis,
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
        `${albumName(entry)} ${formatMovement(entry)}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
 */

function getDebutParagraph(
  analysis: WeeklyAlbumAnalysis,
): string {
  const debuts = analysis.debuts
    .filter((entry) => entry.rank <= 20)
    .sort((a, b) => a.rank - b.rank);

  if (debuts.length === 0) {
    return '';
  }

  const highest = debuts[0];

  if (debuts.length === 1) {
    return `${albumName(highest)} scores the week's highest debut, entering at No. ${highest.rank}.`;
  }

  const others = debuts
    .slice(1)
    .map(
      (entry) =>
        `${albumName(entry)} at No. ${entry.rank}`,
    );

  return `${albumName(highest)} leads this week's new entries, debuting at No. ${highest.rank}. Other debuts inside the top 20 include ${others.join('; ')}.`;
}

/*
 * =========================================================
 * RE-ENTRIES
 * =========================================================
 */

function getReentryParagraph(
  analysis: WeeklyAlbumAnalysis,
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
        `${albumName(entry)} returns to the chart at No. ${entry.rank}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * NEW PEAKS
 * =========================================================
 */

function getNewPeakParagraph(
  newPeaks: AlbumNewPeak[],
): string {
  const notable = newPeaks
    .filter(
      ({ entry }) => entry.rank <= 20,
    )
    .sort(
      (a, b) =>
        a.entry.rank - b.entry.rank,
    );

  if (notable.length === 0) {
    return '';
  }

  return notable
    .map(
      ({ entry, previousPeak }) =>
        `${albumName(entry)} reaches a new high, improving on its previous peak of No. ${previousPeak} to land at No. ${entry.rank}.`,
    )
    .join(' ');
}

/*
 * =========================================================
 * BIGGEST CLIMBER
 * =========================================================
 */

function getClimberParagraph(
  climber: AlbumMover | null,
): string {
  if (!climber || climber.movement < 2) {
    return '';
  }

  const { entry, movement } = climber;

  return `${albumName(entry)} makes the week's biggest climb, moving up ${movement} ${
    movement === 1 ? 'place' : 'places'
  } to No. ${entry.rank}.`;
}

/*
 * =========================================================
 * MAIN ARTICLE
 * =========================================================
 */

export function generateWeeklyAlbumArticle(
  analysis: WeeklyAlbumAnalysis,
): string {
  if (!analysis.numberOne && analysis.top10.length === 0) {
    return '';
  }

  const paragraphs = [
    getNumberOneParagraph(analysis),
    getTopThreeParagraph(analysis),
    getTop10MovementParagraph(analysis),
    getDebutParagraph(analysis),
    getReentryParagraph(analysis),
    getNewPeakParagraph(analysis.newPeaks),
    getClimberParagraph(analysis.biggestClimber),
  ].filter(Boolean);

  return paragraphs.join('\n\n');
}

/*
 * =========================================================
 * HEADLINE
 * =========================================================
 */

export function getWeeklyAlbumArticleTitle(
  analysis: WeeklyAlbumAnalysis,
): string {
  const numberOne = analysis.numberOne;

  if (!numberOne) {
    return 'This Week on the Top Records Chart';
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
    category === 'holds'
      ? 'at No. 1'
      : category === 'reenters'
        ? 'at No. 1'
        : 'to No. 1';

  return `"${numberOne.title}" ${verb} ${destination} on the Top Records Chart`;
}
