import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

import {
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1637;
const HEIGHT = 2048;

const LAYOUT = {
  firstLineY: 816,
  rowHeight: 122.3,

  titleX: 205,
  artistX: 960,
  lastWeekX: 1510,

  titleFontSize: 48,
  artistFontSize: 46,
  lastWeekFontSize: 46,

  textOffsetY: 12,

  weeksNo1X: 205,
  weeksNo1Y: 620,
  weeksNo1Height: 52,
  weeksNo1PaddingX: 24,
};

function bufferToArrayBuffer(
  buffer: Buffer
): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

function bufferToDataUri(
  buffer: Buffer,
  mimeType: string
): string {
  return `data:${mimeType};base64,${buffer.toString(
    'base64'
  )}`;
}

function getRowCenterY(
  rank: number
): number {
  return (
    LAYOUT.firstLineY +
    (rank - 1) * LAYOUT.rowHeight -
    LAYOUT.rowHeight / 2
  );
}

/*
 * Reduce the title font size for longer titles.
 *
 * The title itself is NEVER shortened or truncated.
 */
function getTitleFontSize(
  title: string
): number {
  const length = title.length;

  if (length <= 24) return 48;
  if (length <= 30) return 44;
  if (length <= 36) return 40;
  if (length <= 42) return 37;
  if (length <= 48) return 34;
  if (length <= 55) return 31;
  if (length <= 65) return 28;
  if (length <= 75) return 25;
  if (length <= 90) return 22;
  if (length <= 105) return 19;
  if (length <= 120) return 17;

  return 15;
}

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const selectedWeek =
      searchParams.get('week') || undefined;

    const weeklySource =
      sheetSources.find(
        (source) =>
          source.title === 'THE HOT 100'
      );

    if (!weeklySource) {
      return new Response(
        'Weekly chart source not found.',
        {
          status: 500,
        }
      );
    }

    const chart =
      await fetchWeeklyChartData(
        weeklySource.csvUrl,
        selectedWeek,
        weeklySource.title
      );

    const topTen =
      [...chart.entries]
        .sort(
          (a, b) =>
            a.rank - b.rank
        )
        .slice(0, 10);

    /*
     * Finished share-image template.
     *
     * This already contains:
     * - rank numbers
     * - LAST WEEK label
     * - ELIOCHARTS branding
     * - blue divider lines
     * - overall design
     */
    const templatePath =
      path.join(
        process.cwd(),
        'public',
        'share',
        'weekly-template.jpg'
      );

    const templateBuffer =
      fs.readFileSync(
        templatePath
      );

    const templateDataUri =
      bufferToDataUri(
        templateBuffer,
        'image/jpeg'
      );

    /*
     * Load the two actual Gotham files.
     *
     * GothamBlack is used ONLY for:
     * - song titles
     * - Weeks At No. 1
     *
     * GothamRegular is used ONLY for:
     * - artist names
     * - Last Week ranks
     */
    const gothamBlackPath =
      path.join(
        process.cwd(),
        'fonts',
        'Gotham Black.otf'
      );

    const gothamRegularPath =
      path.join(
        process.cwd(),
        'fonts',
        'Gotham Regular.otf'
      );

    const gothamBlack =
      fs.readFileSync(
        gothamBlackPath
      );

    const gothamRegular =
      fs.readFileSync(
        gothamRegularPath
      );

    const numberOne =
      topTen.find(
        (entry) =>
          entry.rank === 1
      );

    const weeksAtNumberOne =
      chart.weeksAtNumberOne ?? 0;

    return new ImageResponse(
      (
        <div
          style={{
            width: `${WIDTH}px`,
            height: `${HEIGHT}px`,
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            background: '#000000',
          }}
        >
          {/* TEMPLATE */}
          <img
            src={templateDataUri}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: WIDTH,
              height: HEIGHT,
            }}
          />

          {/* TOP 10 */}
          {topTen.map(
            (entry) => {
              const rank =
                entry.rank;

              /*
               * NEVER truncate the song title.
               */
              const title =
                String(
                  entry.title || ''
                ).toUpperCase();

              const artist =
                String(
                  entry.artist || ''
                );

              const lastWeek =
                entry.lastWeekRank ??
                '—';

              const titleFontSize =
                getTitleFontSize(
                  title
                );

              const centerY =
                getRowCenterY(rank) +
                LAYOUT.textOffsetY;

              return (
                <div
                  key={`${rank}-${entry.title}-${entry.artist}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                  }}
                >
                  {/* SONG TITLE — GOTHAM BLACK */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${LAYOUT.titleX}px`,
                      top: `${centerY - 27}px`,
                      width: '730px',
                      height: '54px',

                      display: 'flex',
                      alignItems: 'center',

                      overflow: 'visible',
                      whiteSpace: 'nowrap',

                      fontFamily:
                        'GothamBlack',

                      fontSize: `${titleFontSize}px`,
                      lineHeight: 1,
                      letterSpacing:
                        '-0.02em',

                      color: '#ffffff',
                    }}
                  >
                    {title}
                  </div>

                  {/* ARTIST — GOTHAM REGULAR */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${LAYOUT.artistX}px`,
                      top: `${centerY - 26}px`,
                      width: '472px',
                      height: '52px',

                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',

                      overflow: 'hidden',
                      whiteSpace: 'nowrap',

                      fontFamily:
                        'GothamRegular',

                      fontSize: `${LAYOUT.artistFontSize}px`,
                      lineHeight: 1,
                      letterSpacing:
                        '-0.015em',

                      color: '#ffffff',
                    }}
                  >
                    {artist}
                  </div>

                  {/* LAST WEEK — GOTHAM REGULAR */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${LAYOUT.lastWeekX}px`,
                      top: `${centerY - 26}px`,
                      width: '70px',
                      height: '52px',

                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',

                      fontFamily:
                        'GothamRegular',

                      fontSize: `${LAYOUT.lastWeekFontSize}px`,
                      lineHeight: 1,

                      color: '#296af7',
                    }}
                  >
                    {lastWeek}
                  </div>
                </div>
              );
            }
          )}

          {/* WEEKS AT NO. 1 — GOTHAM BLACK */}
          {numberOne && (
            <div
              style={{
                position: 'absolute',
                left: `${LAYOUT.weeksNo1X}px`,
                top: `${LAYOUT.weeksNo1Y}px`,
                height: `${LAYOUT.weeksNo1Height}px`,

                display: 'flex',
                alignItems: 'center',

                paddingLeft:
                  `${LAYOUT.weeksNo1PaddingX}px`,
                paddingRight:
                  `${LAYOUT.weeksNo1PaddingX}px`,

                borderRadius: '999px',
                background: '#296af7',

                fontFamily:
                  'GothamBlack',

                fontSize: '34px',
                lineHeight: 1,
                letterSpacing:
                  '-0.01em',

                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}
            >
              {weeksAtNumberOne}{' '}
              {weeksAtNumberOne === 1
                ? 'WEEK'
                : 'WEEKS'}{' '}
              AT NO. 1
            </div>
          )}
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,

        fonts: [
          {
            name: 'GothamBlack',
            data:
              bufferToArrayBuffer(
                gothamBlack
              ),
            style: 'normal',
          },
          {
            name: 'GothamRegular',
            data:
              bufferToArrayBuffer(
                gothamRegular
              ),
            style: 'normal',
          },
        ],

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      'Weekly share image generation failed:',
      error
    );

    return new Response(
      error instanceof Error
        ? `Weekly share image generation failed: ${error.message}`
        : `Weekly share image generation failed: ${String(error)}`,
      {
        status: 500,
        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      }
    );
  }
}