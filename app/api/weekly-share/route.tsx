import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

import {
  fetchWeeklyChartData,
  sheetSources,
  formatDateLabel,
} from '@/lib/chartData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1637;
const HEIGHT = 2048;

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

function shortenText(
  value: string,
  maxLength: number
): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function getRowLineY(
  rank: number
): number {
  /*
   * These coordinates follow the blue divider
   * lines in the supplied 1637 × 2048 template.
   */
  const firstLine = 816;
  const rowHeight = 122.3;

  return Math.round(
    firstLine + (rank - 1) * rowHeight
  );
}

function getRowTextY(
  rank: number
): number {
  /*
   * The text sits above each divider line,
   * matching the layout of the template.
   */
  return getRowLineY(rank) - 82;
}

function getRowArtistY(
  rank: number
): number {
  return getRowLineY(rank) - 43;
}

function getRowCenterY(
  rank: number
): number {
  return getRowLineY(rank) - 61;
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
     * =========================================
     * LOAD TEMPLATE
     * =========================================
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
     * =========================================
     * LOAD GOTHAM FONTS
     * =========================================
     */

    const gothamBoldPath =
      path.join(
        process.cwd(),
        'fonts',
        'Gotham Bold.otf'
      );

    const gothamMediumPath =
      path.join(
        process.cwd(),
        'fonts',
        'Gotham Medium.otf'
      );

    const gothamBold =
      fs.readFileSync(
        gothamBoldPath
      );

    const gothamMedium =
      fs.readFileSync(
        gothamMediumPath
      );

    /*
     * =========================================
     * DATE
     * =========================================
     */

    const chartDate =
      formatDateLabel(
        chart.week
      ).toUpperCase();

    /*
     * =========================================
     * IMAGE
     * =========================================
     */

    return new ImageResponse(
      (
        <div
          style={{
            width: `${WIDTH}px`,
            height: `${HEIGHT}px`,
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            background: '#000',
          }}
        >

          {/* =================================
              ORIGINAL TEMPLATE
          ================================= */}

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

          {/* =================================
              CHART DATE
          ================================= */}

          <div
            style={{
              position: 'absolute',
              left: '108px',
              top: '622px',
              display: 'flex',
              fontFamily:
                'Gotham Medium',
              fontSize: '27px',
              lineHeight: 1,
              letterSpacing:
                '0.08em',
              color: '#ffffff',
              textTransform:
                'uppercase',
            }}
          >
            {chartDate}
          </div>

          {/* =================================
              WEEKS AT NO. 1
          ================================= */}

          <div
            style={{
              position: 'absolute',
              right: '108px',
              top: '622px',
              display: 'flex',
              fontFamily:
                'Gotham Medium',
              fontSize: '27px',
              lineHeight: 1,
              letterSpacing:
                '0.08em',
              color: '#ffffff',
              textTransform:
                'uppercase',
            }}
          >
            {chart.weeksAtNumberOne}{' '}
            {chart.weeksAtNumberOne === 1
              ? 'WEEK'
              : 'WEEKS'}{' '}
            AT NO. 1
          </div>

          {/* =================================
              TOP 10
          ================================= */}

          {topTen.map(
            (entry) => {
              const rank =
                entry.rank;

              const title =
                shortenText(
                  entry.title,
                  48
                );

              const artist =
                shortenText(
                  entry.artist,
                  48
                );

              const lastWeek =
                entry.lastWeekRank ??
                '—';

              return (
                <div
                  key={`${rank}-${entry.title}-${entry.artist}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: WIDTH,
                    height: HEIGHT,
                    display: 'flex',
                  }}
                >

                  {/* =================================
                      SONG TITLE
                  ================================= */}

                  <div
                    style={{
                      position: 'absolute',
                      left: '205px',
                      top: `${getRowTextY(
                        rank
                      )}px`,
                      width: '1150px',
                      height: '42px',
                      display: 'flex',
                      alignItems:
                        'center',
                      overflow: 'hidden',
                      whiteSpace:
                        'nowrap',
                      fontFamily:
                        'Gotham Bold',
                      fontSize: '32px',
                      lineHeight: 1,
                      letterSpacing:
                        '-0.015em',
                      color: '#ffffff',
                    }}
                  >
                    {title}
                  </div>

                  {/* =================================
                      ARTIST
                  ================================= */}

                  <div
                    style={{
                      position: 'absolute',
                      left: '205px',
                      top: `${getRowArtistY(
                        rank
                      )}px`,
                      width: '1150px',
                      height: '32px',
                      display: 'flex',
                      alignItems:
                        'center',
                      overflow: 'hidden',
                      whiteSpace:
                        'nowrap',
                      fontFamily:
                        'Gotham Medium',
                      fontSize: '22px',
                      lineHeight: 1,
                      letterSpacing:
                        '0.01em',
                      color: '#ffffff',
                    }}
                  >
                    {artist}
                  </div>

                  {/* =================================
                      LAST WEEK POSITION
                  ================================= */}

                  <div
                    style={{
                      position: 'absolute',
                      left: '1475px',
                      top: `${getRowCenterY(
                        rank
                      ) - 20}px`,
                      width: '80px',
                      height: '40px',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      fontFamily:
                        'Gotham Medium',
                      fontSize: '30px',
                      lineHeight: 1,
                      color: '#ffffff',
                    }}
                  >
                    {lastWeek}
                  </div>

                </div>
              );
            }
          )}

        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,

        fonts: [
          {
            name: 'Gotham Bold',
            data:
              bufferToArrayBuffer(
                gothamBold
              ),
            weight: 700,
            style: 'normal',
          },
          {
            name: 'Gotham Medium',
            data:
              bufferToArrayBuffer(
                gothamMedium
              ),
            weight: 500,
            style: 'normal',
          },
        ],
      }
    );

  } catch (error) {
    console.error(
      'Weekly share image generation failed:',
      error
    );

    return new Response(
      'Unable to generate weekly share image.',
      {
        status: 500,
      }
    );
  }
}