import type {
  ArtistHistoryStats,
  SongHistoryStats,
  Top10Story,
  WeeklyHot100Analysis,
} from '@/types';

/*
 * =========================================================
 * FORMATTING HELPERS
 * =========================================================
 */

function songName(
  title: string,
  artist: string
): string {
  return `"${title}" by ${artist}`;
}

function formatPercent(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '';
  }

  const rounded =
    Math.round(value * 10) / 10;

  return `${Math.abs(rounded)}%`;
}

function getOrdinal(
  value: number
): string {
  const mod100 =
    value % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;

    case 2:
      return `${value}nd`;

    case 3:
      return `${value}rd`;

    default:
      return `${value}th`;
  }
}

function joinNames(
  names: string[]
): string {
  const cleaned =
    names.filter(
      (name) =>
        name.trim().length > 0
    );

  if (cleaned.length === 0) {
    return '';
  }

  if (cleaned.length === 1) {
    return cleaned[0]!;
  }

  if (cleaned.length === 2) {
    return `${cleaned[0]} and ${cleaned[1]}`;
  }

  return `${cleaned
    .slice(0, -1)
    .join(', ')}, and ${
    cleaned[cleaned.length - 1]
  }`;
}

/*
 * =========================================================
 * MOVEMENT
 * =========================================================
 */

function getMovementPhrase(
  story: Top10Story
): string {
  const {
    entry,
    movement,
  } = story;

  if (
    entry.lastWeekRank === null
  ) {
    return `debuts at No. ${entry.rank}`;
  }

  if (movement > 0) {
    return `rises to No. ${entry.rank} from No. ${entry.lastWeekRank}`;
  }

  if (movement < 0) {
    return `falls to No. ${entry.rank} from No. ${entry.lastWeekRank}`;
  }

  return `holds at No. ${entry.rank}`;
}

/*
 * =========================================================
 * POINT CHANGE
 * =========================================================
 */

function getPointPhrase(
  story: Top10Story
): string {
  const value =
    story.pointChangePercent;

  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '';
  }

  if (Math.abs(value) < 0.05) {
    return 'with points essentially unchanged';
  }

  const formatted =
    formatPercent(value);

  if (value > 0) {
    return `with points up ${formatted}`;
  }

  return `with points down ${formatted}`;
}

/*
 * =========================================================
 * ARTIST MILESTONES
 * =========================================================
 */

function getArtistMilestones(
  story: Top10Story
): string[] {
  const {
    entry,
    artistStats,
  } = story;

  const milestones: string[] = [];

  for (const artist of artistStats) {
    if (
      entry.rank === 1 &&
      artist.numberOneHits === 1
    ) {
      milestones.push(
        `${artist.artist}'s first career No. 1`
      );

      continue;
    }

    if (
      entry.rank === 1 &&
      artist.numberOneHits > 1
    ) {
      milestones.push(
        `${artist.artist}'s ${getOrdinal(
          artist.numberOneHits
        )} No. 1 hit`
      );

      continue;
    }

    if (
      entry.rank <= 10 &&
      artist.top10Hits === 1
    ) {
      milestones.push(
        `${artist.artist}'s first-ever Top 10 hit`
      );

      continue;
    }

    if (
      entry.rank <= 10 &&
      artist.top10Hits > 1
    ) {
      milestones.push(
        `${artist.artist}'s ${getOrdinal(
          artist.top10Hits
        )} Top 10 hit`
      );

      continue;
    }

    if (
      entry.rank <= 5 &&
      artist.top5Hits === 1
    ) {
      milestones.push(
        `${artist.artist}'s first-ever Top 5 hit`
      );
    }
  }

  return milestones;
}

/*
 * =========================================================
 * SONG MILESTONES
 * =========================================================
 */

function getSongMilestones(
  story: Top10Story
): string[] {
  const {
    entry,
    songStats,
  } = story;

  const milestones: string[] = [];

  if (
    entry.rank <= 10 &&
    songStats.totalTop10Weeks === 1
  ) {
    milestones.push(
      'its first week in the Top 10'
    );
  }

  if (
    entry.rank <= 5 &&
    songStats.totalTop5Weeks === 1
  ) {
    milestones.push(
      'its first week in the Top 5'
    );
  }

  if (story.isNewCareerPeak) {
    milestones.push(
      'a new career-best peak'
    );
  }

  return milestones;
}

/*
 * =========================================================
 * TOP 10 STORY
 * =========================================================
 */

function buildTop10Story(
  story: Top10Story
): string {
  const {
    entry,
    songStats,
  } = story;

  let paragraph =
    `${songName(
      entry.title,
      entry.artist
    )} ${getMovementPhrase(story)}`;

  const pointPhrase =
    getPointPhrase(story);

  if (pointPhrase) {
    paragraph += `, ${pointPhrase}`;
  }

  paragraph += '.';

  /*
   * Artist milestone.
   */

  const artistMilestones =
    getArtistMilestones(story);

  if (
    artistMilestones.length > 0
  ) {
    paragraph += ` The move gives ${joinNames(
      artistMilestones
    )}.`;
  }

  /*
   * Song milestone.
   */

  const songMilestones =
    getSongMilestones(story);

  if (
    songMilestones.length > 0
  ) {
    paragraph += ` It gives the song ${joinNames(
      songMilestones
    )}.`;
  }

  /*
   * Top 10 longevity.
   */

  if (
    entry.rank <= 10 &&
    songStats.totalTop10Weeks > 1
  ) {
    paragraph += ` It now has ${songStats.totalTop10Weeks} weeks in the Top 10`;
  }

  /*
   * Top 5 longevity.
   */

  if (
    entry.rank <= 5 &&
    songStats.totalTop5Weeks > 1
  ) {
    paragraph += `, including ${songStats.totalTop5Weeks} weeks in the Top 5`;
  }

  /*
   * No. 1 longevity.
   */

  if (
    entry.rank === 1 &&
    songStats.totalNumberOneWeeks > 0
  ) {
    paragraph += `. It now has ${
      songStats.totalNumberOneWeeks
    } week${
      songStats.totalNumberOneWeeks === 1
        ? ''
        : 's'
    } at No. 1`;
  }

  /*
   * Current peak.
   */

  if (
    entry.rank !== 1 &&
    songStats.peakPosition ===
      entry.rank &&
    !story.isNewCareerPeak
  ) {
    paragraph += `, with No. ${entry.rank} remaining its peak position`;
  }

  /*
   * Close punctuation carefully.
   */

  if (
    !paragraph.endsWith('.')
  ) {
    paragraph += '.';
  }

  return paragraph;
}

/*
 * =========================================================
 * NUMBER ONE OPENING
 * =========================================================
 */

function getNumberOneOpening(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne =
    analysis.numberOne;

  if (!numberOne) {
    return '';
  }

  const songStats =
    analysis.numberOneSongStats;

  const artists =
    analysis.numberOneArtistStats;

  let paragraph = '';

  /*
   * Main chart event.
   */

  if (
    numberOne.lastWeekRank === null
  ) {
    paragraph =
      `${songName(
        numberOne.title,
        numberOne.artist
      )} opens the Elio Hot 100 at No. 1`;
  } else if (
    numberOne.lastWeekRank !== 1
  ) {
    paragraph =
      `${songName(
        numberOne.title,
        numberOne.artist
      )} rises to No. 1 on the Elio Hot 100`;
  } else {
    paragraph =
      `${songName(
        numberOne.title,
        numberOne.artist
      )} remains at No. 1 on the Elio Hot 100`;
  }

  /*
   * Artist No. 1 milestone.
   */

  const artistMilestones =
    artists.map(
      (
        artist: ArtistHistoryStats
      ) => {
        if (
          artist.numberOneHits === 1
        ) {
          return `${artist.artist}'s first career No. 1`;
        }

        return `${artist.artist}'s ${getOrdinal(
          artist.numberOneHits
        )} No. 1 hit`;
      }
    );

  if (
    artistMilestones.length > 0
  ) {
    paragraph += `, giving ${joinNames(
      artistMilestones
    )}`;
  }

  paragraph += '.';

  /*
   * Yearly unique No. 1 count.
   */

  if (
    analysis.numberOneSongsThisYear > 0
  ) {
    paragraph += ` This is the ${getOrdinal(
      analysis.numberOneSongsThisYear
    )} unique No. 1 hit of ${
      analysis.currentYear
    }`;
  }

  /*
   * All-time unique No. 1 count.
   */

  if (
    songStats &&
    songStats.totalNumberOneWeeks === 1
  ) {
    paragraph += ` and the ${getOrdinal(
      analysis.uniqueNumberOneSongs
    )} unique song to reach No. 1 in Elio Hot 100 history`;
  }

  if (
    analysis.numberOneSongsThisYear > 0 ||
    (
      songStats &&
      songStats.totalNumberOneWeeks === 1
    )
  ) {
    paragraph += '.';
  }

  /*
   * No. 1 longevity.
   */

  if (
    songStats &&
    songStats.totalNumberOneWeeks > 1
  ) {
    paragraph += ` The song now has ${
      songStats.totalNumberOneWeeks
    } weeks at No. 1.`;
  }

  return paragraph;
}

/*
 * =========================================================
 * HISTORICAL TOP 10 FACT
 * =========================================================
 */

function getInterestingTop10Fact(
  analysis: WeeklyHot100Analysis
): string {
  const stories =
    analysis.top10Stories;

  /*
   * Long-running Top 10 song.
   */

  const longest =
    [...stories]
      .sort(
        (a, b) =>
          b.songStats.totalTop10Weeks -
          a.songStats.totalTop10Weeks
      )[0];

  if (
    longest &&
    longest.songStats.totalTop10Weeks >= 40
  ) {
    return `${songName(
      longest.entry.title,
      longest.entry.artist
    )} now has ${
      longest.songStats.totalTop10Weeks
    } weeks inside the Top 10, placing it among the most enduring Top 10 runs in Elio Hot 100 history.`;
  }

  /*
   * Significant No. 1 run.
   */

  const reign =
    stories.find(
      (story) =>
        story.entry.rank === 1 &&
        story.songStats.totalNumberOneWeeks >= 5
    );

  if (reign) {
    return `${songName(
      reign.entry.title,
      reign.entry.artist
    )} now has ${
      reign.songStats.totalNumberOneWeeks
    } weeks at No. 1, putting its run among the more significant No. 1 reigns in Elio Hot 100 history.`;
  }

  /*
   * New peak.
   */

  const newPeak =
    stories.find(
      (story) =>
        story.isNewCareerPeak
    );

  if (newPeak) {
    return `${songName(
      newPeak.entry.title,
      newPeak.entry.artist
    )} also reaches a new career-best position at No. ${newPeak.entry.rank}.`;
  }

  return '';
}

/*
 * =========================================================
 * TOP 10 SECTION
 * =========================================================
 */

function getTop10Section(
  analysis: WeeklyHot100Analysis
): string {
  if (
    analysis.top10Stories.length === 0
  ) {
    return '';
  }

  return analysis.top10Stories
    .map(
      (story) =>
        buildTop10Story(story)
    )
    .join('\n\n');
}

/*
 * =========================================================
 * CLOSING
 * =========================================================
 */

function getClosingParagraph(
  analysis: WeeklyHot100Analysis
): string {
  const fact =
    getInterestingTop10Fact(
      analysis
    );

  if (fact) {
    return fact;
  }

  /*
   * Strongest song outside the Top 10.
   */

  if (
    analysis.momentumSongs.length > 0
  ) {
    const strongest =
      analysis.momentumSongs[0]?.entry;

    if (strongest) {
      return `${songName(
        strongest.title,
        strongest.artist
      )} is among the strongest titles outside the Top 10, climbing to No. ${strongest.rank} and emerging as one to watch in the weeks ahead.`;
    }
  }

  /*
   * Debuts.
   */

  if (
    analysis.debuts.length > 0
  ) {
    return `Beyond the Top 10, ${
      analysis.debuts.length
    } new ${
      analysis.debuts.length === 1
        ? 'title arrives'
        : 'titles arrive'
    } on the Hot 100 this week.`;
  }

  /*
   * Reentries.
   */

  if (
    analysis.reentries.length > 0
  ) {
    return `${
      analysis.reentries.length
    } ${
      analysis.reentries.length === 1
        ? 'song returns'
        : 'songs return'
    } to the Hot 100 this week after previously appearing on the chart.`;
  }

  return '';
}

/*
 * =========================================================
 * HEADLINE ENGINE
 * =========================================================
 *
 * Instead of cycling through a fixed collection of
 * repetitive headlines, this system evaluates the actual
 * chart events of the week and chooses the strongest angle.
 *
 * Priority:
 *
 * 1. Historic / first-time No. 1
 * 2. Major No. 1 change
 * 3. Significant No. 1 longevity
 * 4. Major artist milestone
 * 5. Major Top 10 movement
 * 6. New career peak
 * 7. Strongest chart movement
 * 8. Natural fallback headline
 *
 * This means the headline should change because the story
 * changes, rather than simply because a template changed.
 * =========================================================
 */

function getBestHeadlineStory(
  analysis: WeeklyHot100Analysis
): Top10Story | null {
  if (
    analysis.top10Stories.length === 0
  ) {
    return null;
  }

  const stories =
    analysis.top10Stories;

  /*
   * A No. 1 song is always the primary story when present.
   */

  const numberOne =
    stories.find(
      (story) =>
        story.entry.rank === 1
    );

  if (numberOne) {
    return numberOne;
  }

  /*
   * Otherwise prioritize the biggest Top 10 mover.
   */

  const majorMover =
    [...stories]
      .filter(
        (story) =>
          story.movement > 0
      )
      .sort(
        (a, b) =>
          b.movement - a.movement
      )[0];

  if (majorMover) {
    return majorMover;
  }

  /*
   * Then prioritize a new career peak.
   */

  const newPeak =
    stories.find(
      (story) =>
        story.isNewCareerPeak
    );

  if (newPeak) {
    return newPeak;
  }

  /*
   * Finally use the highest-ranked Top 10 song.
   */

  return (
    [...stories].sort(
      (a, b) =>
        a.entry.rank -
        b.entry.rank
    )[0] ?? null
  );
}

function getHeadline(
  analysis: WeeklyHot100Analysis
): string {
  const numberOne =
    analysis.numberOne;

  /*
   * =======================================================
   * NO. 1 HEADLINES
   * =======================================================
   */

  if (numberOne) {
    const song =
      `"${numberOne.title}"`;

    const songStats =
      analysis.numberOneSongStats;

    const artists =
      analysis.numberOneArtistStats;

    /*
     * First career No. 1.
     */

    const firstArtist =
      artists.find(
        (artist) =>
          artist.numberOneHits === 1
      );

    if (
      firstArtist &&
      numberOne.lastWeekRank !== 1
    ) {
      return `${firstArtist.artist} Scores a First No. 1 With ${song}`;
    }

    /*
     * First-ever No. 1 for the song.
     */

    if (
      numberOne.lastWeekRank !== 1 &&
      songStats &&
      songStats.totalNumberOneWeeks === 1
    ) {
      return `${song} Reaches the Top Spot for the First Time`;
    }

    /*
     * A very long current reign.
     */

    const currentWeeks =
      analysis.weeksAtNumberOne;

    if (currentWeeks >= 10) {
      return `${song} Has Now Ruled the Hot 100 for ${currentWeeks} Weeks`;
    }

    /*
     * Major climb into No. 1.
     */

    if (
      numberOne.lastWeekRank !== null &&
      numberOne.lastWeekRank > 1
    ) {
      return `${song} Climbs to No. 1 on the Elio Hot 100`;
    }

    /*
     * Multiple No. 1 milestone.
     */

    const multipleArtist =
      artists
        .filter(
          (artist) =>
            artist.numberOneHits >= 2
        )
        .sort(
          (a, b) =>
            b.numberOneHits -
            a.numberOneHits
        )[0];

    if (
      multipleArtist &&
      numberOne.lastWeekRank !== 1
    ) {
      return `${song} Adds Another No. 1 to ${multipleArtist.artist}'s Chart History`;
    }

    /*
     * New career peak at No. 1.
     */

    const numberOneStory =
      analysis.top10Stories.find(
        (story) =>
          story.entry.rank === 1
      );

    if (
      numberOneStory?.isNewCareerPeak
    ) {
      return `${song} Reaches a New Career High at No. 1`;
    }

    /*
     * If none of the special events apply, describe what
     * actually happened rather than using a rotating template.
     */

    if (
      numberOne.lastWeekRank === 1
    ) {
      if (
        songStats &&
        songStats.totalNumberOneWeeks >= 5
      ) {
        return `${song} Continues a Major Run at No. 1`;
      }

      return `${song} Remains on Top of the Elio Hot 100`;
    }

    return `${song} Takes Over the Elio Hot 100`;
  }

  /*
   * =======================================================
   * NO NO. 1 AVAILABLE — FIND THE STRONGEST STORY
   * =======================================================
   */

  const story =
    getBestHeadlineStory(
      analysis
    );

  if (story) {
    const {
      entry,
      movement,
      songStats,
    } = story;

    const song =
      `"${entry.title}"`;

    /*
     * Major climb.
     */

    if (movement >= 10) {
      return `${song} Makes One of the Week's Biggest Top 10 Moves`;
    }

    if (movement >= 5) {
      return `${song} Makes a Major Climb Into the Top 10`;
    }

    /*
     * New career peak.
     */

    if (
      story.isNewCareerPeak
    ) {
      return `${song} Reaches a New Career Peak at No. ${entry.rank}`;
    }

    /*
     * First Top 10.
     */

    if (
      story.isFirstTop10
    ) {
      return `${song} Breaks Into the Top 10 for the First Time`;
    }

    /*
     * First Top 5.
     */

    if (
      story.isFirstTop5
    ) {
      return `${song} Breaks Into the Top 5 for the First Time`;
    }

    /*
     * Long Top 10 run.
     */

    if (
      songStats.totalTop10Weeks >= 30
    ) {
      return `${song} Reaches Another Milestone in the Hot 100 Top 10`;
    }

    /*
     * Strong movement.
     */

    if (movement > 0) {
      return `${song} Climbs to No. ${entry.rank} on the Elio Hot 100`;
    }

    /*
     * General Top 10 story.
     */

    return `${song} Lands at No. ${entry.rank} on This Week's Elio Hot 100`;
  }

  /*
   * =======================================================
   * FINAL FALLBACK
   * =======================================================
   */

  return `The Latest Week on the Elio Hot 100`;
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
    !analysis.numberOne &&
    analysis.top10.length === 0
  ) {
    return '';
  }

  const paragraphs: string[] = [];

  /*
   * No. 1 opening.
   */

  const opening =
    getNumberOneOpening(
      analysis
    );

  if (opening) {
    paragraphs.push(
      opening
    );
  }

  /*
   * Top 10 stories.
   */

  const top10 =
    getTop10Section(
      analysis
    );

  if (top10) {
    paragraphs.push(
      top10
    );
  }

  /*
   * Closing.
   */

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
 * PUBLIC HEADLINE FUNCTION
 * =========================================================
 */

export function getWeeklyHot100ArticleTitle(
  analysis: WeeklyHot100Analysis
): string {
  return getHeadline(
    analysis
  );
}