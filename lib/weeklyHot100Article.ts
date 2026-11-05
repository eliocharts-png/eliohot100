
import type {
  NewPeak,
  WeeklyChartEntry,
  WeeklyHot100Analysis,
} from '@/types';

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
    'Returns',
    'Lands',
    'Arrives',
  ],
} as const;

function getHeadlineVerb(
  category: keyof typeof headlineVerbs,
  analysis: WeeklyHot100Analysis
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

function songName(
  title: string,
  artist: string
): string {
  return `"${title}" by ${artist}`;
}

function formatMovement(
  entry: WeeklyChartEntry
): string {
  const song = songName(
    entry.title,
    entry.artist
  );

  const lastWeek = entry.lastWeekRank;
  const rank = entry.rank;

  if (lastWeek === null) {
    return `${song} makes its chart debut at No. ${rank}`;
  }

  if (lastWeek > rank) {
    const movement = lastWeek - rank;

    return `${song} climbs ${movement} ${
      movement === 1 ? 'place' : 'places'
    } to No. ${rank}`;
  }

  if (lastWeek < rank) {
    const movement = rank - lastWeek;

    return `${song} slips ${movement} ${
      movement === 1 ? 'place' : 'places'
    } to No. ${rank}`;
  }

  return `${song} holds at No. ${rank}`;
}

/*
 * =========================================================
 * TOP 10
 * =========================================================
 */

function getTop10Paragraphs(
  analysis: WeeklyHot100Analysis
): string[] {
  const top10 = [...analysis.top10]
    .sort(
      (a, b) => a.rank - b.rank
    )
    .slice(0, 10);

  if (top10.length === 0) {
    return [];
  }

  const paragraphs: string[] = [];

  const numberOne = top10[0];

  if (numberOne) {
    const song = songName(
      numberOne.title,
      numberOne.artist
    );

    const lastWeek = numberOne.lastWeekRank;

    if (lastWeek === null) {
      paragraphs.push(
        `${song} makes an immediate impact, debuting at No. 1.`
      );
    } else if (lastWeek === 1) {
      paragraphs.push(
        `${song} holds on to the No. 1 position for another week.`
      );
    } else {
      const movement = lastWeek - 1;

      paragraphs.push(
        `${song} climbs ${movement} ${
          movement === 1 ? 'place' : 'places'
        } from No. ${lastWeek} to claim the top spot.`
      );
    }
  }

  /*
   * Nos. 2 and 3.
   */

  const second = top10[1];
  const third = top10[2];

  if (second && third) {
    paragraphs.push(
      `${formatMovement(second)}, while ${formatMovement(third)}.`
    );
  } else if (second) {
    paragraphs.push(
      `${formatMovement(second)}.`
    );
  }

  /*
   * Nos. 4–10.
   *
   * Group movements into shorter sentences.
   */

  const remaining = top10.slice(3);

  for (
    let i = 0;
    i < remaining.length;
    i += 2
  ) {
    const first = remaining[i];
    const secondEntry = remaining[i + 1];

    if (!first) continue;

    if (secondEntry) {
      paragraphs.push(
        `Meanwhile, ${formatMovement(first)}, while ${formatMovement(secondEntry)}.`
      );
    } else {
      paragraphs.push(
        `${formatMovement(first)}.`
      );
    }
  }

  return paragraphs;
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
 *
 * Include:
 * - The highest debut of the week.
 * - Other debuts entering the Top 20.
 *
 * Lower chart debuts are omitted.
 * =========================================================
 */

function getDebutsParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const debuts = [...analysis.debuts]
    .sort(
      (a, b) => a.rank - b.rank
    );

  if (debuts.length === 0) {
    return '';
  }

  const highestDebut = debuts[0];

  if (!highestDebut) {
    return '';
  }

  const notableDebuts = debuts.filter(
    (entry) => entry.rank <= 20
  );

  const otherDebuts = notableDebuts.filter(
    (entry) =>
      entry.title !== highestDebut.title ||
      entry.artist !== highestDebut.artist
  );

  const paragraphs: string[] = [];

  paragraphs.push(
    `The week's highest debut belongs to ${songName(
      highestDebut.title,
      highestDebut.artist
    )}, which enters at No. ${highestDebut.rank}.`
  );

  if (otherDebuts.length > 0) {
    const names = otherDebuts.map(
      (entry) =>
        `${songName(
          entry.title,
          entry.artist
        )} at No. ${entry.rank}`
    );

    paragraphs.push(
      `Other notable new entries include ${names.join('; ')}.`
    );
  }

  return paragraphs.join('\n\n');
}

/*
 * =========================================================
 * NEW PEAKS
 * =========================================================
 *
 * Only include new peaks at Nos. 11–20.
 *
 * Top 10 new peaks are already covered in the
 * opening section.
 * =========================================================
 */

function getNewPeaksParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const peaks = [...analysis.newPeaks]
    .filter(
      (peak: NewPeak) =>
        peak.entry.rank > 10 &&
        peak.entry.rank <= 20
    )
    .sort(
      (a, b) =>
        a.entry.rank - b.entry.rank
    );

  if (peaks.length === 0) {
    return '';
  }

  const names = peaks.map(
    (peak) =>
      `${songName(
        peak.entry.title,
        peak.entry.artist
      )} at No. ${peak.entry.rank}`
  );

  if (names.length === 1) {
    return `Among this week's notable milestones, ${names[0]} reaches a new career peak.`;
  }

  return `Several songs reach new career highs this week, including ${names.join('; ')}.`;
}

/*
 * =========================================================
 * MAIN ARTICLE
 * =========================================================
 */

export function generateWeeklyHot100Article(
  analysis: WeeklyHot100Analysis
): string {
  if (analysis.top10.length === 0) {
    return '';
  }

  const paragraphs: string[] = [];

  /*
   * 1. Top 10 coverage.
   */

  paragraphs.push(
    ...getTop10Paragraphs(analysis)
  );

  /*
   * 2. Notable debuts.
   */

  const debuts = getDebutsParagraph(
    analysis
  );

  if (debuts) {
    paragraphs.push(debuts);
  }

  /*
   * 3. New peaks within the Top 20.
   */

  const newPeaks = getNewPeaksParagraph(
    analysis
  );

  if (newPeaks) {
    paragraphs.push(newPeaks);
  }

  return paragraphs
    .map(
      (paragraph) => paragraph.trim()
    )
    .filter(
      (paragraph) => paragraph.length > 0
    )
    .join('\n\n');
}

/*
 * =========================================================
 * HEADLINE
 * =========================================================
 */

export function getWeeklyHot100ArticleTitle(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne = analysis.numberOne;

  if (numberOne) {
    const previouslyReachedNumberOne =
      numberOne.chartHistory.some(
        (history) =>
          history.rank === 1 &&
          history.week !== numberOne.week
      );

    let category: keyof typeof headlineVerbs;

    if (numberOne.lastWeekRank === 1) {
      category = 'holds';
    } else if (previouslyReachedNumberOne) {
      category = 'returns';
    } else if (
      numberOne.lastWeekRank === null &&
      !numberOne.hasAnyPriorAppearance
    ) {
      category = 'debut';
    } else if (numberOne.lastWeekRank === null) {
      category = 'reenters';
    } else {
      category = 'rises';
    }

    const verb = getHeadlineVerb(
      category,
      analysis
    );

    const destination =
      category === 'holds'
        ? 'at No. 1'
        : category === 'returns'
          ? 'to No. 1'
          : category === 'reenters'
            ? 'at No. 1'
            : category === 'debut'
              ? 'at No. 1'
              : 'to No. 1';

    return `"${numberOne.title}" ${verb} ${destination} on the Elio Hot 100`;
  }

  const topSong = [...analysis.top10]
    .sort(
      (a, b) => a.rank - b.rank
    )[0];

  if (topSong) {
    return `"${topSong.title}" Leads This Week's Elio Hot 100 Top 10`;
  }

  return 'This Week on the Elio Hot 100';
}
