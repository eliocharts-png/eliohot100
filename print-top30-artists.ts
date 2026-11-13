
import { fetchWeeklyArtistData } from './lib/weeklyArtistData';

async function main() {
  const data = await fetchWeeklyArtistData();

  console.log('\n========================================');
  console.log('          ELIO ARTIST CHART');
  console.log('       TOP 50 ARTISTS THIS WEEK');
  console.log('========================================\n');

  if (data.entries.length === 0) {
    console.log('No artist data available.');
    return;
  }

  console.log(`WEEK: ${data.displayWeek}\n`);

  console.log(
    'RANK'.padEnd(8) +
    'ARTIST'.padEnd(35) +
    'POINTS'
  );

  console.log('-'.repeat(65));

  data.entries.slice(0, 50).forEach((entry) => {
    console.log(
      String(entry.rank).padEnd(8) +
      entry.artist.padEnd(35) +
      `${entry.points.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} pts`
    );
  });

  console.log('\n========================================');
}

main().catch((error) => {
  console.error('Failed to generate Artist Chart:', error);
  process.exitCode = 1;
});
