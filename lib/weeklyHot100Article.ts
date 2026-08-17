import type { WeeklyHot100Analysis } from '@/lib/weeklyHot100Analysis';

/*
 * =========================================================
 * BASIC FORMATTING HELPERS
 * =========================================================
 */

function formatMovement(
  entry: WeeklyHot100Analysis['top10'][number]
): string {
  if (entry.lastWeekRank === null) {
    return `debuts at No. ${entry.rank}`;
  }

  const movement =
    entry.lastWeekRank - entry.rank;

  if (movement > 0) {
    return `climbs ${movement} ${
      movement === 1 ? 'spot' : 'spots'
    } from No. ${entry.lastWeekRank} to No. ${entry.rank}`;
  }

  if (movement < 0) {
    const drop = Math.abs(movement);

    return `falls ${drop} ${
      drop === 1 ? 'spot' : 'spots'
    } from No. ${entry.lastWeekRank} to No. ${entry.rank}`;
  }

  return `holds steady at No. ${entry.rank}`;
}

function formatPointGain(
  points: number
): string {
  return Math.round(points).toLocaleString(
    'en-US'
  );
}

function songName(
  title: string,
  artist: string
): string {
  return `"${title}" by ${artist}`;
}

/*
 * =========================================================
 * TOP 10 STORY
 * =========================================================
 */

function getTop10Story(
  analysis: WeeklyHot100Analysis
): string {
  const entries = analysis.top10;

  if (entries.length === 0) {
    return '';
  }

  const notable = entries.filter(
    (entry) =>
      entry.lastWeekRank !== null &&
      entry.lastWeekRank !== entry.rank
  );

  if (notable.length === 0) {
    return `The Top 10 remains remarkably steady this week, with the leading songs largely holding their positions.`;
  }

  const biggest = [...notable].sort(
    (a, b) => {
      const aMovement =
        (a.lastWeekRank ?? a.rank) -
        a.rank;

      const bMovement =
        (b.lastWeekRank ?? b.rank) -
        b.rank;

      return bMovement - aMovement;
    }
  )[0];

  if (!biggest) {
    return '';
  }

  return `The Top 10 sees plenty of movement this week, with ${songName(
    biggest.title,
    biggest.artist
  )} making one of the section's most noticeable moves as it ${formatMovement(
    biggest
  )}.`;
}

/*
 * =========================================================
 * TOP 10 ENTRIES
 * =========================================================
 */

function getTop10EntryStory(
  analysis: WeeklyHot100Analysis
): string {
  const entries = analysis.top10Entries;

  if (entries.length === 0) {
    return '';
  }

  const first = entries[0];

  if (!first) {
    return '';
  }

  if (entries.length === 1) {
    return `${songName(
      first.title,
      first.artist
    )} also makes a notable breakthrough, entering the Top 10 at No. ${first.rank}.`;
  }

  const names = entries
    .slice(0, 3)
    .map(
      (entry) =>
        `${songName(
          entry.title,
          entry.artist
        )} at No. ${entry.rank}`
    )
    .join(', ');

  return `Several songs make their way into the Top 10 this week, led by ${names}.`;
}

/*
 * =========================================================
 * BIGGEST CLIMBER
 * =========================================================
 */

function getBiggestClimberStory(
  analysis: WeeklyHot100Analysis
): string {
  const climber =
    analysis.biggestClimber;

  if (!climber) {
    return '';
  }

  const {
    entry,
    movement,
  } = climber;

  if (movement <= 0) {
    return '';
  }

  const verbs = [
    'surges',
    'jumps',
    'leaps',
    'rockets',
    'charges',
  ];

  const verb =
    verbs[
      entry.rank % verbs.length
    ];

  return `One of the week's biggest movers is ${songName(
    entry.title,
    entry.artist
  )}, which ${verb} ${movement} ${
    movement === 1 ? 'spot' : 'spots'
  } from No. ${entry.lastWeekRank} to No. ${entry.rank}.`;
}

/*
 * =========================================================
 * BIGGEST POINT GAIN
 * =========================================================
 */

function getPointGainerStory(
  analysis: WeeklyHot100Analysis
): string {
  const gainer =
    analysis.biggestPointGainer;

  if (!gainer) {
    return '';
  }

  if (gainer.pointChange <= 0) {
    return '';
  }

  const verbs = [
    'posts',
    'delivers',
    'records',
    'collects',
    'scores',
  ];

  const verb =
    verbs[
      gainer.entry.rank %
        verbs.length
    ];

  return `${songName(
    gainer.entry.title,
    gainer.entry.artist
  )} ${verb} the week's biggest increase in points, gaining approximately ${formatPointGain(
    gainer.pointChange
  )} points from the previous week.`;
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
 */

function getDebutStory(
  analysis: WeeklyHot100Analysis
): string {
  const debuts = analysis.debuts;

  if (debuts.length === 0) {
    return '';
  }

  const sorted = [...debuts].sort(
    (a, b) => a.rank - b.rank
  );

  const strongest = sorted[0];

  if (!strongest) {
    return '';
  }

  if (debuts.length === 1) {
    const phrases = [
      `makes its Hot 100 debut`,
      `arrives on the Hot 100`,
      `enters the Hot 100 for the first time`,
      `lands on the chart`,
    ];

    const phrase =
      phrases[
        strongest.rank %
          phrases.length
      ];

    return `${songName(
      strongest.title,
      strongest.artist
    )} ${phrase} at No. ${strongest.rank}.`;
  }

  const additional =
    debuts.length - 1;

  return `The chart welcomes ${debuts.length} new titles this week, with ${songName(
    strongest.title,
    strongest.artist
  )} leading the newcomers at No. ${strongest.rank}${
    additional > 0
      ? ` alongside ${additional} other new entries`
      : ''
  }.`;
}

/*
 * =========================================================
 * RE-ENTRIES
 * =========================================================
 */

function getReentryStory(
  analysis: WeeklyHot100Analysis
): string {
  const reentries =
    analysis.reentries;

  if (reentries.length === 0) {
    return '';
  }

  const strongest =
    [...reentries].sort(
      (a, b) => a.rank - b.rank
    )[0];

  if (!strongest) {
    return '';
  }

  if (reentries.length === 1) {
    const phrases = [
      'returns to the chart',
      'makes a comeback on the Hot 100',
      'reappears on the Hot 100',
      'finds its way back onto the chart',
    ];

    const phrase =
      phrases[
        strongest.rank %
          phrases.length
      ];

    return `${songName(
      strongest.title,
      strongest.artist
    )} ${phrase} at No. ${strongest.rank}.`;
  }

  return `${reentries.length} songs make their way back onto the Hot 100 this week, led by ${songName(
    strongest.title,
    strongest.artist
  )} at No. ${strongest.rank}.`;
}

/*
 * =========================================================
 * NEW PEAKS
 * =========================================================
 */

function getNewPeakStory(
  analysis: WeeklyHot100Analysis
): string {
  const peaks = analysis.newPeaks;

  if (peaks.length === 0) {
    return '';
  }

  const strongest = peaks[0];

  if (!strongest) {
    return '';
  }

  if (peaks.length === 1) {
    const phrases = [
      'reaches a new career-best position',
      'sets a new chart peak',
      'achieves a new personal best on the Hot 100',
      'moves to a new high on the chart',
    ];

    const phrase =
      phrases[
        strongest.entry.rank %
          phrases.length
      ];

    return `${songName(
      strongest.entry.title,
      strongest.entry.artist
    )} ${phrase} this week at No. ${strongest.entry.rank}.`;
  }

  return `${peaks.length} songs establish new chart peaks this week, including ${songName(
    strongest.entry.title,
    strongest.entry.artist
  )}, which rises to No. ${strongest.entry.rank}.`;
}

/*
 * =========================================================
 * MOMENTUM / UPCOMING HITS
 * =========================================================
 */

function getMomentumStory(
  analysis: WeeklyHot100Analysis
): string {
  const momentum =
    analysis.momentumSongs;

  if (momentum.length === 0) {
    return '';
  }

  const strongest = momentum[0];

  if (!strongest) {
    return '';
  }

  const {
    entry,
    movement,
  } = strongest;

  const phrases = [
    'continues to build momentum',
    'keeps gaining ground',
    'maintains its upward trajectory',
    'continues its climb',
  ];

  const phrase =
    phrases[
      entry.rank %
        phrases.length
    ];

  return `Among the songs still outside the Top 10, ${songName(
    entry.title,
    entry.artist
  )} is one to watch. It climbs ${movement} ${
    movement === 1 ? 'spot' : 'spots'
  } to No. ${entry.rank} and ${phrase} after ${
    entry.weeksOnChart
  } weeks on the chart.`;
}

/*
 * =========================================================
 * MAJOR DROPS
 * =========================================================
 */

function getDropStory(
  analysis: WeeklyHot100Analysis
): string {
  const drops =
    analysis.majorDrops;

  if (drops.length === 0) {
    return '';
  }

  const strongest = drops[0];

  if (!strongest) {
    return '';
  }

  const phrases = [
    'takes a noticeable tumble',
    'suffers a significant setback',
    'slides down the rankings',
    'loses ground this week',
    'experiences one of the chart’s sharpest declines',
  ];

  const phrase =
    phrases[
      strongest.entry.rank %
        phrases.length
    ];

  return `On the other side of the chart, ${songName(
    strongest.entry.title,
    strongest.entry.artist
  )} ${phrase}, dropping ${strongest.movement} ${
    strongest.movement === 1
      ? 'spot'
      : 'spots'
  } to No. ${strongest.entry.rank}.`;
}

/*
 * =========================================================
 * NUMBER ONE STORY
 * =========================================================
 */

function getNumberOneStory(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne =
    analysis.numberOne;

  if (!numberOne) {
    return '';
  }

  const weeks =
    analysis.weeksAtNumberOne;

  /*
   * NEW NUMBER ONE
   */

  if (
    numberOne.lastWeekRank !== null &&
    numberOne.lastWeekRank !== 1
  ) {
    const phrases = [
      `takes over the top spot on the Elio Hot 100 this week`,
      `rises to No. 1 on the Elio Hot 100`,
      `claims the summit of the Elio Hot 100`,
      `moves into the No. 1 position`,
      `seizes the top spot on the Elio Hot 100`,
    ];

    const phrase =
      phrases[
        numberOne.rank %
          phrases.length
      ];

    if (weeks === 1) {
      return `${songName(
        numberOne.title,
        numberOne.artist
      )} ${phrase}, becoming the chart's newest No. 1.`;
    }

    return `${songName(
      numberOne.title,
      numberOne.artist
    )} ${phrase}, beginning a new reign at the summit.`;
  }

  /*
   * FIRST WEEK OF DATA
   */

  if (
    numberOne.lastWeekRank === null &&
    weeks === 1
  ) {
    return `${songName(
      numberOne.title,
      numberOne.artist
    )} opens the Elio Hot 100 at No. 1.`;
  }

  /*
   * SECOND WEEK
   */

  if (weeks === 2) {
    return `${songName(
      numberOne.title,
      numberOne.artist
    )} remains on top of the Elio Hot 100, extending its reign to two weeks.`;
  }

  /*
   * LONGER REIGN
   */

  const phrases = [
    'continues its reign at No. 1',
    'remains firmly atop the Hot 100',
    'holds onto the summit',
    'keeps its grip on the No. 1 position',
    'extends its command of the chart',
  ];

  const phrase =
    phrases[
      weeks % phrases.length
    ];

  return `${songName(
    numberOne.title,
    numberOne.artist
  )} ${phrase}, extending its stay at the summit to ${weeks} weeks.`;
}

/*
 * =========================================================
 * OPENING PARAGRAPH
 * =========================================================
 */

function getOpeningParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const numberOneStory =
    getNumberOneStory(
      analysis
    );

  if (!numberOneStory) {
    return `The latest week of the Elio Hot 100 brings another round of movement across the chart, with the biggest stories unfolding throughout the Top 10 and among the rising titles further down the list.`;
  }

  return `The latest week of the Elio Hot 100 begins with ${numberOneStory
    .charAt(0)
    .toLowerCase()}${numberOneStory.slice(
    1
  )}`;
}

/*
 * =========================================================
 * CLOSING PARAGRAPH
 * =========================================================
 */

function getClosingParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const momentum =
    analysis.momentumSongs;

  if (
    momentum.length > 0 &&
    momentum[0]
  ) {
    const entry =
      momentum[0].entry;

    return `With ${songName(
      entry.title,
      entry.artist
    )} and several other rising titles continuing to gain ground, the lower half of the chart is beginning to provide some of the week's most interesting stories. Their continued progress could set the stage for even bigger gains in the weeks ahead.`;
  }

  if (
    analysis.debuts.length > 0
  ) {
    return `With new titles entering the chart and established hits continuing to battle for position, the coming weeks should reveal which of this week's biggest stories have the momentum to become lasting Hot 100 contenders.`;
  }

  if (
    analysis.newPeaks.length > 0
  ) {
    return `As established favorites continue to compete with rising contenders, this week's new peaks add another layer to an increasingly competitive Hot 100. The next few weeks could bring even more changes near the top.`;
  }

  return `As the chart moves into another week, the balance between established hits, rising contenders and newer arrivals will continue to shape the race for the upper reaches of the Hot 100.`;
}

/*
 * =========================================================
 * MAIN ARTICLE GENERATOR
 * =========================================================
 */

export function generateWeeklyHot100Article(
  analysis: WeeklyHot100Analysis
): string {
  if (
    !analysis.numberOne &&
    analysis.top10.length === 0
  ) {
    return '';
  }

  const paragraphs: string[] = [];

  const opening =
    getOpeningParagraph(
      analysis
    );

  if (opening) {
    paragraphs.push(opening);
  }

  const top10Story =
    getTop10Story(
      analysis
    );

  if (top10Story) {
    paragraphs.push(
      top10Story
    );
  }

  const top10EntryStory =
    getTop10EntryStory(
      analysis
    );

  if (top10EntryStory) {
    paragraphs.push(
      top10EntryStory
    );
  }

  const biggestClimberStory =
    getBiggestClimberStory(
      analysis
    );

  if (biggestClimberStory) {
    paragraphs.push(
      biggestClimberStory
    );
  }

  const pointGainerStory =
    getPointGainerStory(
      analysis
    );

  if (pointGainerStory) {
    paragraphs.push(
      pointGainerStory
    );
  }

  const debutStory =
    getDebutStory(
      analysis
    );

  if (debutStory) {
    paragraphs.push(
      debutStory
    );
  }

  const reentryStory =
    getReentryStory(
      analysis
    );

  if (reentryStory) {
    paragraphs.push(
      reentryStory
    );
  }

  const newPeakStory =
    getNewPeakStory(
      analysis
    );

  if (newPeakStory) {
    paragraphs.push(
      newPeakStory
    );
  }

  const momentumStory =
    getMomentumStory(
      analysis
    );

  if (momentumStory) {
    paragraphs.push(
      momentumStory
    );
  }

  const dropStory =
    getDropStory(
      analysis
    );

  if (dropStory) {
    paragraphs.push(
      dropStory
    );
  }

  const closing =
    getClosingParagraph(
      analysis
    );

  if (closing) {
    paragraphs.push(
      closing
    );
  }

  return paragraphs
    .filter(
      (paragraph) =>
        paragraph.trim().length > 0
    )
    .join('\n\n');
}

/*
 * =========================================================
 * DYNAMIC ARTICLE HEADLINE
 * =========================================================
 *
 * Headlines intentionally use different editorial
 * language so every week's article does not feel
 * like it was generated from the exact same template.
 * =========================================================
 */

export function getWeeklyHot100ArticleTitle(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne =
    analysis.numberOne;

  if (!numberOne) {
    return `The Latest Week on the Elio Hot 100`;
  }

  const song =
    `"${numberOne.title}"`;

  const artist =
    numberOne.artist;

  const weeks =
    analysis.weeksAtNumberOne;

  /*
   * =======================================================
   * NEW NUMBER ONE
   * =======================================================
   */

  if (
    numberOne.lastWeekRank !== null &&
    numberOne.lastWeekRank !== 1
  ) {
    const headlines = [
      `${artist}'s ${song} Crowns the Hot 100 for the First Time Ever`,
      `${artist}'s ${song} Takes Over the Hot 100`,
      `${artist}'s ${song} Claims the Hot 100 Summit`,
      `${artist}'s ${song} Rises to No. 1 on the Hot 100`,
      `${artist}'s ${song} Seizes the Hot 100's Top Spot`,
      `${artist}'s ${song} Moves Into the Hot 100's No. 1 Position`,
      `${artist}'s ${song} Reaches the Top of the Hot 100`,
      `${artist}'s ${song} Ascends to the Hot 100 Summit`,
    ];

    /*
     * Use the week count and rank to deterministically
     * vary the headline without making it random.
     */

    const index =
      (
        weeks +
        numberOne.rank
      ) %
      headlines.length;

    return headlines[index]!;
  }

  /*
   * =======================================================
   * FIRST WEEK OF AVAILABLE DATA
   * =======================================================
   */

  if (
    numberOne.lastWeekRank === null &&
    weeks === 1
  ) {
    const headlines = [
      `${artist}'s ${song} Opens the Hot 100 at No. 1`,
      `${artist}'s ${song} Debuts at the Top of the Hot 100`,
      `${artist}'s ${song} Starts Its Hot 100 Run at No. 1`,
      `${artist}'s ${song} Makes a No. 1 Entrance on the Hot 100`,
    ];

    const index =
      numberOne.rank %
      headlines.length;

    return headlines[index]!;
  }

  /*
   * =======================================================
   * TWO WEEKS AT NO. 1
   * =======================================================
   */

  if (weeks === 2) {
    const headlines = [
      `${artist}'s ${song} Holds Onto the Hot 100 No. 1 Spot`,
      `${artist}'s ${song} Keeps Its Grip on the Hot 100 Summit`,
      `${artist}'s ${song} Remains on Top of the Hot 100`,
      `${artist}'s ${song} Extends Its Hot 100 Reign to Two Weeks`,
    ];

    const index =
      numberOne.rank %
      headlines.length;

    return headlines[index]!;
  }

  /*
   * =======================================================
   * LONGER NO. 1 REIGN
   * =======================================================
   */

  if (weeks > 2) {
    const headlines = [
      `${artist}'s ${song} Extends Its Reign Atop the Hot 100`,
      `${artist}'s ${song} Continues Its Command of the Hot 100`,
      `${artist}'s ${song} Holds Firm at No. 1 on the Hot 100`,
      `${artist}'s ${song} Keeps the Hot 100 Summit for Week ${weeks}`,
      `${artist}'s ${song} Remains Unshaken at the Top of the Hot 100`,
      `${artist}'s ${song} Adds Another Week to Its Hot 100 Reign`,
      `${artist}'s ${song} Maintains Its No. 1 Stronghold`,
      `${artist}'s ${song} Continues to Rule the Hot 100`,
    ];

    const index =
      weeks %
      headlines.length;

    return headlines[index]!;
  }

  /*
   * =======================================================
   * FALLBACK
   * =======================================================
   */

  return `${artist}'s ${song} Leads the Latest Elio Hot 100`;
}