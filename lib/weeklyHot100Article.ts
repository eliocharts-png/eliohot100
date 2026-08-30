import type {
  NewPeak,
  WeeklyChartEntry,
  WeeklyHot100Analysis,
} from '@/types';

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

/*
 * =========================================================
 * TOP 10 MOVEMENT
 * =========================================================
 */

function buildTop10Sentence(
  entry: WeeklyChartEntry
): string {
  const song = songName(
    entry.title,
    entry.artist
  );

  const rank = entry.rank;
  const lastWeek = entry.lastWeekRank;

  /*
   * No previous rank = debut.
   */
  if (lastWeek === null) {
    return `${song} debuts at No. ${rank}`;
  }

  /*
   * Rose.
   */
  if (lastWeek > rank) {
    return `${song} rises from No. ${lastWeek} to No. ${rank}`;
  }

  /*
   * Fell.
   */
  if (lastWeek < rank) {
    return `${song} falls from No. ${lastWeek} to No. ${rank}`;
  }

  /*
   * Stayed.
   */
  return `${song} holds at No. ${rank}`;
}

/*
 * =========================================================
 * TOP 10 PARAGRAPH
 * =========================================================
 */

function getTop10Paragraph(
  analysis: WeeklyHot100Analysis
): string {
  const top10 =
    [...analysis.top10]
      .sort(
        (a, b) =>
          a.rank - b.rank
      )
      .slice(0, 10);

  if (
    top10.length === 0
  ) {
    return '';
  }

  const phrases =
    top10.map(
      (entry) =>
        buildTop10Sentence(entry)
    );

  /*
   * One song.
   */
  if (
    phrases.length === 1
  ) {
    return `${phrases[0]}.`;
  }

  /*
   * Two songs.
   */
  if (
    phrases.length === 2
  ) {
    return `${phrases[0]}, while ${phrases[1]}.`;
  }

  /*
   * Start with No. 1.
   */
  let paragraph =
    phrases[0]!;

  /*
   * Connect No. 2.
   */
  paragraph +=
    `, while ${phrases[1]}`;

  /*
   * Add the remaining songs.
   */
  for (
    let i = 2;
    i < phrases.length;
    i++
  ) {
    const phrase =
      phrases[i]!;

    if (
      i === 2 ||
      i === 5 ||
      i === 8
    ) {
      paragraph +=
        `, while ${phrase}`;
    } else {
      paragraph +=
        `, ${phrase}`;
    }
  }

  return `${paragraph}.`;
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
 */

function getDebutsParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const debuts =
    [...analysis.debuts]
      .sort(
        (a, b) =>
          a.rank - b.rank
      );

  if (
    debuts.length === 0
  ) {
    return '';
  }

  const names =
    debuts.map(
      (entry) =>
        `${songName(
          entry.title,
          entry.artist
        )} at No. ${entry.rank}`
    );

  if (
    names.length === 1
  ) {
    return `Debuting this week is ${names[0]}.`;
  }

  if (
    names.length === 2
  ) {
    return `Debuting this week are ${names[0]} and ${names[1]}.`;
  }

  return `Debuting this week are ${names
    .slice(0, -1)
    .join(', ')}, and ${
    names[names.length - 1]
  }.`;
}

/*
 * =========================================================
 * NEW PEAKS
 * =========================================================
 */

function getNewPeaksParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const peaks =
    [...analysis.newPeaks]
      .sort(
        (a, b) =>
          a.entry.rank -
          b.entry.rank
      );

  if (
    peaks.length === 0
  ) {
    return '';
  }

  const names =
    peaks.map(
      (peak: NewPeak) =>
        `${songName(
          peak.entry.title,
          peak.entry.artist
        )} at No. ${peak.entry.rank}`
    );

  if (
    names.length === 1
  ) {
    return `Reaching a new peak this week is ${names[0]}.`;
  }

  if (
    names.length === 2
  ) {
    return `Songs reaching new peaks this week are ${names[0]} and ${names[1]}.`;
  }

  return `Songs reaching new peaks this week are ${names
    .slice(0, -1)
    .join(', ')}, and ${
    names[names.length - 1]
  }.`;
}

/*
 * =========================================================
 * RE-ENTRIES
 * =========================================================
 */

function getReentriesParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const reentries =
    [...analysis.reentries]
      .sort(
        (a, b) =>
          a.rank - b.rank
      );

  if (
    reentries.length === 0
  ) {
    return '';
  }

  const names =
    reentries.map(
      (entry) =>
        `${songName(
          entry.title,
          entry.artist
        )} at No. ${entry.rank}`
    );

  if (
    names.length === 1
  ) {
    return `Returning to the chart this week is ${names[0]}.`;
  }

  if (
    names.length === 2
  ) {
    return `Returning to the chart this week are ${names[0]} and ${names[1]}.`;
  }

  return `Returning to the chart this week are ${names
    .slice(0, -1)
    .join(', ')}, and ${
    names[names.length - 1]
  }.`;
}

/*
 * =========================================================
 * MAIN ARTICLE
 * =========================================================
 */

export function generateWeeklyHot100Article(
  analysis: WeeklyHot100Analysis
): string {
  if (
    analysis.top10.length === 0
  ) {
    return '';
  }

  const paragraphs: string[] = [];

  /*
   * 1. Entire Top 10.
   */
  const top10 =
    getTop10Paragraph(
      analysis
    );

  if (top10) {
    paragraphs.push(
      top10
    );
  }

  /*
   * 2. Debuts.
   */
  const debuts =
    getDebutsParagraph(
      analysis
    );

  if (debuts) {
    paragraphs.push(
      debuts
    );
  }

  /*
   * 3. New peaks.
   */
  const newPeaks =
    getNewPeaksParagraph(
      analysis
    );

  if (newPeaks) {
    paragraphs.push(
      newPeaks
    );
  }

  /*
   * 4. Re-entries.
   */
  const reentries =
    getReentriesParagraph(
      analysis
    );

  if (reentries) {
    paragraphs.push(
      reentries
    );
  }

  return paragraphs
    .map(
      (paragraph) =>
        paragraph.trim()
    )
    .filter(
      (paragraph) =>
        paragraph.length > 0
    )
    .join('\n\n');
}

/*
 * =========================================================
 * SIMPLE HEADLINE
 * =========================================================
 */

export function getWeeklyHot100ArticleTitle(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne =
    analysis.numberOne;

  if (numberOne) {
    if (
      numberOne.lastWeekRank === 1
    ) {
      return `"${numberOne.title}" Remains No. 1 on the Elio Hot 100`;
    }

    if (
      numberOne.lastWeekRank === null
    ) {
      return `"${numberOne.title}" Debuts at No. 1 on the Elio Hot 100`;
    }

    return `"${numberOne.title}" Rises to No. 1 on the Elio Hot 100`;
  }

  const topSong =
    [...analysis.top10]
      .sort(
        (a, b) =>
          a.rank - b.rank
      )[0];

  if (topSong) {
    return `"${topSong.title}" Leads This Week's Elio Hot 100 Top 10`;
  }

  return 'This Week on the Elio Hot 100';
}