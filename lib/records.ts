import {
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';

import type {
  WeeklyChartEntry,
} from '@/types';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

export interface SongRecord {
  id: string;
  title: string;
  artist: string;
  artwork?: string;

  value: number;
  valueLabel?: string;

  description: string;
}

export interface SongRecordCategory {
  id: string;
  title: string;
  description: string;
  record: SongRecord | null;
}

export interface ArtistRecord {
  id: string;
  title: string;
  artist: string;
  image?: string;

  value: number;
  valueLabel: string;

  description: string;
  gradientColor?: string;
}

export interface ArtistRecordCategory {
  id: string;
  title: string;
  description: string;
  record: ArtistRecord | null;
}

export interface RecordsData {
  songs: SongRecordCategory[];
  artistRecords: ArtistRecordCategory[];
}

export type RecordsPayload = RecordsData;

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const ARTIST_IMAGES_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

const AWARDS_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1cIB9D2bPcJxyiw3yKNLJtfMLwuBx_ujLYEmfe-wUwcoUFZGZ2ukP34jtFt2J-TXh_VK__wE9XxjO/pub?gid=0&single=true&output=csv';

/*
 * These are the ONLY acts in your Awards data where "&"
 * belongs to the same artist/act.
 */
const AMPERSAND_ACTS = [
  'Mumford & Sons',
  'Macklemore & Ryan Lewis',
  'Nico & Vinz',
];

/*
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

function songKey(
  title: string,
  artist: string
): string {
  return (
    `${title.toLowerCase().trim()}|||` +
    artist.toLowerCase().trim()
  );
}

function artistKey(
  artist: string
): string {
  return artist
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNumber(
  value: number
): string {
  return value.toLocaleString('en-US');
}

function parseChartDate(
  value: string
): number {
  const parts = value
    .split('/')
    .map(Number);

  if (parts.length !== 3) {
    return 0;
  }

  const [month, day, year] = parts;

  if (
    !month ||
    !day ||
    !Number.isFinite(year)
  ) {
    return 0;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  return new Date(
    fullYear,
    month - 1,
    day
  ).getTime();
}

function getChartYear(
  value: string
): number {
  const parts = value
    .split('/')
    .map(Number);

  if (parts.length !== 3) {
    return 0;
  }

  const year = parts[2];

  if (!Number.isFinite(year)) {
    return 0;
  }

  return year < 50
    ? 2000 + year
    : 1900 + year;
}

function formatChartDate(
  value: string
): string {
  const timestamp =
    parseChartDate(value);

  if (!timestamp) {
    return value;
  }

  return new Date(
    timestamp
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

function isConsecutiveWeek(
  previous: string | undefined,
  current: string
): boolean {
  if (!previous) {
    return true;
  }

  const difference =
    Math.round(
      (
        parseChartDate(current) -
        parseChartDate(previous)
      ) /
        (
          7 *
          24 *
          60 *
          60 *
          1000
        )
    );

  return difference === 1;
}

function yearRange(
  years: number[]
): string {
  const valid = Array.from(
    new Set(
      years.filter(
        (year) => year > 0
      )
    )
  ).sort(
    (a, b) => a - b
  );

  if (!valid.length) {
    return '';
  }

  if (valid.length === 1) {
    return String(valid[0]);
  }

  return `${valid[0]}–${
    valid[valid.length - 1]
  }`;
}

/*
 * =========================================================
 * ARTIST NORMALIZATION
 * =========================================================
 */

function splitArtists(
  artistString: string
): string[] {
  let value =
    artistString
      .replace(
        /\u00a0/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  /*
   * Protect the three legitimate "&" acts.
   */
  const protectedActs:
    string[] = [];

  AMPERSAND_ACTS.forEach(
    (act, index) => {
      const token =
        `___AMPERSAND_ACT_${index}___`;

      const regex =
        new RegExp(
          act.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          ),
          'gi'
        );

      if (regex.test(value)) {
        protectedActs.push(
          act
        );

        value =
          value.replace(
            regex,
            token
          );
      }
    }
  );

  const artists =
    value
      .split(
        /\s+(?:&|and|with|feat\.?|featuring|ft\.?|x|×)\s+|,\s*/i
      )
      .map(
        (artist) =>
          artist
            .replace(
              /___AMPERSAND_ACT_(\d+)___/gi,
              (_, index) =>
                protectedActs[
                  Number(index)
                ] ??
                AMPERSAND_ACTS[
                  Number(index)
                ] ??
                ''
            )
            .replace(
              /\s+/g,
              ' '
            )
            .trim()
      )
      .filter(Boolean);

  return artists;
}

function getArtistsForEntry(
  entry: WeeklyChartEntry
): string[] {
  return splitArtists(
    entry.artist
  );
}

/*
 * Awards use the exact same artist logic,
 * but are intentionally kept separate so the
 * rules are obvious.
 */
function splitAwardArtists(
  value: string
): string[] {
  return splitArtists(
    value
  );
}

/*
 * =========================================================
 * FETCH HOT 100
 * =========================================================
 */

async function fetchAllHot100Entries(): Promise<
  WeeklyChartEntry[]
> {
  const source =
    sheetSources.find(
      (item) =>
        item.title
          .toLowerCase()
          .trim() ===
        'the hot 100'
    );

  if (!source) {
    throw new Error(
      'THE HOT 100 source not found'
    );
  }

  const payload =
    await fetchWeeklyChartData(
      source.csvUrl,
      undefined,
      source.title
    );

  const entries:
    WeeklyChartEntry[] = [];

  for (
    const week of Object.keys(
      payload.entriesByWeek
    )
  ) {
    entries.push(
      ...(
        payload.entriesByWeek[
          week
        ] ?? []
      )
    );
  }

  return entries;
}

/*
 * =========================================================
 * SONG HISTORY
 * =========================================================
 */

interface SongWeek {
  week: string;
  rank: number;
  artwork?: string;
}

interface SongHistory {
  title: string;
  artist: string;
  artwork?: string;

  weeks: SongWeek[];

  totalWeeks: number;

  numberOneWeeks: number;
  numberTwoWeeks: number;

  topTwoWeeks: number;
  topThreeWeeks: number;
  topFiveWeeks: number;
  topTenWeeks: number;

  peak: number;

  firstWeek: string;
  lastWeek: string;

  firstNumberOneWeek: string | null;

  longestNumberOneRun: number;
  longestTopTenRun: number;

  biggestJumpToNumberOne: number;

  biggestUpwardMovement: number;
  biggestDropFromNumberOne: number;
  biggestDownwardMovement: number;

  longestClimbToNumberOne: number | null;

  debutedAtNumberOne: boolean;
}

/*
 * =========================================================
 * BUILD SONG HISTORIES
 * =========================================================
 */

function buildSongHistories(
  entries: WeeklyChartEntry[]
): SongHistory[] {
  const grouped =
    new Map<
      string,
      SongHistory
    >();

  for (const entry of entries) {
    const key =
      songKey(
        entry.title,
        entry.artist
      );

    let history =
      grouped.get(key);

    if (!history) {
      history = {
        title:
          entry.title,

        artist:
          entry.artist,

        artwork:
          entry.artwork,

        weeks: [],

        totalWeeks: 0,

        numberOneWeeks: 0,
        numberTwoWeeks: 0,

        topTwoWeeks: 0,
        topThreeWeeks: 0,
        topFiveWeeks: 0,
        topTenWeeks: 0,

        peak: 100,

        firstWeek:
          entry.week,

        lastWeek:
          entry.week,

        firstNumberOneWeek:
          null,

        longestNumberOneRun:
          0,

        longestTopTenRun:
          0,

        biggestJumpToNumberOne:
          0,

        biggestUpwardMovement:
          0,

        biggestDropFromNumberOne:
          0,

        biggestDownwardMovement:
          0,

        longestClimbToNumberOne:
          null,

        debutedAtNumberOne:
          false,
      };

      grouped.set(
        key,
        history
      );
    }

    if (
      !history.artwork &&
      entry.artwork
    ) {
      history.artwork =
        entry.artwork;
    }

    history.weeks.push({
      week:
        entry.week,

      rank:
        entry.rank,

      artwork:
        entry.artwork,
    });
  }

  for (
    const history of grouped.values()
  ) {
    history.weeks.sort(
      (a, b) =>
        parseChartDate(a.week) -
        parseChartDate(b.week)
    );

    history.firstWeek =
      history.weeks[0]?.week ??
      '';

    history.lastWeek =
      history.weeks[
        history.weeks.length - 1
      ]?.week ??
      '';

    history.totalWeeks =
      history.weeks.length;

    history.peak =
      Math.min(
        ...history.weeks.map(
          (week) =>
            week.rank
        )
      );

    history.numberOneWeeks =
      history.weeks.filter(
        (week) =>
          week.rank === 1
      ).length;

    history.numberTwoWeeks =
      history.weeks.filter(
        (week) =>
          week.rank === 2
      ).length;

    history.topTwoWeeks =
      history.weeks.filter(
        (week) =>
          week.rank <= 2
      ).length;

    history.topThreeWeeks =
      history.weeks.filter(
        (week) =>
          week.rank <= 3
      ).length;

    history.topFiveWeeks =
      history.weeks.filter(
        (week) =>
          week.rank <= 5
      ).length;

    history.topTenWeeks =
      history.weeks.filter(
        (week) =>
          week.rank <= 10
      ).length;

    const firstNumberOneIndex =
      history.weeks.findIndex(
        (week) =>
          week.rank === 1
      );

    if (
      firstNumberOneIndex >= 0
    ) {
      const firstNumberOne =
        history.weeks[
          firstNumberOneIndex
        ];

      history.firstNumberOneWeek =
        firstNumberOne.week;

      history.longestClimbToNumberOne =
        firstNumberOneIndex;

      if (
        firstNumberOneIndex > 0 &&
        isConsecutiveWeek(
          history.weeks[
            firstNumberOneIndex - 1
          ]?.week,
          firstNumberOne.week
        )
      ) {
        const previous =
          history.weeks[
            firstNumberOneIndex - 1
          ];

        history.biggestJumpToNumberOne =
          Math.max(
            0,
            previous.rank - 1
          );
      }
    }

    history.debutedAtNumberOne =
      history.weeks[0]?.rank === 1;

    let currentNoOneRun = 0;

    for (
      let i = 0;
      i < history.weeks.length;
      i++
    ) {
      const current =
        history.weeks[i];

      const previous =
        history.weeks[i - 1];

      if (
        current.rank === 1 &&
        isConsecutiveWeek(
          previous?.week,
          current.week
        )
      ) {
        currentNoOneRun++;

        history.longestNumberOneRun =
          Math.max(
            history.longestNumberOneRun,
            currentNoOneRun
          );
      } else {
        currentNoOneRun = 0;
      }
    }

    let currentTopTenRun = 0;

    for (
      let i = 0;
      i < history.weeks.length;
      i++
    ) {
      const current =
        history.weeks[i];

      const previous =
        history.weeks[i - 1];

      if (
        current.rank <= 10 &&
        isConsecutiveWeek(
          previous?.week,
          current.week
        )
      ) {
        currentTopTenRun++;

        history.longestTopTenRun =
          Math.max(
            history.longestTopTenRun,
            currentTopTenRun
          );
      } else {
        currentTopTenRun = 0;
      }
    }

    for (
      let i = 1;
      i < history.weeks.length;
      i++
    ) {
      const previous =
        history.weeks[i - 1];

      const current =
        history.weeks[i];

      if (
        !isConsecutiveWeek(
          previous.week,
          current.week
        )
      ) {
        continue;
      }

      const movement =
        previous.rank -
        current.rank;

      if (movement > 0) {
        history.biggestUpwardMovement =
          Math.max(
            history.biggestUpwardMovement,
            movement
          );
      }

      if (movement < 0) {
        history.biggestDownwardMovement =
          Math.max(
            history.biggestDownwardMovement,
            Math.abs(movement)
          );
      }

      if (
        previous.rank === 1 &&
        current.rank > 1
      ) {
        history.biggestDropFromNumberOne =
          Math.max(
            history.biggestDropFromNumberOne,
            current.rank - 1
          );
      }
    }
  }

  return Array.from(
    grouped.values()
  );
}

/*
 * =========================================================
 * SONG RECORD HELPERS
 * =========================================================
 */

function createSongRecord(
  history: SongHistory,
  value: number,
  valueLabel:
    | string
    | undefined,
  description: string
): SongRecord {
  return {
    id:
      songKey(
        history.title,
        history.artist
      ),

    title:
      history.title,

    artist:
      history.artist,

    artwork:
      history.artwork,

    value,
    valueLabel,

    description,
  };
}

function getBestSong(
  histories: SongHistory[],
  selector: (
    history: SongHistory
  ) => number
): SongHistory | null {
  if (!histories.length) {
    return null;
  }

  return histories.reduce(
    (best, current) =>
      selector(current) >
      selector(best)
        ? current
        : best
  );
}

/*
 * =========================================================
 * BUILD SONG RECORDS
 * =========================================================
 */

function buildSongRecords(
  histories: SongHistory[]
): SongRecordCategory[] {
  const records:
    SongRecordCategory[] = [];

  const greatestSong =
    histories.find(
      (history) =>
        artistKey(
          history.artist
        ) ===
          artistKey(
            'Billie Eilish'
          ) &&
        history.title
          .toLowerCase()
          .trim() ===
          'birds of a feather'
    ) ??
    getBestSong(
      histories,
      (history) =>
        history.totalWeeks
    );

  records.push({
    id:
      'greatest-of-all-time',

    title:
      'GREATEST OF ALL-TIME SONG',

    description:
      'The greatest song in your Hot 100 history.',

    record:
      greatestSong
        ? createSongRecord(
            greatestSong,
            0,
            undefined,
            `"${greatestSong.title}" by ${greatestSong.artist} is the greatest song in your Hot 100 history.`
          )
        : null,
  });

  const mostNumberOneWeeks =
    getBestSong(
      histories,
      (h) =>
        h.numberOneWeeks
    );

  records.push({
    id:
      'most-weeks-at-no1',

    title:
      'MOST WEEKS AT NO. 1',

    description:
      'The song with the most cumulative weeks at No. 1.',

    record:
      mostNumberOneWeeks
        ? createSongRecord(
            mostNumberOneWeeks,
            mostNumberOneWeeks.numberOneWeeks,
            `${formatNumber(
              mostNumberOneWeeks.numberOneWeeks
            )} WEEKS`,
            `"${mostNumberOneWeeks.title}" by ${mostNumberOneWeeks.artist} has spent ${formatNumber(
              mostNumberOneWeeks.numberOneWeeks
            )} cumulative weeks at No. 1.`
          )
        : null,
  });

  const longestNumberOne =
    getBestSong(
      histories,
      (h) =>
        h.longestNumberOneRun
    );

  records.push({
    id:
      'most-consecutive-weeks-at-no1',

    title:
      'MOST CONSECUTIVE WEEKS AT NO. 1',

    description:
      'The longest uninterrupted No. 1 reign by a song.',

    record:
      longestNumberOne
        ? createSongRecord(
            longestNumberOne,
            longestNumberOne.longestNumberOneRun,
            `${formatNumber(
              longestNumberOne.longestNumberOneRun
            )} WEEKS`,
            `"${longestNumberOne.title}" by ${longestNumberOne.artist} spent ${formatNumber(
              longestNumberOne.longestNumberOneRun
            )} consecutive weeks at No. 1.`
          )
        : null,
  });

  const mostNumberTwo =
    getBestSong(
      histories,
      (h) =>
        h.numberTwoWeeks
    );

  records.push({
    id:
      'most-no2-weeks',

    title:
      'MOST WEEKS AT NO. 2',

    description:
      'The song with the most weeks at No. 2.',

    record:
      mostNumberTwo
        ? createSongRecord(
            mostNumberTwo,
            mostNumberTwo.numberTwoWeeks,
            `${formatNumber(
              mostNumberTwo.numberTwoWeeks
            )} WEEKS`,
            `"${mostNumberTwo.title}" by ${mostNumberTwo.artist} spent ${formatNumber(
              mostNumberTwo.numberTwoWeeks
            )} weeks at No. 2.`
          )
        : null,
  });

  const mostNumberTwoWithoutOne =
    getBestSong(
      histories.filter(
        (h) =>
          h.numberOneWeeks === 0
      ),
      (h) =>
        h.numberTwoWeeks
    );

  records.push({
    id:
      'most-no2-without-no1',

    title:
      'MOST WEEKS AT NO. 2 WITHOUT HITTING NO. 1',

    description:
      'The most weeks spent at No. 2 by a song that never reached No. 1.',

    record:
      mostNumberTwoWithoutOne
        ? createSongRecord(
            mostNumberTwoWithoutOne,
            mostNumberTwoWithoutOne.numberTwoWeeks,
            `${formatNumber(
              mostNumberTwoWithoutOne.numberTwoWeeks
            )} WEEKS`,
            `"${mostNumberTwoWithoutOne.title}" by ${mostNumberTwoWithoutOne.artist} spent ${formatNumber(
              mostNumberTwoWithoutOne.numberTwoWeeks
            )} weeks at No. 2 without ever reaching No. 1.`
          )
        : null,
  });

  const mostTopTwo =
    getBestSong(
      histories,
      (h) =>
        h.topTwoWeeks
    );

  records.push({
    id:
      'most-top2-weeks',

    title:
      'MOST WEEKS IN THE TOP 2',

    description:
      'The most weeks spent inside the Top 2.',

    record:
      mostTopTwo
        ? createSongRecord(
            mostTopTwo,
            mostTopTwo.topTwoWeeks,
            `${formatNumber(
              mostTopTwo.topTwoWeeks
            )} WEEKS`,
            `"${mostTopTwo.title}" by ${mostTopTwo.artist} has spent ${formatNumber(
              mostTopTwo.topTwoWeeks
            )} weeks in the Top 2.`
          )
        : null,
  });

  const mostTopThree =
    getBestSong(
      histories,
      (h) =>
        h.topThreeWeeks
    );

  records.push({
    id:
      'most-top3-weeks',

    title:
      'MOST WEEKS IN THE TOP 3',

    description:
      'The most weeks spent inside the Top 3.',

    record:
      mostTopThree
        ? createSongRecord(
            mostTopThree,
            mostTopThree.topThreeWeeks,
            `${formatNumber(
              mostTopThree.topThreeWeeks
            )} WEEKS`,
            `"${mostTopThree.title}" by ${mostTopThree.artist} has spent ${formatNumber(
              mostTopThree.topThreeWeeks
            )} weeks in the Top 3.`
          )
        : null,
  });

  const mostTopFive =
    getBestSong(
      histories,
      (h) =>
        h.topFiveWeeks
    );

  records.push({
    id:
      'most-top5-weeks',

    title:
      'MOST WEEKS IN THE TOP 5',

    description:
      'The most weeks spent inside the Top 5.',

    record:
      mostTopFive
        ? createSongRecord(
            mostTopFive,
            mostTopFive.topFiveWeeks,
            `${formatNumber(
              mostTopFive.topFiveWeeks
            )} WEEKS`,
            `"${mostTopFive.title}" by ${mostTopFive.artist} has spent ${formatNumber(
              mostTopFive.topFiveWeeks
            )} weeks in the Top 5.`
          )
        : null,
  });

  const mostTopTen =
    getBestSong(
      histories,
      (h) =>
        h.topTenWeeks
    );

  records.push({
    id:
      'most-top10-weeks',

    title:
      'MOST WEEKS IN THE TOP 10',

    description:
      'The most weeks spent inside the Top 10.',

    record:
      mostTopTen
        ? createSongRecord(
            mostTopTen,
            mostTopTen.topTenWeeks,
            `${formatNumber(
              mostTopTen.topTenWeeks
            )} WEEKS`,
            `"${mostTopTen.title}" by ${mostTopTen.artist} has spent ${formatNumber(
              mostTopTen.topTenWeeks
            )} weeks in the Top 10.`
          )
        : null,
  });

  const mostTotalWeeks =
    getBestSong(
      histories,
      (h) =>
        h.totalWeeks
    );

  records.push({
    id:
      'most-total-weeks',

    title:
      'MOST TOTAL WEEKS ON THE HOT 100',

    description:
      'The song with the longest overall chart run.',

    record:
      mostTotalWeeks
        ? createSongRecord(
            mostTotalWeeks,
            mostTotalWeeks.totalWeeks,
            `${formatNumber(
              mostTotalWeeks.totalWeeks
            )} WEEKS`,
            `"${mostTotalWeeks.title}" by ${mostTotalWeeks.artist} has spent ${formatNumber(
              mostTotalWeeks.totalWeeks
            )} total weeks on the Hot 100.`
          )
        : null,
  });

  const biggestJump =
    getBestSong(
      histories,
      (h) =>
        h.biggestJumpToNumberOne
    );

  records.push({
    id:
      'biggest-jump-to-no1',

    title:
      'BIGGEST JUMP TO NO. 1',

    description:
      'The largest upward movement that landed a song at No. 1.',

    record:
      biggestJump
        ? createSongRecord(
            biggestJump,
            biggestJump.biggestJumpToNumberOne,
            `+${formatNumber(
              biggestJump.biggestJumpToNumberOne
            )} POSITIONS`,
            `"${biggestJump.title}" by ${biggestJump.artist} made a jump of ${formatNumber(
              biggestJump.biggestJumpToNumberOne
            )} positions to reach No. 1.`
          )
        : null,
  });

  const biggestUpward =
    getBestSong(
      histories,
      (h) =>
        h.biggestUpwardMovement
    );

  records.push({
    id:
      'biggest-upward-movement',

    title:
      'BIGGEST SINGLE-WEEK UPWARD MOVEMENT',

    description:
      'The largest one-week rise on the Hot 100.',

    record:
      biggestUpward
        ? createSongRecord(
            biggestUpward,
            biggestUpward.biggestUpwardMovement,
            `+${formatNumber(
              biggestUpward.biggestUpwardMovement
            )} POSITIONS`,
            `"${biggestUpward.title}" by ${biggestUpward.artist} climbed ${formatNumber(
              biggestUpward.biggestUpwardMovement
            )} positions in a single week.`
          )
        : null,
  });

  const longestClimb =
    getBestSong(
      histories.filter(
        (h) =>
          h.longestClimbToNumberOne !==
          null
      ),
      (h) =>
        h.longestClimbToNumberOne ??
        0
    );

  records.push({
    id:
      'longest-climb-to-no1',

    title:
      'LONGEST CLIMB TO NO. 1',

    description:
      'The most chart weeks a song took to reach No. 1 from its debut.',

    record:
      longestClimb
        ? createSongRecord(
            longestClimb,
            longestClimb.longestClimbToNumberOne ?? 0,
            `${formatNumber(
              longestClimb.longestClimbToNumberOne ?? 0
            )} WEEKS`,
            `"${longestClimb.title}" by ${longestClimb.artist} debuted ${formatChartDate(
              longestClimb.firstWeek
            )} and reached No. 1 on ${formatChartDate(
              longestClimb.firstNumberOneWeek ??
                ''
            )}, taking ${formatNumber(
              longestClimb.longestClimbToNumberOne ?? 0
            )} weeks.`
          )
        : null,
  });

  const biggestDrop =
    getBestSong(
      histories,
      (h) =>
        h.biggestDropFromNumberOne
    );

  records.push({
    id:
      'biggest-drop-from-no1',

    title:
      'BIGGEST DROP FROM NO. 1',

    description:
      'The largest fall immediately after a No. 1 week.',

    record:
      biggestDrop
        ? createSongRecord(
            biggestDrop,
            biggestDrop.biggestDropFromNumberOne,
            `−${formatNumber(
              biggestDrop.biggestDropFromNumberOne
            )} POSITIONS`,
            `"${biggestDrop.title}" by ${biggestDrop.artist} fell ${formatNumber(
              biggestDrop.biggestDropFromNumberOne
            )} positions from No. 1 in a single week.`
          )
        : null,
  });

  const biggestDownward =
    getBestSong(
      histories,
      (h) =>
        h.biggestDownwardMovement
    );

  records.push({
    id:
      'biggest-downward-movement',

    title:
      'BIGGEST SINGLE-WEEK DOWNWARD MOVEMENT',

    description:
      'The largest one-week decline on the Hot 100.',

    record:
      biggestDownward
        ? createSongRecord(
            biggestDownward,
            biggestDownward.biggestDownwardMovement,
            `−${formatNumber(
              biggestDownward.biggestDownwardMovement
            )} POSITIONS`,
            `"${biggestDownward.title}" by ${biggestDownward.artist} fell ${formatNumber(
              biggestDownward.biggestDownwardMovement
            )} positions in a single week.`
          )
        : null,
  });

  const officialFirstNoOneDebut =
    histories.find(
      (history) =>
        history.title
          .toLowerCase()
          .trim() ===
          "what's my name?" &&
        history.artist
          .toLowerCase()
          .includes('rihanna') &&
        history.artist
          .toLowerCase()
          .includes('drake') &&
        history.debutedAtNumberOne
    ) ??
    histories
      .filter(
        (h) =>
          h.debutedAtNumberOne
      )
      .sort(
        (a, b) =>
          parseChartDate(
            a.firstWeek
          ) -
          parseChartDate(
            b.firstWeek
          )
      )[0] ??
    null;

  records.push({
    id:
      'first-debut-no1',

    title:
      'FIRST SONG TO DEBUT AT NO. 1',

    description:
      'The first song in your chart history to enter directly at No. 1.',

    record:
      officialFirstNoOneDebut
        ? createSongRecord(
            officialFirstNoOneDebut,
            1,
            'NO. 1 DEBUT',
            `"${officialFirstNoOneDebut.title}" by ${officialFirstNoOneDebut.artist} was the first song in your chart history to debut at No. 1 on ${formatChartDate(
              officialFirstNoOneDebut.firstWeek
            )}.`
          )
        : null,
  });

  const longestTopTen =
    getBestSong(
      histories,
      (h) =>
        h.longestTopTenRun
    );

  records.push({
    id:
      'longest-top10-run',

    title:
      'MOST CONSECUTIVE WEEKS IN THE TOP 10',

    description:
      'The longest uninterrupted Top 10 run.',

    record:
      longestTopTen
        ? createSongRecord(
            longestTopTen,
            longestTopTen.longestTopTenRun,
            `${formatNumber(
              longestTopTen.longestTopTenRun
            )} WEEKS`,
            `"${longestTopTen.title}" by ${longestTopTen.artist} spent ${formatNumber(
              longestTopTen.longestTopTenRun
            )} consecutive weeks in the Top 10.`
          )
        : null,
  });

  return records;
}

/*
 * =========================================================
 * ARTIST IMAGE DATA
 * =========================================================
 */

function normalizeImageUrl(
  value: string
): string | undefined {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    trimmed.startsWith(
      'http://'
    ) ||
    trimmed.startsWith(
      'https://'
    )
  ) {
    return trimmed;
  }

  return undefined;
}

async function fetchArtistImages(): Promise<
  Map<string, string>
> {
  const images =
    new Map<
      string,
      string
    >();

  try {
    const response =
      await fetch(
        ARTIST_IMAGES_CSV,
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      console.error(
        'Artist image sheet failed:',
        response.status
      );

      return images;
    }

    const csv =
      await response.text();

    const rows =
      parseCsvRows(csv);

    for (
      let i = 2;
      i < rows.length;
      i++
    ) {
      const row =
        rows[i];

      const artist =
        (
          row[0] ?? ''
        ).trim();

      const image =
        normalizeImageUrl(
          row[14] ?? ''
        );

      if (
        !artist ||
        !image
      ) {
        continue;
      }

      images.set(
        artistKey(
          artist
        ),
        image
      );
    }

    console.log(
      `Loaded ${images.size} artist images`
    );
  } catch (error) {
    console.error(
      'Failed to load artist images:',
      error
    );
  }

  return images;
}

/*
 * =========================================================
 * ARTIST HISTORY
 * =========================================================
 */

interface ArtistSongHistory {
  title: string;
  artistString: string;

  weeks: SongWeek[];

  numberOneWeeks: number;
  topFiveCount: number;
  topTenCount: number;
  top40Count: number;

  totalEntries: number;
  firstWeek: string;
  firstNumberOneWeek: string | null;
}

interface ArtistHistory {
  artist: string;

  totalPoints: number;

  songs: Map<
    string,
    ArtistSongHistory
  >;

  numberOneSongs: Set<string>;
  numberOneWeeks: number;

  topFiveSongs: Set<string>;
  topTenSongs: Set<string>;
  top40Songs: Set<string>;

  allSongs: Set<string>;

  totalTopTenWeeks: number;

  weeksByDate: Set<string>;

  numberOneSongsByYear: Map<
    number,
    Set<string>
  >;

  numberOneWeeksByYear: Map<
    number,
    number
  >;

  image?: string;
}

/*
 * =========================================================
 * BUILD ARTIST HISTORIES
 * =========================================================
 */

function buildArtistHistories(
  entries: WeeklyChartEntry[],
  artistImages: Map<string, string>
): ArtistHistory[] {
  const artists =
    new Map<
      string,
      ArtistHistory
    >();

  for (const entry of entries) {
    const creditedArtists =
      getArtistsForEntry(
        entry
      );

    for (
      const artistName of creditedArtists
    ) {
      const key =
        artistKey(
          artistName
        );

      let history =
        artists.get(key);

      if (!history) {
        history = {
          artist:
            artistName,

          totalPoints:
            0,

          songs:
            new Map(),

          numberOneSongs:
            new Set(),

          numberOneWeeks:
            0,

          topFiveSongs:
            new Set(),

          topTenSongs:
            new Set(),

          top40Songs:
            new Set(),

          allSongs:
            new Set(),

          totalTopTenWeeks:
            0,

          weeksByDate:
            new Set(),

          numberOneSongsByYear:
            new Map(),

          numberOneWeeksByYear:
            new Map(),

          image:
            artistImages.get(
              key
            ),
        };

        artists.set(
          key,
          history
        );
      }

      history.totalPoints +=
        entry.points ?? 0;

      history.weeksByDate.add(
        entry.week
      );

      const songId =
        songKey(
          entry.title,
          entry.artist
        );

      history.allSongs.add(
        songId
      );

      if (
        entry.rank <= 5
      ) {
        history.topFiveSongs.add(
          songId
        );
      }

      if (
        entry.rank <= 10
      ) {
        history.topTenSongs.add(
          songId
        );

        history.totalTopTenWeeks++;
      }

      if (
        entry.rank <= 40
      ) {
        history.top40Songs.add(
          songId
        );
      }

      let song =
        history.songs.get(
          songId
        );

      if (!song) {
        song = {
          title:
            entry.title,

          artistString:
            entry.artist,

          weeks: [],

          numberOneWeeks:
            0,

          topFiveCount:
            0,

          topTenCount:
            0,

          top40Count:
            0,

          totalEntries:
            0,

          firstWeek:
            entry.week,

          firstNumberOneWeek:
            null,
        };

        history.songs.set(
          songId,
          song
        );
      }

      song.weeks.push({
        week:
          entry.week,

        rank:
          entry.rank,

        artwork:
          entry.artwork,
      });

      song.totalEntries++;

      if (
        entry.rank === 1
      ) {
        song.numberOneWeeks++;

        if (
          !song.firstNumberOneWeek
        ) {
          song.firstNumberOneWeek =
            entry.week;
        }

        history.numberOneWeeks++;

        history.numberOneSongs.add(
          songId
        );

        const year =
          getChartYear(
            entry.week
          );

        if (
          !history.numberOneSongsByYear.has(
            year
          )
        ) {
          history.numberOneSongsByYear.set(
            year,
            new Set()
          );
        }

        history.numberOneSongsByYear
          .get(year)!
          .add(songId);

        history.numberOneWeeksByYear.set(
          year,
          (
            history.numberOneWeeksByYear.get(
              year
            ) ?? 0
          ) + 1
        );
      }
    }
  }

  for (
    const history of artists.values()
  ) {
    for (
      const song of history.songs.values()
    ) {
      song.weeks.sort(
        (a, b) =>
          parseChartDate(
            a.week
          ) -
          parseChartDate(
            b.week
          )
      );

      song.topFiveCount =
        song.weeks.filter(
          (week) =>
            week.rank <= 5
        ).length;

      song.topTenCount =
        song.weeks.filter(
          (week) =>
            week.rank <= 10
        ).length;

      song.top40Count =
        song.weeks.filter(
          (week) =>
            week.rank <= 40
        ).length;
    }
  }

  return Array.from(
    artists.values()
  );
}

/*
 * =========================================================
 * ARTIST RECORD HELPERS
 * =========================================================
 */

function createArtistRecord(
  history: ArtistHistory,
  value: number,
  valueLabel: string,
  description: string
): ArtistRecord {
  return {
    id:
      artistKey(
        history.artist
      ),

    title:
      history.artist,

    artist:
      history.artist,

    image:
      history.image,

    value,
    valueLabel,

    description,
  };
}

function getBestArtist(
  histories: ArtistHistory[],
  selector: (
    history: ArtistHistory
  ) => number
): ArtistHistory | null {
  if (!histories.length) {
    return null;
  }

  return histories.reduce(
    (best, current) =>
      selector(current) >
      selector(best)
        ? current
        : best
  );
}

/*
 * =========================================================
 * ARTIST STREAK HELPERS
 * =========================================================
 */

function getLongestConsecutiveYears(
  years: number[]
): number {
  const sorted =
    Array.from(
      new Set(
        years.filter(
          (year) =>
            year > 0
        )
      )
    ).sort(
      (a, b) =>
        a - b
    );

  if (!sorted.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (
    let i = 1;
    i < sorted.length;
    i++
  ) {
    if (
      sorted[i] ===
      sorted[i - 1] + 1
    ) {
      current++;

      longest =
        Math.max(
          longest,
          current
        );
    } else {
      current = 1;
    }
  }

  return longest;
}

function getLongestConsecutiveYearRange(
  years: number[]
): string {
  const sorted =
    Array.from(
      new Set(
        years.filter(
          (year) =>
            year > 0
        )
      )
    ).sort(
      (a, b) =>
        a - b
    );

  if (!sorted.length) {
    return '';
  }

  let bestStart =
    sorted[0];

  let bestEnd =
    sorted[0];

  let start =
    sorted[0];

  for (
    let i = 1;
    i <= sorted.length;
    i++
  ) {
    if (
      i < sorted.length &&
      sorted[i] ===
        sorted[i - 1] + 1
    ) {
      continue;
    }

    const end =
      sorted[i - 1];

    if (
      end - start >
      bestEnd - bestStart
    ) {
      bestStart =
        start;

      bestEnd =
        end;
    }

    if (
      i < sorted.length
    ) {
      start =
        sorted[i];
    }
  }

  return bestStart === bestEnd
    ? String(bestStart)
    : `${bestStart}–${bestEnd}`;
}

function getLongestChartingYears(
  history: ArtistHistory
): number {
  return getLongestConsecutiveYears(
    Array.from(
      history.weeksByDate
    ).map(
      getChartYear
    )
  );
}

function getLongestChartingYearRange(
  history: ArtistHistory
): string {
  return getLongestConsecutiveYearRange(
    Array.from(
      history.weeksByDate
    ).map(
      getChartYear
    )
  );
}

function getLongestConsecutiveWeeks(
  history: ArtistHistory
): number {
  const dates =
    Array.from(
      history.weeksByDate
    ).sort(
      (a, b) =>
        parseChartDate(a) -
        parseChartDate(b)
    );

  if (!dates.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (
    let i = 1;
    i < dates.length;
    i++
  ) {
    if (
      isConsecutiveWeek(
        dates[i - 1],
        dates[i]
      )
    ) {
      current++;

      longest =
        Math.max(
          longest,
          current
        );
    } else {
      current = 1;
    }
  }

  return longest;
}

function getLongestConsecutiveWeekRange(
  history: ArtistHistory
): {
  weeks: number;
  start: string;
  end: string;
} {
  const dates =
    Array.from(
      history.weeksByDate
    ).sort(
      (a, b) =>
        parseChartDate(a) -
        parseChartDate(b)
    );

  if (!dates.length) {
    return {
      weeks: 0,
      start: '',
      end: '',
    };
  }

  let bestStart =
    dates[0];

  let bestEnd =
    dates[0];

  let start =
    dates[0];

  for (
    let i = 1;
    i <= dates.length;
    i++
  ) {
    if (
      i < dates.length &&
      isConsecutiveWeek(
        dates[i - 1],
        dates[i]
      )
    ) {
      continue;
    }

    const end =
      dates[i - 1];

    if (
      parseChartDate(end) -
        parseChartDate(start) >
      parseChartDate(bestEnd) -
        parseChartDate(bestStart)
    ) {
      bestStart =
        start;

      bestEnd =
        end;
    }

    if (
      i < dates.length
    ) {
      start =
        dates[i];
    }
  }

  const weeks =
    Math.round(
      (
        parseChartDate(bestEnd) -
        parseChartDate(bestStart)
      ) /
        (
          7 *
          24 *
          60 *
          60 *
          1000
        )
    ) + 1;

  return {
    weeks,
    start:
      bestStart,
    end:
      bestEnd,
  };
}

function getLongestArtistTopTenRun(
  history: ArtistHistory
): number {
  return getLongestArtistTopTenRange(
    history
  ).weeks;
}

function getLongestArtistTopTenRange(
  history: ArtistHistory
): {
  weeks: number;
  start: string;
  end: string;
} {
  const topTenWeeks =
    new Set<string>();

  for (
    const song of history.songs.values()
  ) {
    for (
      const week of song.weeks
    ) {
      if (
        week.rank <= 10
      ) {
        topTenWeeks.add(
          week.week
        );
      }
    }
  }

  const dates =
    Array.from(
      topTenWeeks
    ).sort(
      (a, b) =>
        parseChartDate(a) -
        parseChartDate(b)
    );

  if (!dates.length) {
    return {
      weeks: 0,
      start: '',
      end: '',
    };
  }

  let bestStart =
    dates[0];

  let bestEnd =
    dates[0];

  let start =
    dates[0];

  for (
    let i = 1;
    i <= dates.length;
    i++
  ) {
    if (
      i < dates.length &&
      isConsecutiveWeek(
        dates[i - 1],
        dates[i]
      )
    ) {
      continue;
    }

    const end =
      dates[i - 1];

    if (
      parseChartDate(end) -
        parseChartDate(start) >
      parseChartDate(bestEnd) -
        parseChartDate(bestStart)
    ) {
      bestStart =
        start;

      bestEnd =
        end;
    }

    if (
      i < dates.length
    ) {
      start =
        dates[i];
    }
  }

  const weeks =
    Math.round(
      (
        parseChartDate(bestEnd) -
        parseChartDate(bestStart)
      ) /
        (
          7 *
          24 *
          60 *
          60 *
          1000
        )
    ) + 1;

  return {
    weeks,
    start:
      bestStart,
    end:
      bestEnd,
  };
}

/*
 * =========================================================
 * ARTIST CLASSIFICATION
 * =========================================================
 */

const FEMALE_ARTISTS =
  new Set(
    [
      'Taylor Swift',
      'Lady Gaga',
      'Adele',
      'Rihanna',
      'Katy Perry',
      'Beyoncé',
      'Beyonce',
      'Miley Cyrus',
      'Ariana Grande',
      'Nicki Minaj',
      'Billie Eilish',
      'Olivia Rodrigo',
      'Dua Lipa',
      'SZA',
      'Doja Cat',
      'Sabrina Carpenter',
      'Chappell Roan',
      'Kesha',
      'JENNIE',
      'Jennie',
      'Charli XCX',
      'Halsey',
      'Meghan Trainor',
      'Iggy Azalea',
      'Carly Rae Jepsen',
    ].map(
      artistKey
    )
  );

const MALE_ARTISTS =
  new Set(
    [
      'Bruno Mars',
      'Justin Bieber',
      'Ed Sheeran',
      'Drake',
      'The Weeknd',
      'Post Malone',
      'Harry Styles',
      'Bad Bunny',
      'Khalid',
      'Sam Smith',
      'Jason Derulo',
      'Jin',
      'Arthur Nery',
      'Earl Agustin',
      'Hev Abi',
      'Kenaniah',
      'Eminem',
      'Shawn Mendes',
    ].map(
      artistKey
    )
  );

const GROUP_ARTISTS =
  new Set(
    [
      'BTS',
      'The Black Eyed Peas',
      'Maroon 5',
      'The Chainsmokers',
      'OneRepublic',
      'IV Of Spades',
      'LANY',
      'Cup of Joe',
      'BINI',
      'NewJeans',
      'Mumford & Sons',
      'Macklemore & Ryan Lewis',
      'Nico & Vinz',
    ].map(
      artistKey
    )
  );

function isFemaleArtist(
  artist: string
): boolean {
  return FEMALE_ARTISTS.has(
    artistKey(artist)
  );
}

function isMaleArtist(
  artist: string
): boolean {
  return MALE_ARTISTS.has(
    artistKey(artist)
  );
}

function isGroupArtist(
  artist: string
): boolean {
  return GROUP_ARTISTS.has(
    artistKey(artist)
  );
}

/*
 * =========================================================
 * ARTIST HOT 100 RECORDS
 * =========================================================
 */

function buildArtistHot100Records(
  histories: ArtistHistory[]
): ArtistRecordCategory[] {
  const records:
    ArtistRecordCategory[] = [];

  const mostNumberOneSingles =
    getBestArtist(
      histories,
      (h) =>
        h.numberOneSongs.size
    );

  records.push({
    id:
      'most-number-one-singles',

    title:
      'MOST NUMBER-ONE SINGLES',

    description:
      'The artist with the most different songs reaching No. 1.',

    record:
      mostNumberOneSingles
        ? createArtistRecord(
            mostNumberOneSingles,
            mostNumberOneSingles.numberOneSongs.size,
            `${formatNumber(
              mostNumberOneSingles.numberOneSongs.size
            )} NO. 1S`,
            `${mostNumberOneSingles.artist} has had ${formatNumber(
              mostNumberOneSingles.numberOneSongs.size
            )} different songs reach No. 1, with those No. 1s occurring across ${yearRange(
              Array.from(
                mostNumberOneSingles.numberOneSongsByYear.keys()
              )
            )}.`
          )
        : null,
  });

  const mostFemale =
    getBestArtist(
      histories.filter(
        (h) =>
          isFemaleArtist(
            h.artist
          )
      ),
      (h) =>
        h.numberOneSongs.size
    );

  records.push({
    id:
      'most-number-one-singles-female',

    title:
      'MOST NUMBER-ONE SINGLES FEMALE',

    description:
      'The female artist with the most different No. 1 singles.',

    record:
      mostFemale
        ? createArtistRecord(
            mostFemale,
            mostFemale.numberOneSongs.size,
            `${formatNumber(
              mostFemale.numberOneSongs.size
            )} NO. 1S`,
            `${mostFemale.artist} has had ${formatNumber(
              mostFemale.numberOneSongs.size
            )} No. 1 singles across ${yearRange(
              Array.from(
                mostFemale.numberOneSongsByYear.keys()
              )
            )}.`
          )
        : null,
  });

  const mostMale =
    getBestArtist(
      histories.filter(
        (h) =>
          isMaleArtist(
            h.artist
          )
      ),
      (h) =>
        h.numberOneSongs.size
    );

  records.push({
    id:
      'most-number-one-singles-male',

    title:
      'MOST NUMBER-ONE SINGLES MALE',

    description:
      'The male artist with the most different No. 1 singles.',

    record:
      mostMale
        ? createArtistRecord(
            mostMale,
            mostMale.numberOneSongs.size,
            `${formatNumber(
              mostMale.numberOneSongs.size
            )} NO. 1S`,
            `${mostMale.artist} has had ${formatNumber(
              mostMale.numberOneSongs.size
            )} No. 1 singles across ${yearRange(
              Array.from(
                mostMale.numberOneSongsByYear.keys()
              )
            )}.`
          )
        : null,
  });

  const mostGroup =
    getBestArtist(
      histories.filter(
        (h) =>
          isGroupArtist(
            h.artist
          )
      ),
      (h) =>
        h.numberOneSongs.size
    );

  records.push({
    id:
      'most-number-one-singles-groups',

    title:
      'MOST NUMBER-ONE SINGLES GROUPS, BANDS, DUOS',

    description:
      'The group, band, or duo with the most different No. 1 singles.',

    record:
      mostGroup
        ? createArtistRecord(
            mostGroup,
            mostGroup.numberOneSongs.size,
            `${formatNumber(
              mostGroup.numberOneSongs.size
            )} NO. 1S`,
            `${mostGroup.artist} has had ${formatNumber(
              mostGroup.numberOneSongs.size
            )} No. 1 singles across ${yearRange(
              Array.from(
                mostGroup.numberOneSongsByYear.keys()
              )
            )}.`
          )
        : null,
  });

  const mostCumulativeNumberOneWeeks =
    getBestArtist(
      histories,
      (h) =>
        h.numberOneWeeks
    );

  records.push({
    id:
      'most-cumulative-weeks-no1',

    title:
      'MOST CUMULATIVE WEEKS AT NO. 1',

    description:
      'The artist with the most combined weeks at No. 1 across all of their songs.',

    record:
      mostCumulativeNumberOneWeeks
        ? createArtistRecord(
            mostCumulativeNumberOneWeeks,
            mostCumulativeNumberOneWeeks.numberOneWeeks,
            `${formatNumber(
              mostCumulativeNumberOneWeeks.numberOneWeeks
            )} WEEKS`,
            `${mostCumulativeNumberOneWeeks.artist} has spent ${formatNumber(
              mostCumulativeNumberOneWeeks.numberOneWeeks
            )} cumulative weeks at No. 1 across ${yearRange(
              Array.from(
                mostCumulativeNumberOneWeeks.numberOneWeeksByYear.keys()
              )
            )}.`
          )
        : null,
  });

  const longestNumberOneYears =
    getBestArtist(
      histories,
      (h) =>
        getLongestConsecutiveYears(
          Array.from(
            h.numberOneSongsByYear.keys()
          )
        )
    );

  const longestNumberOneYearsValue =
    longestNumberOneYears
      ? getLongestConsecutiveYears(
          Array.from(
            longestNumberOneYears.numberOneSongsByYear.keys()
          )
        )
      : 0;

  const longestNumberOneYearRange =
    longestNumberOneYears
      ? getLongestConsecutiveYearRange(
          Array.from(
            longestNumberOneYears.numberOneSongsByYear.keys()
          )
        )
      : '';

  records.push({
    id:
      'most-consecutive-years-number-one',

    title:
      'MOST CONSECUTIVE YEARS CHARTING A NUMBER-ONE SINGLE',

    description:
      'The longest consecutive run of calendar years in which an artist had a No. 1 single.',

    record:
      longestNumberOneYears
        ? createArtistRecord(
            longestNumberOneYears,
            longestNumberOneYearsValue,
            `${formatNumber(
              longestNumberOneYearsValue
            )} YEARS`,
            `${longestNumberOneYears.artist} had at least one No. 1 single for ${formatNumber(
              longestNumberOneYearsValue
            )} consecutive years (${longestNumberOneYearRange}).`
          )
        : null,
  });

  const longestChartingYears =
    getBestArtist(
      histories,
      (h) =>
        getLongestChartingYears(
          h
        )
    );

  const longestChartingYearsValue =
    longestChartingYears
      ? getLongestChartingYears(
          longestChartingYears
        )
      : 0;

  const longestChartingYearRange =
    longestChartingYears
      ? getLongestChartingYearRange(
          longestChartingYears
        )
      : '';

  records.push({
    id:
      'most-consecutive-years-hot100',

    title:
      'MOST CONSECUTIVE YEARS CHARTING ON THE HOT 100',

    description:
      'The longest uninterrupted sequence of calendar years in which an artist appeared on the Hot 100.',

    record:
      longestChartingYears
        ? createArtistRecord(
            longestChartingYears,
            longestChartingYearsValue,
            `${formatNumber(
              longestChartingYearsValue
            )} YEARS`,
            `${longestChartingYears.artist} appeared on the Hot 100 for ${formatNumber(
              longestChartingYearsValue
            )} consecutive calendar years (${longestChartingYearRange}).`
          )
        : null,
  });

  let bestNumberOnesInYear:
    {
      history: ArtistHistory;
      year: number;
      value: number;
    } | null = null;

  for (
    const history of histories
  ) {
    for (
      const [
        year,
        songs,
      ] of history.numberOneSongsByYear
    ) {
      const value =
        songs.size;

      if (
        !bestNumberOnesInYear ||
        value >
          bestNumberOnesInYear.value ||
        (
          value ===
            bestNumberOnesInYear.value &&
          year <
            bestNumberOnesInYear.year
        )
      ) {
        bestNumberOnesInYear = {
          history,
          year,
          value,
        };
      }
    }
  }

  records.push({
    id:
      'most-number-one-singles-calendar-year',

    title:
      'MOST NUMBER-ONE SINGLES IN A CALENDAR YEAR',

    description:
      'The most different No. 1 singles by an artist in a single calendar year.',

    record:
      bestNumberOnesInYear
        ? createArtistRecord(
            bestNumberOnesInYear.history,
            bestNumberOnesInYear.value,
            `${formatNumber(
              bestNumberOnesInYear.value
            )} NO. 1S — ${bestNumberOnesInYear.year}`,
            `${bestNumberOnesInYear.history.artist} had ${formatNumber(
              bestNumberOnesInYear.value
            )} different No. 1 singles in ${bestNumberOnesInYear.year}.`
          )
        : null,
  });

  const mostTopFive =
    getBestArtist(
      histories,
      (h) =>
        h.topFiveSongs.size
    );

  records.push({
    id:
      'most-top-five-singles',

    title:
      'MOST TOP FIVE SINGLES',

    description:
      'The artist with the most different Top 5 singles.',

    record:
      mostTopFive
        ? createArtistRecord(
            mostTopFive,
            mostTopFive.topFiveSongs.size,
            `${formatNumber(
              mostTopFive.topFiveSongs.size
            )} SINGLES`,
            `${mostTopFive.artist} has had ${formatNumber(
              mostTopFive.topFiveSongs.size
            )} different Top 5 singles.`
          )
        : null,
  });

  const mostTopTen =
    getBestArtist(
      histories,
      (h) =>
        h.topTenSongs.size
    );

  records.push({
    id:
      'most-top-ten-singles',

    title:
      'MOST TOP 10 SINGLES',

    description:
      'The artist with the most different Top 10 singles.',

    record:
      mostTopTen
        ? createArtistRecord(
            mostTopTen,
            mostTopTen.topTenSongs.size,
            `${formatNumber(
              mostTopTen.topTenSongs.size
            )} SINGLES`,
            `${mostTopTen.artist} has had ${formatNumber(
              mostTopTen.topTenSongs.size
            )} different Top 10 singles.`
          )
        : null,
  });

  const mostTopTenWeeks =
    getBestArtist(
      histories,
      (h) =>
        h.totalTopTenWeeks
    );

  records.push({
    id:
      'most-cumulative-weeks-top10',

    title:
      'MOST CUMULATIVE WEEKS IN THE TOP 10',

    description:
      'The artist with the most combined weeks inside the Top 10.',

    record:
      mostTopTenWeeks
        ? createArtistRecord(
            mostTopTenWeeks,
            mostTopTenWeeks.totalTopTenWeeks,
            `${formatNumber(
              mostTopTenWeeks.totalTopTenWeeks
            )} WEEKS`,
            `${mostTopTenWeeks.artist} has accumulated ${formatNumber(
              mostTopTenWeeks.totalTopTenWeeks
            )} weeks inside the Top 10.`
          )
        : null,
  });

  const longestArtistTopTen =
    getBestArtist(
      histories,
      (h) =>
        getLongestArtistTopTenRun(
          h
        )
    );

  const longestArtistTopTenRange =
    longestArtistTopTen
      ? getLongestArtistTopTenRange(
          longestArtistTopTen
        )
      : null;

  records.push({
    id:
      'most-consecutive-weeks-top10-artist',

    title:
      'MOST CONSECUTIVE WEEKS IN THE TOP 10',

    description:
      'The longest uninterrupted weekly period in which an artist had at least one song inside the Top 10.',

    record:
      longestArtistTopTen &&
      longestArtistTopTenRange
        ? createArtistRecord(
            longestArtistTopTen,
            longestArtistTopTenRange.weeks,
            `${formatNumber(
              longestArtistTopTenRange.weeks
            )} WEEKS`,
            `${longestArtistTopTen.artist} had at least one song inside the Top 10 for ${formatNumber(
              longestArtistTopTenRange.weeks
            )} consecutive weeks, from ${formatChartDate(
              longestArtistTopTenRange.start
            )} to ${formatChartDate(
              longestArtistTopTenRange.end
            )}.`
          )
        : null,
  });

  const mostTop40 =
    getBestArtist(
      histories,
      (h) =>
        h.top40Songs.size
    );

  records.push({
    id:
      'most-top40-entries',

    title:
      'MOST TOP 40 ENTRIES',

    description:
      'The artist with the most different songs reaching the Top 40.',

    record:
      mostTop40
        ? createArtistRecord(
            mostTop40,
            mostTop40.top40Songs.size,
            `${formatNumber(
              mostTop40.top40Songs.size
            )} ENTRIES`,
            `${mostTop40.artist} has had ${formatNumber(
              mostTop40.top40Songs.size
            )} different Top 40 entries.`
          )
        : null,
  });

  const mostEntries =
    getBestArtist(
      histories,
      (h) =>
        h.allSongs.size
    );

  records.push({
    id:
      'most-hot100-entries',

    title:
      'MOST HOT 100 ENTRIES',

    description:
      'The artist with the most different songs appearing on the Hot 100.',

    record:
      mostEntries
        ? createArtistRecord(
            mostEntries,
            mostEntries.allSongs.size,
            `${formatNumber(
              mostEntries.allSongs.size
            )} ENTRIES`,
            `${mostEntries.artist} has had ${formatNumber(
              mostEntries.allSongs.size
            )} different Hot 100 entries.`
          )
        : null,
  });

  const longestHot100Run =
    getBestArtist(
      histories,
      (h) =>
        getLongestConsecutiveWeeks(
          h
        )
    );

  const longestHot100Range =
    longestHot100Run
      ? getLongestConsecutiveWeekRange(
          longestHot100Run
        )
      : null;

  records.push({
    id:
      'most-consecutive-weeks-hot100-artist',

    title:
      'MOST CONSECUTIVE WEEKS ON HOT 100',

    description:
      'The longest uninterrupted weekly period in which an artist had at least one song on the Hot 100.',

    record:
      longestHot100Run &&
      longestHot100Range
        ? createArtistRecord(
            longestHot100Run,
            longestHot100Range.weeks,
            `${formatNumber(
              longestHot100Range.weeks
            )} WEEKS`,
            `${longestHot100Run.artist} appeared on the Hot 100 for ${formatNumber(
              longestHot100Range.weeks
            )} consecutive weeks, from ${formatChartDate(
              longestHot100Range.start
            )} to ${formatChartDate(
              longestHot100Range.end
            )}.`
          )
        : null,
  });

  return records;
}

/*
 * =========================================================
 * AWARDS
 * =========================================================
 */

interface AwardStats {
  nominations: number;
  wins: number;

  nominationsByYear: Map<
    number,
    number
  >;

  winsByYear: Map<
    number,
    number
  >;
}

/*
 * =========================================================
 * CSV PARSER
 * =========================================================
 */

function parseCsvRows(
  csv: string
): string[][] {
  const rows:
    string[][] = [];

  let row:
    string[] = [];

  let field =
    '';

  let insideQuotes =
    false;

  for (
    let i = 0;
    i < csv.length;
    i++
  ) {
    const char =
      csv[i];

    if (
      char === '"'
    ) {
      if (
        insideQuotes &&
        csv[i + 1] === '"'
      ) {
        field += '"';
        i++;
      } else {
        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      char === ',' &&
      !insideQuotes
    ) {
      row.push(
        field
      );

      field =
        '';

      continue;
    }

    if (
      char === '\n' &&
      !insideQuotes
    ) {
      row.push(
        field
      );

      rows.push(
        row
      );

      row =
        [];

      field =
        '';

      continue;
    }

    if (
      char !== '\r'
    ) {
      field +=
        char;
    }
  }

  row.push(
    field
  );

  if (
    row.length > 1 ||
    row[0]?.trim()
  ) {
    rows.push(
      row
    );
  }

  return rows;
}

/*
 * =========================================================
 * FETCH AWARDS
 * =========================================================
 *
 * IMPORTANT:
 *
 * Awards are calculated independently of Hot 100 history.
 * Every artist in the Awards sheet can therefore qualify.
 *
 * The first row contains the years.
 * Column A contains the award/category/name information.
 *
 * Each non-empty cell represents one award entry.
 * "(Winner)" identifies a win.
 *
 * Multiple individual artists in one cell are split.
 * The three legitimate "&" acts remain intact.
 * =========================================================
 */

async function fetchAwardStats(): Promise<
  Map<string, AwardStats>
> {
  const stats = new Map<string, AwardStats>();

  try {
    const response = await fetch(AWARDS_CSV, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'Awards sheet failed:',
        response.status
      );

      return stats;
    }

    const csv = await response.text();
    const rows = parseCsvRows(csv);

    if (rows.length < 2) {
      console.error(
        'Awards sheet contains no data'
      );

      return stats;
    }

    /*
     * Awards sheet structure:
     *
     * A2:A15 = award categories
     * B1:R1  = years
     * B2:R15 = nominee cells
     *
     * Each nominee is separated by a line break.
     * Each nominee line counts as ONE nomination.
     * "(WINNER)" means that exact nominee line is a win.
     */

    const headers = rows[0];

    for (
      let rowIndex = 1;
      rowIndex < rows.length;
      rowIndex++
    ) {
      const row = rows[rowIndex];

      /*
       * Column A contains the award/category name.
       * We don't need to use it for counting, but keeping
       * the row structure intact is important.
       */

      for (
        let columnIndex = 1;
        columnIndex < headers.length;
        columnIndex++
      ) {
        const header = (
          headers[columnIndex] ?? ''
        ).trim();

        const year = Number(header);

        /*
         * Only process actual year columns.
         */
        if (
          !Number.isFinite(year) ||
          year < 1900 ||
          year > 2100
        ) {
          continue;
        }

        const cell = (
          row[columnIndex] ?? ''
        ).trim();

        if (
          !cell ||
          cell === '--'
        ) {
          continue;
        }

        /*
         * IMPORTANT:
         *
         * Every physical line in the cell is ONE nominee.
         *
         * Do NOT split a nominee based on commas.
         * Do NOT count the whole cell as one nomination.
         */
        const nomineeLines = cell
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (
          const nomineeLine of nomineeLines
        ) {
          /*
           * Determine winner status BEFORE removing
           * the "(WINNER)" marker.
           */
          const isWinner =
            /\(\s*WINNER\s*\)/i.test(
              nomineeLine
            );

          /*
           * Remove ONLY the winner marker.
           *
           * The actual nominee/artist text remains intact.
           */
          const nominee = nomineeLine
            .replace(
              /\s*\(\s*WINNER\s*\)\s*/gi,
              ''
            )
            .trim();

          if (!nominee) {
            continue;
          }

          /*
           * Convert the nominee line into the individual
           * credited artists using the existing artist
           * splitting rules in records.ts.
           *
           * This preserves the legitimate "&" acts defined
           * in AMPERSAND_ACTS.
           */
          const creditedArtists =
            splitAwardArtists(nominee);

          /*
           * Each credited artist gets:
           *
           * +1 nomination for this nominee line
           *
           * and, if the line is a winner:
           *
           * +1 win for this nominee line
           */
          for (
            const artistName of creditedArtists
          ) {
            const cleanedArtist =
              artistName.trim();

            if (!cleanedArtist) {
              continue;
            }

            const key =
              artistKey(cleanedArtist);

            if (!key) {
              continue;
            }

            let artistStats =
              stats.get(key);

            if (!artistStats) {
              artistStats = {
                nominations: 0,
                wins: 0,

                nominationsByYear:
                  new Map<number, number>(),

                winsByYear:
                  new Map<number, number>(),
              };

              stats.set(
                key,
                artistStats
              );
            }

            /*
             * ONE nomination for ONE nominee line.
             */
            artistStats.nominations += 1;

            const previousNominations =
              artistStats
                .nominationsByYear
                .get(year) ?? 0;

            artistStats
              .nominationsByYear
              .set(
                year,
                previousNominations + 1
              );

            /*
             * "(WINNER)" on this exact nominee line
             * means ONE win.
             */
            if (isWinner) {
              artistStats.wins += 1;

              const previousWins =
                artistStats
                  .winsByYear
                  .get(year) ?? 0;

              artistStats
                .winsByYear
                .set(
                  year,
                  previousWins + 1
                );
            }
          }
        }
      }
    }

    console.log(
      `Loaded awards for ${stats.size} artists`
    );

    /*
     * Useful debugging output.
     *
     * This lets us verify the actual totals being
     * generated from the Awards sheet.
     */
    console.log(
      'Awards statistics:',
      Array.from(stats.entries()).map(
        ([key, value]) => ({
          artist: key,
          nominations: value.nominations,
          wins: value.wins,
          nominationsByYear:
            Object.fromEntries(
              value.nominationsByYear
            ),
          winsByYear:
            Object.fromEntries(
              value.winsByYear
            ),
        })
      )
    );
  } catch (error) {
    console.error(
      'Failed to load awards:',
      error
    );
  }

  return stats;
}
/*
 * =========================================================
 * AWARDS RECORD HELPERS
 * =========================================================
 */

function createAwardArtistHistory(
  artist: string,
  image?: string
): ArtistHistory {
  return {
    artist,

    totalPoints:
      0,

    songs:
      new Map(),

    numberOneSongs:
      new Set(),

    numberOneWeeks:
      0,

    topFiveSongs:
      new Set(),

    topTenSongs:
      new Set(),

    top40Songs:
      new Set(),

    allSongs:
      new Set(),

    totalTopTenWeeks:
      0,

    weeksByDate:
      new Set(),

    numberOneSongsByYear:
      new Map(),

    numberOneWeeksByYear:
      new Map(),

    image,
  };
}

/*
 * =========================================================
 * AWARDS RECORDS
 * =========================================================
 */

function buildArtistAwardRecords(
  histories: ArtistHistory[],
  awards: Map<string, AwardStats>,
  artistImages: Map<string, string>
): ArtistRecordCategory[] {
  const records:
    ArtistRecordCategory[] = [];

  /*
   * IMPORTANT:
   *
   * Awards candidates come DIRECTLY from the Awards sheet.
   * They are NOT restricted to Hot 100 artists.
   */

  const historyByArtist =
    new Map<
      string,
      ArtistHistory
    >();

  for (
    const history of histories
  ) {
    historyByArtist.set(
      artistKey(
        history.artist
      ),
      history
    );
  }

  const candidates =
    Array.from(
      awards.entries()
    )
      .map(
        ([key, stats]) => {
          const history =
            historyByArtist.get(
              key
            ) ??
            createAwardArtistHistory(
              /*
               * We need the display name from
               * the actual Awards data.
               *
               * If no Hot 100 history exists,
               * use the key as fallback.
               */
              key,
              artistImages.get(
                key
              )
            );

          return {
            history,
            stats,
          };
        }
      )
      .filter(
        (item) =>
          item.stats.nominations > 0
      );

  /*
   * -------------------------------------------------------
   * 16. MOST NOMINATED
   * -------------------------------------------------------
   */

  const mostNominated =
    candidates.reduce<{
      history: ArtistHistory;
      stats: AwardStats;
    } | null>(
      (
        best,
        current
      ) =>
        !best ||
        current.stats.nominations >
          best.stats.nominations
          ? current
          : best,
      null
    );

  const mostNominatedYears =
    mostNominated
      ? Array.from(
          mostNominated.stats
            .nominationsByYear
            .keys()
        )
      : [];

  records.push({
    id:
      'most-nominated-elio-charts-awards',

    title:
      'MOST NOMINATED AT ELIO CHARTS AWARDS',

    description:
      'The artist with the most Elio Charts Awards nominations.',

    record:
      mostNominated
        ? createArtistRecord(
            mostNominated.history,
            mostNominated.stats.nominations,
            `${formatNumber(
              mostNominated.stats.nominations
            )} NOMINATIONS`,
            `${mostNominated.history.artist} has received ${formatNumber(
              mostNominated.stats.nominations
            )} nominations at the Elio Charts Awards across ${yearRange(
              mostNominatedYears
            )}.`
          )
        : null,
  });

  /*
   * -------------------------------------------------------
   * 17. MOST AWARDED
   * -------------------------------------------------------
   */

  const mostAwarded =
    candidates.reduce<{
      history: ArtistHistory;
      stats: AwardStats;
    } | null>(
      (
        best,
        current
      ) =>
        !best ||
        current.stats.wins >
          best.stats.wins
          ? current
          : best,
      null
    );

  const mostAwardedYears =
    mostAwarded
      ? Array.from(
          mostAwarded.stats
            .winsByYear
            .keys()
        )
      : [];

  records.push({
    id:
      'most-awarded-elio-charts-awards',

    title:
      'MOST AWARDED AT ELIO CHARTS AWARDS',

    description:
      'The artist with the most Elio Charts Awards wins.',

    record:
      mostAwarded
        ? createArtistRecord(
            mostAwarded.history,
            mostAwarded.stats.wins,
            `${formatNumber(
              mostAwarded.stats.wins
            )} WINS`,
            `${mostAwarded.history.artist} has won ${formatNumber(
              mostAwarded.stats.wins
            )} Elio Charts Awards across ${yearRange(
              mostAwardedYears
            )}.`
          )
        : null,
  });

  /*
   * -------------------------------------------------------
   * 18. MOST NOMINATIONS IN ONE YEAR
   * -------------------------------------------------------
   */

  let bestNominationYear:
    {
      history: ArtistHistory;
      year: number;
      value: number;
    } | null = null;

  for (
    const candidate of candidates
  ) {
    for (
      const [
        year,
        value,
      ] of candidate.stats
        .nominationsByYear
    ) {
      if (
        !bestNominationYear ||
        value >
          bestNominationYear.value ||
        (
          value ===
            bestNominationYear.value &&
          year <
            bestNominationYear.year
        )
      ) {
        bestNominationYear = {
          history:
            candidate.history,

          year,

          value,
        };
      }
    }
  }

  records.push({
    id:
      'most-nominations-one-year',

    title:
      'MOST NOMINATIONS IN ONE YEAR AT ELIO CHARTS AWARDS',

    description:
      'The most Elio Charts Awards nominations received by an artist in a single year.',

    record:
      bestNominationYear
        ? createArtistRecord(
            bestNominationYear.history,
            bestNominationYear.value,
            `${formatNumber(
              bestNominationYear.value
            )} NOMINATIONS — ${bestNominationYear.year}`,
            `${bestNominationYear.history.artist} received ${formatNumber(
              bestNominationYear.value
            )} nominations at the Elio Charts Awards in ${bestNominationYear.year}.`
          )
        : null,
  });

  /*
   * -------------------------------------------------------
   * 19. MOST WINS IN ONE YEAR
   * -------------------------------------------------------
   */

  let bestWinYear:
    {
      history: ArtistHistory;
      year: number;
      value: number;
    } | null = null;

  for (
    const candidate of candidates
  ) {
    for (
      const [
        year,
        value,
      ] of candidate.stats
        .winsByYear
    ) {
      if (
        !bestWinYear ||
        value >
          bestWinYear.value ||
        (
          value ===
            bestWinYear.value &&
          year <
            bestWinYear.year
        )
      ) {
        bestWinYear = {
          history:
            candidate.history,

          year,

          value,
        };
      }
    }
  }

  records.push({
    id:
      'most-wins-one-year',

    title:
      'MOST WINS IN ONE YEAR AT ELIO CHARTS AWARDS',

    description:
      'The most Elio Charts Awards wins received by an artist in a single year.',

    record:
      bestWinYear
        ? createArtistRecord(
            bestWinYear.history,
            bestWinYear.value,
            `${formatNumber(
              bestWinYear.value
            )} WINS — ${bestWinYear.year}`,
            `${bestWinYear.history.artist} won ${formatNumber(
              bestWinYear.value
            )} Elio Charts Awards in ${bestWinYear.year}.`
          )
        : null,
  });

  return records;
}

/*
 * =========================================================
 * PUBLIC FUNCTION
 * =========================================================
 */

export async function fetchRecordsData(): Promise<RecordsData> {
  const [
    entries,
    artistImages,
    awardStats,
  ] = await Promise.all([
    fetchAllHot100Entries(),
    fetchArtistImages(),
    fetchAwardStats(),
  ]);

  const songHistories =
    buildSongHistories(
      entries
    );

  const artistHistories =
    buildArtistHistories(
      entries,
      artistImages
    );

  return {
    songs:
      buildSongRecords(
        songHistories
      ),

    artistRecords: [
      ...buildArtistHot100Records(
        artistHistories
      ),
    ],
  };
}