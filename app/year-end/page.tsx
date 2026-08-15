import Papa from 'papaparse';

type YearEndEntry = {
  year: string;
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
};

const YEAR_END_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=66844035&single=true&output=csv';

function parseYearEndCsv(
  csvText: string
): YearEndEntry[] {
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows =
    parsed.data as string[][];

  return rows
    .map((row): YearEndEntry | null => {
      const year =
        row[0]?.trim() ?? '';

      const rank =
        Number(
          row[1]?.trim() ?? 0
        );

      const content =
        row[2]?.trim() ?? '';

      const artwork =
        row[3]?.trim() ?? '';

      if (
        !year ||
        rank <= 0 ||
        !content
      ) {
        return null;
      }

      const parts =
        content
          .split(/\r?\n/)
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

      return {
        year,
        rank,
        title:
          parts[0] ?? content,
        artist:
          parts[1] ?? '',
        artwork:
          artwork || undefined,
      };
    })
    .filter(
      (
        entry
      ): entry is YearEndEntry =>
        entry !== null
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    );
}

async function fetchYearEndData() {
  try {
    const response =
      await fetch(
        YEAR_END_CSV_URL,
        {
          next: {
            revalidate: 300,
          },
        }
      );

    if (!response.ok) {
      console.error(
        `Failed to fetch Year-End chart: HTTP ${response.status}`
      );

      return {
        years: [] as string[],
        entriesByYear:
          {} as Record<
            string,
            YearEndEntry[]
          >,
      };
    }

    const csvText =
      await response.text();

    if (!csvText.trim()) {
      console.error(
        'Google Sheets returned empty Year-End data'
      );

      return {
        years: [],
        entriesByYear: {},
      };
    }

    const entries =
      parseYearEndCsv(
        csvText
      );

    const entriesByYear:
      Record<
        string,
        YearEndEntry[]
      > = {};

    for (
      const entry of entries
    ) {
      if (
        !entriesByYear[
          entry.year
        ]
      ) {
        entriesByYear[
          entry.year
        ] = [];
      }

      entriesByYear[
        entry.year
      ].push(entry);
    }

    const years =
      Object.keys(
        entriesByYear
      ).sort(
        (a, b) =>
          Number(b) -
          Number(a)
      );

    return {
      years,
      entriesByYear,
    };
  } catch (error) {
    console.error(
      'Failed to fetch Year-End chart data:',
      error
    );

    return {
      years: [] as string[],
      entriesByYear:
        {} as Record<
          string,
          YearEndEntry[]
        >,
    };
  }
}

type YearEndPageProps = {
  searchParams: Promise<{
    year?: string;
  }>;
};

export default async function YearEndPage({
  searchParams,
}: YearEndPageProps) {
  const {
    years,
    entriesByYear,
  } =
    await fetchYearEndData();

  const params =
    await searchParams;

  const requestedYear =
    params.year;

  const selectedYear =
    requestedYear &&
    years.includes(
      requestedYear
    )
      ? requestedYear
      : years[0] ?? '';

  const entries =
    entriesByYear[
      selectedYear
    ] ?? [];

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-6 sm:py-12">

        {/* HEADER */}
        <header className="mb-10 text-center sm:mb-14">
          <h1 className="text-[4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            YEAR-END
          </h1>

          <p className="mt-3 text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50 sm:text-sm">
            PERSONAL CHARTS BY ELIO
          </p>
        </header>

        {/* YEAR DROPDOWN */}
        <div className="mb-10 flex justify-center">
          <form
            method="GET"
            className="flex items-center gap-3"
          >
            <label
              htmlFor="year"
              className="font-brown-bold text-sm uppercase tracking-[0.15em]"
            >
              Year
            </label>

            <select
              id="year"
              name="year"
              defaultValue={
                selectedYear
              }
              className="border border-black bg-white px-4 py-2 font-brown-regular text-sm uppercase outline-none"
            >
              {years.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="border border-black bg-black px-5 py-2 font-brown-bold text-sm uppercase tracking-[0.1em] text-white"
            >
              GO
            </button>
          </form>
        </div>

        {/* SELECTED YEAR */}
        {selectedYear && (
          <div className="mb-8 text-center">
            <h2 className="font-brown-bold text-3xl uppercase tracking-[-0.03em] sm:text-4xl">
              {selectedYear}
            </h2>
          </div>
        )}

        {/* YEAR-END CHART */}
        <section className="space-y-0">
          {entries.map(
            (entry) => (
              <article
                key={`${entry.year}-${entry.rank}-${entry.title}`}
                className="grid grid-cols-[3.5rem_5rem_1fr] items-center gap-3 border-b border-black/10 py-2 sm:grid-cols-[4rem_6rem_1fr] sm:gap-5"
              >

                {/* RANK */}
                <div className="flex aspect-square items-center justify-center bg-black">
                  <span className="font-brown-bold text-2xl text-white sm:text-3xl">
                    {entry.rank}
                  </span>
                </div>

                {/* ARTWORK */}
                <div className="aspect-square overflow-hidden bg-slate-100">
                  {entry.artwork ? (
                    <img
                      src={
                        entry.artwork
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>

                {/* SONG */}
                <div className="min-w-0">
                  <p className="font-brown-bold text-lg leading-tight text-black sm:text-xl">
                    {entry.title}
                  </p>

                  <p className="mt-1 font-brown-regular text-sm leading-tight text-blue-600 sm:text-base">
                    {entry.artist}
                  </p>
                </div>

              </article>
            )
          )}

          {/* EMPTY STATE */}
          {entries.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-brown-regular text-sm uppercase tracking-[0.2em] text-black/50">
                No Year-End chart data available.
              </p>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}