'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const HOT_100_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

const ARTIST_IMAGES_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

const CUTOFF = new Date(2025, 9, 1);

const categories = [
  { id: 'album', title: 'ALBUM OF THE YEAR', type: 'album' },
  { id: 'artist', title: 'ARTIST OF THE YEAR', type: 'artist' },
  { id: 'record', title: 'RECORD OF THE YEAR', type: 'song' },
  { id: 'song', title: 'SONG OF THE YEAR', type: 'song' },
  { id: 'collaboration', title: 'COLLABORATION OF THE YEAR', type: 'song' },
  { id: 'new-artist', title: 'BEST NEW ARTIST', type: 'artist' },
] as const;

type CategoryId = (typeof categories)[number]['id'];

type Candidate = {
  id: string;
  title: string;
  subtitle?: string;
};

type OddsContender = {
  nominee: string;
  points: number;
  appearances: number;
  firstPlaceVotes: number;
  odds: number;
  change?: number | null;
};

type CategoryOdds = {
  nominees: OddsContender[];
  submissionCount: number;
};

type WinnerContender = {
  nominee: string;
  votes: number;
};

type WinnerCategory = {
  nominees: WinnerContender[];
  highestVotes: number;
};

type ApiResult = {
  success?: boolean;
  error?: string;
  submissionId?: string;
  categories?: Record<string, CategoryOdds>;
  winnerCategories?: Record<string, WinnerCategory>;
};

const albums: Candidate[] = [
  ['A*POP', 'Tyla'],
  ['Andalucia', 'IV OF SPADES'],
  ['ARIRANG', 'BTS'],
  ['Confessions II', 'Madonna'],
  ['Daughter from Hell', 'Gracie Abrams'],
  ['Day and Night', 'Carly Rae Jepsen'],
  ['Deadbeat', 'Tame Impala'],
  ['Five Seconds Flat', 'Lizzy McAlpine'],
  ["FLORIDA'S FINEST", 'SAILORR'],
  ['HABIBTI', 'Drake'],
  ['I Barely Know Her', 'sombr'],
  ['ICEMAN', 'Drake'],
  ['Kiss All the Time. Disco, Occasionally', 'Harry Styles'],
  ["kung tayo'y nasa isang horror na pelikula, tiyak ako ang una mong papatayin", 'fitterkarma'],
  ['LUX', 'Rosalia'],
  ['MAID OF HONOR', 'Drake'],
  ['Music, Fashion, Film', 'Charli xcx'],
  ['Petal', 'Ariana Grande'],
  ['Popstar', 'Tinashe'],
  ['PRIMA', 'ADÉLA'],
  ['The Art of Loving', 'Olivia Dean'],
  ['The Great Divide', 'Noah Kahan'],
  ['The Life of a Showgirl', 'Taylor Swift'],
  ['The Romantic', 'Bruno Mars'],
  ['Vie', 'Doja Cat'],
  ['Visitor', 'Sienna Spirro'],
  ['you seem pretty sad for a girl so in love', 'Olivia Rodrigo'],
].map(([title, subtitle], index) => ({
  id: `album-${index}`,
  title,
  subtitle,
}));

const songData = `
12 to 12  sombr
2.0 BTS
2007  Charli XCX
24 Hours  Stormzy & Odeal
A Couple Minutes  Olivia Dean
Acts of Service Doja Cat
Ain't In LA ADÉLA
Alabang RAPROJECT SIX
Alam Ko Na  DENŸ Featuring Just Hush & Third Floor'
Aliens  BTS
Alipin  Khel Pangilinan
Alive Jorja Smith Featuring Wizkid
All Out of Love Air Supply
All These Ladies  BGYO
American Girls  Harry Styles
Angel Wings Madison Beer
Animal  KATSEYE
Another Drink Marshmello & Kelsea Ballerini
Aperture  Harry Styles
Apollo Eighteen Khamari
Aswang sa Maynila fitterkarma
Ayoko Maging Kaibigan kiddotin
Baby 123  RAPROJECT SIX Featuring MADAM SAUCE
Baby It's You JoJo
Baby Steps  Olivia Dean
Babydoll  Dominic Fike
Babylon Taylor Swift
Bad Wale Featuring Tiara Thomas Or Rihanna
Bad Thing (Bunny Hop) Ariana Grande
Baile Inolvidable Bad Bunny
Bampira fitterkarma
BbY WOW KAROL G Featuring Judeline & rusowsky
Beauty And A Beat Justin Bieber Featuring Nicki Minaj
Begged  Olivia Rodrigo
BELLY SAILORR
Big Daddy Tems
Big Feelings  Ariana Grande
Big Girls Don't Cry (Personal)  Fergie
Binhi Arthur Nery
BITCHES BREW  SAILORR
Blessings Calvin Harris & Clementine Douglas
Body  Dayoung
Body to Body  BTS
Bottle  Remi Wolf
Boys  ADÉLA
Brand New Chanel$ Slayyyter
Bring Your Love Madonna & Sabrina Carpenter
Burn  Usher
Butterflies Brent Faiyaz
Camera  Charli XCX
Camera  Ed Sheeran
Cater 2 U Destiny's Child
ceilings  Lizzy McAlpine
Cha Cha Cha Bruno Mars
Champagne Supernova Oasis
Chanel  Tyla
Changes Denise Julia
Cheetah's Print Drake Featuring Sexyy Red
Chicken Tenders Dominic Fike
Choosin' Texas  Ella Langley
Cigarette Smoke Olivia Rodrigo
Cinderella  Mac Miller Featuring Ty Dolla $ign
Classic Drake
Cleveland!  Taylor Swift
Closer  Ne-Yo
Co-Pilot  Just Hush
Coconut SAILORR & Eim Triplin
Come Over BTS
Complexity  Madison Beer
Crank Slayyyter
Crash Out Tinashe
Crush David Archuleta
Cry Ugly  FLO
CUT UP  SAILORR
Dab (Interlude) HELLMERRY
Dai Dai Shakira & Burna Boy
Delete Ya Djo
Die On This Hill  Sienna Spiro
Dito Sa'kin Earl Agustin
Dive  Olivia Dean
Divinize  ROSALÍA
Dominga La Mave & Nateman
Don't Break Her Heart FLO
DONE SHAVING 4 U  SAILORR
Doors Noah Kahan
DOWN BAD  SAILORR
Dracula Tame Impala & JENNIE
Drag Path Twenty One Pilots
Drifstar  Flow G
Drop Dead Olivia Rodrigo
DtMF  Bad Bunny
Duvet SAILORR
E85 Don Toliver
Earrings  Malcolm Todd
Echo  Olivia Dean
Ela Ké Cavucadinha  Gordinho Bolado & CACAU CHUU
Elizabeth Taylor  Taylor Swift
eternal sunshine  Ariana Grande
Expectations  Olivia Rodrigo
Eyes Can't Lie  RAPROJECT SIX
Eyes Closed Jisoo & Zayn
Fame Is A Gun Addison Rae
Fantasize ADÉLA
Father Figure Taylor Swift
Feel Your Rain  Eli
Fortworth Drake & PARTYNEXTDOOR
Freak Ariana Grande
FYA BTS
Gameboy Katseye
Gangsta Baby  HELLMERRY Featuring Baby G
Get Dat Al James
Girl, Get Up  Doechii & SZA
Good Girls  LOUIS of LNGSHOT
Gorgeous  Doja Cat
Great Expectation Sienna Spiro
GRRL'S GRRL SAILORR
Gusto Ko Sakin Ka Lang  Robledo Timido
Gusto With Ya DENŸ
Halik Sobrang Diin, Pt. 2 Gat Putch Featuring Louie Grammz & Mi'Kel
Harmony ROLE MODEL
Hate That I Made You Love Me  Ariana Grande
Have You Ever Brandy
High Fives  Drake
Hit The Wall  Gracie Abrams
Homewrecker sombr
Honeybee  Olivia Rodrigo
Hooligan  BTS
Hootie Frutti KATSEYE
House Tour  Sabrina Carpenter
Hulog KAIA
I Bet Ciara
I Do (Cherish You)  98
I Just Might  Bruno Mars
I Knew It, I Knew You Taylor Swift
I Saw Your Face Malcolm Todd
I Thought I Saw Your Face Today She & Him
I Wanna Fuck You  Snoop Dogg Featuring Akon
I Wanna Know  Joe
I Want It That Way  Backstreet Boys
I'd Rather Be Alone Tinashe
I'll Be Over You  ToTo
I'll Do It  Heidi Montag
I'm The Man ADÉLA
I've Been Waiting For You Las Triplets
Iconic By Mistake KATSEYE, LE SSERAFIM, ILLIT
If You're Not The One Daniel Bedingfield
iloveitiloveitiloveit Bella Kay
Indak Up Dharma Down
Internet Girl Katseye
Into the Sun  BTS
Is It Cool? Steve Lacy Featuring SZA
Isa Lang  Arthur Nery
Isang Pag-Ibig  IV Of Spades
ITADAKIMASU SAILORR
Janice STFU Drake
Kabisado  IV Of Spades
KAGM  Ron David & Robledo Timido
kahel na langit Maki
Kalapastangan fitterkarma
KGB ADÉLA
Kiss Me Ariana Grande
Kiss Me Thru The Phone  Soulja Boy Tell 'em Featuring Sammie
Konsensya IV Of Spades
La Perla  ROSALÍA & Yahritza y Su Esencia
Labyrinth Taylor Swift
Lasik Hey June!
Lay It Down Lloyd
Leak It FLO
Left Right  XG
Less  Olivia Rodrigo
Less Than a Lover JENNIE
Let Alone The One You Love  Olivia Dean
Libu-Libong Buwan (Uuwian)  Kyle Raphael
Like Animals  BTS
Like I Do Ariana Grande
Lips of an Angel  Hinder
Locked In SAILORR
Look at My Life Gracie Abrams
Loser Tame Impala
Lost Boys Phoebe Bridgers
Love Don't Change Jeremih
Love Me For What I Am The Carpenters
Love Will Keep Us Alive Eagles
Lovefield underscores
Maggots For Brains  Olivia Rodrigo
Mahal Magmahal  Esremborak
Maikee's Letters  Just Hush
Making Love Out of Nothing at All Air Supply
Man I Need  Olivia Dean
Marijuana ADÉLA
maryclaire  fitterkarma
Maui Wowie  Kid Cudi
Melatonin Tinashe
Merry Go Round  BTS
Mesmerize Ja Rule & Ashanti
Midnight Sun  Zara Larsson
Moment of Your Life Brent Faiyaz Featuring Coco Jones
Money Is Everything Addison Rae
Moolah  SCOOP DOGG & Daarth
Morning Dew (Donk)  Beyoncé
Motivation  Carly Rae Jepsen
My Body Isn't Ready sombr
My Way  Olivia Rodrigo
MYSB (Miss You so Bad)  Kira & O.C. Dawgs
Mystical Magical  Benson Boone
Na Para Bang  Mariah Deborah
Naiilang  Le John
Nanaman IV OF SPADES
Need Ya Realest Cram Featuring Young Blood Neet
Never Get Over Me Ariana Grande
Nice To Each Other  Olivia Dean
Nicole Kidman ADÉLA
No. 29  BTS
Nobody's Son  Sabrina Carpenter
Normal  BTS
Nowhere, Nobody Ariana Grande
Nuevayol  Bad Bunny
Oh Well Ariana Grande
Oh Yeah?  Steve Lacy
Okayyy  Latto Featuring Doja Cat
Omen  Disclosure Featuring Sam Smith
On My Love  Zara Larsson & David Guetta
On Wires  Carly Rae Jepsen
One More Night  BTS
Only A Dreamer  Pages
Oohh Lala Baby  Baby Dolls
Opalite Taylor Swift
Paano Ka Ba?  Hev Abi
Pag-Ibig ay Kanibalismo II  fitterkarma
Pahina  Cup of Joe
Pakisabi  SunKissed Lola
Palaisipan  Loonie & Arthur Nery
Pambihira fitterkarma
Panaginip Nicole
Patient Zero  Taylor Swift
Petal Ariana Grande
Pillow Fight  Tinashe
Pink Clouding Taylor Swift
Pinky Up  Katseye
Please  BTS
POOKIE'S REQUIEM  SAILORR
Pop Dat Thang DaBaby
Purple  Olivia Rodrigo
Pwede Ka Ba?  Frank Ely
Raindance Dave & Tems
Ran To Atlanta  Drake Featuring Future & Molly Santana
Reason To Stay  Olivia Dean
Red Bottoms ADÉLA
Rein Me In  Sam Fender & Olivia Dean
Rent Free SAILORR
Repeat It Martin Garrix & Ed Sheeran
Restart Sam Smith
Revolving Door  Tate McRae
Richest Muni Long
Right Back! KARLEE GIRL
Right Now (Na Na Na)  Akon
Risk It All Bruno Mars
Road Trips  Drake
Rock Music  Charli XCX
Rosas Yuridope & Skusta Clee
Ruin The Friendship Taylor Swift
Run Your Mouth  The Marias
Sabik DENŸ Featuring Arthur Nery
Sapphire  Ed Sheeran
Sariling Multo  IV OF SPADES
Saturday Night  Ravyn Lenae
SaWaDiKa  LISA
Self Aware  Temper City
Serena Joy  Olivia Rodrigo
Shabang Drake
She Did It Again  Tyla Featuring Zara Larsson
She's The Best  Troye Sivan
Shinobi Just Hush
Shuloks RAPROJECT SIX
Shut It Down  Drake Featuring The Dream
Sienna  The Marias
Silver Jubilee  Audrey Hobert
Since Day One Skusta Clee & Flow G
SINCERITY SAILORR
Slap City Drake Featuring Qendresa
So Easy (To Fall In Love) Olivia Dean
So Good Jhené Aiko Featuring Kendrick Lamar
Soda Pop  Saja Boys
SOFT GIRL SUMMER  SAILORR
Somebody  Latto
Something Has to Change The Japanese House
Spend Dat Yung Miami
Spend It  Summer Walker
Stateside PinkPantheress & Zara Larsson
Stay  Ariana Grande
Stay Here 4 Life  A$AP Rocky Featuring Brent Faiyaz
Staying Lizzy McAlpine
Still KAROL G Featuring Bruno Mars
Stop The Wedding! Ashe
Stranger  Doja Cat
Stupid Song Olivia Rodrigo
Suddenly  I.O.I
Sue Me  Audrey Hobert
Sugar On My Tongue  Tyler The Creator
Summer Crush  HELLMERRY
Sweet Boy Malcolm Todd
Swim  BTS
Tahanan El Manu
The Cure  Olivia Rodrigo
The Dress Dijon
The Fate of Ophelia Taylor Swift
The Great Divide  Noah Kahan
The Hardest Part  Olivia Dean
The One That You Love Air Supply
The Peace underscores
The Time of My Life Benson Boone
they don't know 'bout us  BTS
Thinking of You Katy Perry
Tiramisu  Don Toliver
Tit For Tat Tate McRae
TMA groundZERO Records, Tyler, Primera, ODP
U + Me = <3 Olivia Rodrigo
Ugly Things Lizzy McAlpine
UR MOTHER'S SON SAILORR
Vibrate La Mave
Virtuoso  Ryan Beatty
W1LL U L13? SAILORR
WANTCHU keshi
Warning Signs (Interlude) Ariana Grande
Watching Us Wale & Leon Thomas
We Ride Rihanna
Weightless  Arlo Parks
What It Sounds Like HUNTR/X
What You Need Tems
What's Wrong With Me  Olivia Rodrigo & Robert Smith
When Did You Get Hot? Sabrina Carpenter
When He's Not There   Kehlani Featuring Lucky Daye
When I'm With You LISA Featuring Tyla
When Love and Hate Collide  Def Leppard
Where Is My Husband!  RAYE
Whisper Drake
White Keys  Dominic Fike
Who Knows Daniel Caesar
Wi$h Li$t Taylor Swift
Wink Wink Charli XCX
Wonderwall  Oasis
Wood  Taylor Swift
You Got It All  The Jets
`.trim();

const songs: Candidate[] = songData
  .split('\n')
  .map((line, index) => {
    const match = line.trim().match(/^(.+?)\s{2,}(.+)$/);
    if (!match) return null;

    return {
      id: `song-${index}`,
      title: match[1].trim(),
      subtitle: match[2].trim(),
    };
  })
  .filter((song): song is { id: string; title: string; subtitle: string } => Boolean(song?.title && song.subtitle));

function candidateLabel(candidate: Candidate) {
  return candidate.subtitle
    ? `${candidate.title} — ${candidate.subtitle}`
    : candidate.title;
}

function normalizeArtist(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizeNominee(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\r\n?|\n/g, ' — ')
    .replace(/[–—]/g, '—')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function normalizeImageKey(value: string) {
  return normalizeNominee(value);
}

function splitNominee(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return { title: lines[0], artist: lines.slice(1).join(' ') };
  }

  const normalized = value.trim();
  const separator = normalized.indexOf(' — ');

  if (separator === -1) return { title: normalized, artist: '' };

  return {
    title: normalized.slice(0, separator).trim(),
    artist: normalized.slice(separator + 3).trim(),
  };
}

function splitArtists(credit: string): string[] {
  const protectedNames = ['She & Him'];
  let value = credit;

  protectedNames.forEach((name, index) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    value = value.replace(new RegExp(escaped, 'gi'), `ARTISTPROTECTED${index}`);
  });

  value = value
    .replace(/\b(featuring|feat\.?|ft\.?)\b/gi, '|')
    .replace(/\bwith\b/gi, '|')
    .replace(/\s+[&+]\s+/g, '|')
    .replace(/,\s*/g, '|');

  return value
    .split('|')
    .map((artist) => artist.trim())
    .filter(Boolean)
    .map((artist) => {
      let restored = artist;

      protectedNames.forEach((name, index) => {
        restored = restored.replace(`ARTISTPROTECTED${index}`, name);
      });

      return restored;
    });
}

const artistOfTheYearCandidates: Candidate[] = [
  { id: "artist-year-0", title: "Addison Rae" },
  { id: "artist-year-1", title: "ADÉLA" },
  { id: "artist-year-2", title: "Air Supply" },
  { id: "artist-year-3", title: "Akon" },
  { id: "artist-year-4", title: "Al James" },
  { id: "artist-year-5", title: "Ariana Grande" },
  { id: "artist-year-6", title: "Arthur Nery" },
  { id: "artist-year-7", title: "Audrey Hobert" },
  { id: "artist-year-8", title: "Baby Dolls" },
  { id: "artist-year-9", title: "Baby G" },
  { id: "artist-year-10", title: "Backstreet Boys" },
  { id: "artist-year-11", title: "Bad Bunny" },
  { id: "artist-year-12", title: "Bella Kay" },
  { id: "artist-year-13", title: "Benson Boone" },
  { id: "artist-year-14", title: "Beyoncé" },
  { id: "artist-year-15", title: "BGYO" },
  { id: "artist-year-16", title: "Billie Eilish" },
  { id: "artist-year-17", title: "Brent Faiyaz" },
  { id: "artist-year-18", title: "Bruno Mars" },
  { id: "artist-year-19", title: "Bryson Tiller" },
  { id: "artist-year-20", title: "BTS" },
  { id: "artist-year-21", title: "CACAU CHUU" },
  { id: "artist-year-22", title: "Calvin Harris" },
  { id: "artist-year-23", title: "Carly Rae Jepsen" },
  { id: "artist-year-24", title: "Chappell Roan" },
  { id: "artist-year-25", title: "Charli XCX" },
  { id: "artist-year-26", title: "Chris Brown" },
  { id: "artist-year-27", title: "CK YG" },
  { id: "artist-year-28", title: "Clementine Douglas" },
  { id: "artist-year-29", title: "Coco Jones" },
  { id: "artist-year-30", title: "Cup of Joe" },
  { id: "artist-year-31", title: "Daarth" },
  { id: "artist-year-32", title: "DaBaby" },
  { id: "artist-year-33", title: "Daniel Caesar" },
  { id: "artist-year-34", title: "Dave" },
  { id: "artist-year-35", title: "December Avenue" },
  { id: "artist-year-36", title: "Def Leppard" },
  { id: "artist-year-37", title: "DENŸ" },
  { id: "artist-year-38", title: "Destiny's Child" },
  { id: "artist-year-39", title: "Dijon" },
  { id: "artist-year-40", title: "Disclosure" },
  { id: "artist-year-41", title: "Djo" },
  { id: "artist-year-42", title: "Doja Cat" },
  { id: "artist-year-43", title: "Dominic Fike" },
  { id: "artist-year-44", title: "Don Toliver" },
  { id: "artist-year-45", title: "Drake" },
  { id: "artist-year-46", title: "Eagles" },
  { id: "artist-year-47", title: "Ed Sheeran" },
  { id: "artist-year-48", title: "El Manu" },
  { id: "artist-year-49", title: "Ella Langley" },
  { id: "artist-year-50", title: "Esremborak" },
  { id: "artist-year-51", title: "fitterkarma" },
  { id: "artist-year-52", title: "FLO" },
  { id: "artist-year-53", title: "Flow G" },
  { id: "artist-year-54", title: "Future" },
  { id: "artist-year-55", title: "Gat Putch" },
  { id: "artist-year-56", title: "Gordinho Bolado" },
  { id: "artist-year-57", title: "Gracie Abrams" },
  { id: "artist-year-58", title: "Harry Styles" },
  { id: "artist-year-59", title: "Heidi Montag" },
  { id: "artist-year-60", title: "HELLMERRY" },
  { id: "artist-year-61", title: "Hinder" },
  { id: "artist-year-62", title: "HUNTR/X" },
  { id: "artist-year-63", title: "ILLIT" },
  { id: "artist-year-64", title: "IV Of Spades" },
  { id: "artist-year-65", title: "JENNIE" },
  { id: "artist-year-66", title: "Jeremih" },
  { id: "artist-year-67", title: "Joe" },
  { id: "artist-year-68", title: "JoJo" },
  { id: "artist-year-69", title: "Judeline" },
  { id: "artist-year-70", title: "Just Hush" },
  { id: "artist-year-71", title: "Justin Bieber" },
  { id: "artist-year-72", title: "KAIA" },
  { id: "artist-year-73", title: "KAROL G" },
  { id: "artist-year-74", title: "KATSEYE" },
  { id: "artist-year-75", title: "Katy Perry" },
  { id: "artist-year-76", title: "Kehlani" },
  { id: "artist-year-77", title: "Kid Cudi" },
  { id: "artist-year-78", title: "Kira" },
  { id: "artist-year-79", title: "Kyle Raphael" },
  { id: "artist-year-80", title: "La Mave" },
  { id: "artist-year-81", title: "Las Triplets" },
  { id: "artist-year-82", title: "Latto" },
  { id: "artist-year-83", title: "Le John" },
  { id: "artist-year-84", title: "LE SSERAFIM" },
  { id: "artist-year-85", title: "LISA" },
  { id: "artist-year-86", title: "Lizzy McAlpine" },
  { id: "artist-year-87", title: "Loonie" },
  { id: "artist-year-88", title: "Louie Grammz" },
  { id: "artist-year-89", title: "Lucky" },
  { id: "artist-year-90", title: "Mac Miller" },
  { id: "artist-year-91", title: "Madonna" },
  { id: "artist-year-92", title: "Malcolm Todd" },
  { id: "artist-year-93", title: "Mariah Carey" },
  { id: "artist-year-94", title: "Martin Garrix" },
  { id: "artist-year-95", title: "Mi'Kel" },
  { id: "artist-year-96", title: "Molly Santana" },
  { id: "artist-year-97", title: "Nateman" },
  { id: "artist-year-98", title: "Nicki Minaj" },
  { id: "artist-year-99", title: "Nicole" },
  { id: "artist-year-100", title: "Noah Kahan" },
  { id: "artist-year-101", title: "O.C. Dawgs" },
  { id: "artist-year-102", title: "Oasis" },
  { id: "artist-year-103", title: "Odeal" },
  { id: "artist-year-104", title: "Olivia Dean" },
  { id: "artist-year-105", title: "Olivia Rodrigo" },
  { id: "artist-year-106", title: "PinkPantheress" },
  { id: "artist-year-107", title: "Post Malone" },
  { id: "artist-year-108", title: "RAPROJECT SIX" },
  { id: "artist-year-109", title: "Ravyn Lenae" },
  { id: "artist-year-110", title: "RAYE" },
  { id: "artist-year-111", title: "Realest Carm" },
  { id: "artist-year-112", title: "Rihanna" },
  { id: "artist-year-113", title: "Robledo Timido" },
  { id: "artist-year-114", title: "Ron David" },
  { id: "artist-year-115", title: "ROSALÍA" },
  { id: "artist-year-116", title: "rusowsky" },
  { id: "artist-year-117", title: "Ryan Beatty" },
  { id: "artist-year-118", title: "Ryouji" },
  { id: "artist-year-119", title: "Sabrina Carpenter" },
  { id: "artist-year-120", title: "SAILORR" },
  { id: "artist-year-121", title: "Sam Fender" },
  { id: "artist-year-122", title: "Sam Smith" },
  { id: "artist-year-123", title: "Sammie" },
  { id: "artist-year-124", title: "SCOOP DOGG" },
  { id: "artist-year-125", title: "Sienna Spiro" },
  { id: "artist-year-126", title: "Skusta Clee" },
  { id: "artist-year-127", title: "Slayyyter" },
  { id: "artist-year-128", title: "Snoop Dogg" },
  { id: "artist-year-129", title: "Soapdish" },
  { id: "artist-year-130", title: "sombr" },
  { id: "artist-year-131", title: "Soulja Boy Tell 'em" },
  { id: "artist-year-132", title: "Steve Lacy" },
  { id: "artist-year-133", title: "Stormzy" },
  { id: "artist-year-134", title: "Summer Walker" },
  { id: "artist-year-135", title: "Tame Impala" },
  { id: "artist-year-136", title: "Tamia" },
  { id: "artist-year-137", title: "Tate McRae" },
  { id: "artist-year-138", title: "Taylor Swift" },
  { id: "artist-year-139", title: "Temper City" },
  { id: "artist-year-140", title: "Tems" },
  { id: "artist-year-141", title: "The Dream" },
  { id: "artist-year-142", title: "The Jets" },
  { id: "artist-year-143", title: "The Marias" },
  { id: "artist-year-144", title: "Tiara Thomas" },
  { id: "artist-year-145", title: "Tinashe" },
  { id: "artist-year-146", title: "Toto" },
  { id: "artist-year-147", title: "Twenty One Pilots" },
  { id: "artist-year-148", title: "Ty Dolla $ign" },
  { id: "artist-year-149", title: "Tyla" },
  { id: "artist-year-150", title: "Up Dharma Down" },
  { id: "artist-year-151", title: "Usher" },
  { id: "artist-year-152", title: "Wale" },
  { id: "artist-year-153", title: "XG" },
  { id: "artist-year-154", title: "Young Blood Neet" },
  { id: "artist-year-155", title: "Yung Miami" },
  { id: "artist-year-156", title: "Yuridope" },
  { id: "artist-year-157", title: "Zara Larsson" },
  { id: "artist-year-158", title: "Zayn" },
];

const bestNewArtistCandidates: Candidate[] = [
  { id: "best-new-artist-0", title: "ADÉLA" },
  { id: "best-new-artist-1", title: "Audrey Hobert" },
  { id: "best-new-artist-2", title: "Bella Kay" },
  { id: "best-new-artist-3", title: "DENŸ" },
  { id: "best-new-artist-4", title: "Dominic Fike" },
  { id: "best-new-artist-5", title: "Ella Langley" },
  { id: "best-new-artist-6", title: "fitterkarma" },
  { id: "best-new-artist-7", title: "Gat Putch" },
  { id: "best-new-artist-8", title: "Just Hush" },
  { id: "best-new-artist-9", title: "KAIA" },
  { id: "best-new-artist-10", title: "Kira" },
  { id: "best-new-artist-11", title: "Kyle Raphael" },
  { id: "best-new-artist-12", title: "La Mave" },
  { id: "best-new-artist-13", title: "Le John" },
  { id: "best-new-artist-14", title: "Louie Grammz" },
  { id: "best-new-artist-15", title: "Lucky" },
  { id: "best-new-artist-16", title: "Malcolm Todd" },
  { id: "best-new-artist-17", title: "Mi'Kel" },
  { id: "best-new-artist-18", title: "Nicole" },
  { id: "best-new-artist-19", title: "Role Model" },
  { id: "best-new-artist-20", title: "Ryan Beatty" },
  { id: "best-new-artist-21", title: "SAILORR" },
  { id: "best-new-artist-22", title: "Sam Fender" },
  { id: "best-new-artist-23", title: "Sienna Spiro" },
  { id: "best-new-artist-24", title: "Slayyyter" },
  { id: "best-new-artist-25", title: "Yuridope" },
];

const uniqueArtists = (() => {
  const seen = new Set<string>();
  const result: Candidate[] = [];

  songs.forEach((song, songIndex) => {
    splitArtists(song.subtitle ?? '').forEach((artist) => {
      const key = normalizeArtist(artist);
      if (!key || seen.has(key)) return;

      seen.add(key);
      result.push({
        id: `artist-${songIndex}-${result.length}`,
        title: artist,
      });
    });
  });

  return result;
})();

const collaborations = songs.filter((song) => {
  const credit = song.subtitle ?? '';

  return (
    /\b(featuring|feat\.?|ft\.?|with)\b/i.test(credit) ||
    /[&+,]/.test(credit)
  );
});

function parseChartDate(value: string): Date | null {
  const parts = value.trim().split('/').map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [month, day, shortYear] = parts;
  const year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;

  return new Date(year, month - 1, day);
}

function normalizeImageUrl(raw: string): string {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return '';

  if (/drive\.google\.com/i.test(value)) {
    const filePathMatch = value.match(/\/file\/d\/([^/?]+)/i);
    const queryIdMatch = value.match(/[?&]id=([^&]+)/i);
    const fileId = filePathMatch?.[1] ?? queryIdMatch?.[1];

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w800`;
    }
  }

  return value;
}

async function loadBestNewArtistCandidates(): Promise<Candidate[]> {
  const response = await fetch(HOT_100_CSV, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load Hot 100 history (${response.status}).`);
  }

  const parsed = Papa.parse<string[]>(await response.text(), {
    header: false,
    skipEmptyLines: true,
  });

  const firstAppearance = new Map<string, Date>();

  for (const row of parsed.data) {
    const date = parseChartDate(row[0] ?? '');
    const content = row[2]?.trim() ?? '';

    if (!date || !content) continue;

    const credit = content.split(/\r?\n/)[1]?.trim() ?? '';
    if (!credit) continue;

    for (const artist of splitArtists(credit)) {
      const key = normalizeArtist(artist);
      const previous = firstAppearance.get(key);

      if (!previous || date < previous) firstAppearance.set(key, date);
    }
  }

  return uniqueArtists.filter((artist) => {
    const first = firstAppearance.get(normalizeArtist(artist.title));
    return Boolean(first && first >= CUTOFF);
  });
}

function getCandidateList(
  categoryId: CategoryId,
  candidateLists: Record<CategoryId, Candidate[]>
): Candidate[] {
  return candidateLists[categoryId] ?? [];
}

function mergeContenders(
  apiContenders: OddsContender[],
  candidateList: Candidate[]
): OddsContender[] {
  const merged = new Map<string, OddsContender>();
  const candidateLabels = new Map<string, string>();

  for (const candidate of candidateList) {
    const label = candidateLabel(candidate);
    const key = normalizeNominee(label);

    if (key && !candidateLabels.has(key)) {
      candidateLabels.set(key, label);
    }
  }

  for (const contender of apiContenders) {
    const key = normalizeNominee(contender.nominee);
    if (!key) continue;

    const incoming: OddsContender = {
      nominee: candidateLabels.get(key) ?? contender.nominee.trim(),
      points: Number(contender.points) || 0,
      appearances: Number(contender.appearances) || 0,
      firstPlaceVotes: Number(contender.firstPlaceVotes) || 0,
      odds: Number(contender.odds) || 0,
      change: contender.change ?? null,
    };

    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, incoming);
      continue;
    }

    merged.set(key, {
      nominee: candidateLabels.get(key) ?? existing.nominee,
      points: Math.max(existing.points, incoming.points),
      appearances: Math.max(existing.appearances, incoming.appearances),
      firstPlaceVotes: Math.max(existing.firstPlaceVotes, incoming.firstPlaceVotes),
      odds: Math.max(existing.odds, incoming.odds),
      change: incoming.change ?? existing.change ?? null,
    });
  }

  for (const [key, label] of candidateLabels) {
    if (merged.has(key)) continue;

    merged.set(key, {
      nominee: label,
      points: 0,
      appearances: 0,
      firstPlaceVotes: 0,
      odds: 0,
      change: null,
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      b.odds - a.odds ||
      b.appearances - a.appearances ||
      b.points - a.points ||
      b.firstPlaceVotes - a.firstPlaceVotes ||
      a.nominee.localeCompare(b.nominee)
  );
}

export default function AwardsPredictionsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [predictions, setPredictions] = useState<
    Partial<Record<CategoryId, string[]>>
  >({});
  const [searches, setSearches] = useState<string[]>(Array(8).fill(''));
  const [winnerPredictions, setWinnerPredictions] = useState<
    Partial<Record<CategoryId, string>>
  >({});
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newArtists, setNewArtists] = useState<Candidate[]>([]);
  const [isLoadingNewArtists, setIsLoadingNewArtists] = useState(true);
  const [newArtistError, setNewArtistError] = useState('');
  const [oddsByCategory, setOddsByCategory] = useState<
    Record<string, CategoryOdds>
  >({});
  const [winnerCategories, setWinnerCategories] = useState<
    Record<string, WinnerCategory>
  >({});
  const [isLoadingOdds, setIsLoadingOdds] = useState(true);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const [songArtworks, setSongArtworks] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [locked, setLocked] = useState<Partial<Record<CategoryId, boolean>>>({});

  useEffect(() => {
    let cancelled = false;

    loadBestNewArtistCandidates()
      .then((result) => {
        if (!cancelled) setNewArtists(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setNewArtistError(
            error instanceof Error
              ? error.message
              : 'Unable to check historical chart eligibility.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNewArtists(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Artist photos are in column O, matched to artist names in column A.
  // Both columns begin at row 3 of the dedicated artist-image sheet.
  useEffect(() => {
    let cancelled = false;

    async function loadArtistImages() {
      try {
        const response = await fetch(ARTIST_IMAGES_CSV, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Unable to load artist images (${response.status}).`);
        }

        const parsed = Papa.parse<string[]>(await response.text(), {
          header: false,
          skipEmptyLines: false,
        });

        const rows = parsed.data;
        const images: Record<string, string> = {};

        for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
          const row = rows[rowIndex] ?? [];
          const artist = String(row[0] ?? '').trim();
          const imageUrl = normalizeImageUrl(String(row[14] ?? ''));

          if (!artist || !imageUrl) continue;

          images[normalizeArtist(artist)] = imageUrl;
          images[normalizeImageKey(artist)] = imageUrl;
        }

        if (!cancelled) {
          setArtistImages(images);
          console.info(
            `Loaded ${Object.keys(images).length / 2} artist image entries.`
          );
        }
      } catch (error) {
        console.error('Unable to load artist images:', error);
      }
    }

    void loadArtistImages();

    return () => {
      cancelled = true;
    };
  }, []);

  // Song artwork is loaded separately from column K of the Hot 100 sheet.
  // Column C contains the stacked song title and artist credit.
  useEffect(() => {
    let cancelled = false;

    async function loadSongArtworks() {
      try {
        const response = await fetch(HOT_100_CSV, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Unable to load song artwork (${response.status}).`);
        }

        const parsed = Papa.parse<string[]>(await response.text(), {
          header: false,
          skipEmptyLines: true,
        });

        const rows = parsed.data;
        const headers = (rows[0] ?? []).map((cell) =>
          String(cell ?? '').trim().toLocaleLowerCase()
        );

        const contentHeaderIndex = headers.findIndex((header) =>
          /^(song|title|song title|title and artist|song and artist|track|song\/artist)$/.test(
            header
          )
        );

        const artworkHeaderIndex = headers.findIndex((header) =>
          /(artwork|cover art|album art|cover image|thumbnail|image url|artwork url|cover url|image link)/.test(
            header
          )
        );

        const dateHeaderIndex = headers.findIndex((header) =>
          /^(date|week|chart date|week ending)$/.test(header)
        );

        const hasHeaders =
          contentHeaderIndex >= 0 ||
          artworkHeaderIndex >= 0 ||
          dateHeaderIndex >= 0;

        const dataRows = hasHeaders ? rows.slice(1) : rows;
        const contentIndex = contentHeaderIndex >= 0 ? contentHeaderIndex : 2;
        const artworkIndex = artworkHeaderIndex >= 0 ? artworkHeaderIndex : 10;
        const artworks: Record<string, string> = {};

        for (const row of dataRows) {
          const content = String(row[contentIndex] ?? '').trim();
          const imageUrl = normalizeImageUrl(String(row[artworkIndex] ?? ''));

          if (!content || !imageUrl) continue;

          const parts = content
            .split(/\r?\n/)
            .map((part) => part.trim())
            .filter(Boolean);

          if (parts.length < 2) continue;

          const title = parts[0];
          const artist = parts.slice(1).join(' ');
          const key = normalizeImageKey(`${title} — ${artist}`);
          const newlineKey = normalizeImageKey(`${title}\n${artist}`);

          if (!artworks[key]) artworks[key] = imageUrl;
          if (!artworks[newlineKey]) artworks[newlineKey] = imageUrl;
        }

        if (!cancelled) {
          setSongArtworks(artworks);
        }
      } catch (error) {
        console.error('Unable to load song artwork:', error);
      }
    }

    void loadSongArtworks();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshOdds = useCallback(async () => {
    try {
      const response = await fetch('/api/awards-predictions', {
        cache: 'no-store',
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to load prediction odds.');
      }

      setOddsByCategory(result.categories ?? {});
      setWinnerCategories(result.winnerCategories ?? {});
    } catch (error) {
      console.error('Unable to refresh prediction odds:', error);
    } finally {
      setIsLoadingOdds(false);
    }
  }, []);

  useEffect(() => {
    void refreshOdds();
  }, [refreshOdds]);

  const candidates: Record<CategoryId, Candidate[]> = useMemo(
    () => ({
      album: albums,
      artist: artistOfTheYearCandidates,
      record: songs,
      song: songs,
      collaboration: collaborations,
      'new-artist': bestNewArtistCandidates,
    }),
    []
  );

  const category = categories.find((item) => item.id === activeCategory);
  const selected = activeCategory
    ? predictions[activeCategory] ?? Array(8).fill('')
    : [];
  const selectedWinner = activeCategory
    ? winnerPredictions[activeCategory] ?? ''
    : '';

  function openPrediction(id: CategoryId) {
    setActiveCategory(id);
    setSearches(Array(8).fill(''));
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePrediction(slot: number, value: string) {
    if (!activeCategory || locked[activeCategory]) return;

    const categoryId = activeCategory;
    const updated = [...(predictions[categoryId] ?? Array(8).fill(''))];
    updated[slot] = value;

    setPredictions((previous) => ({
      ...previous,
      [categoryId]: updated,
    }));

    const currentWinner = winnerPredictions[categoryId];

    if (currentWinner && !updated.includes(currentWinner)) {
      setWinnerPredictions((previous) => ({
        ...previous,
        [categoryId]: '',
      }));
    }

    setMessage('');
  }

  async function lockPrediction() {
    if (!activeCategory || !category || isSubmitting || locked[activeCategory]) {
      return;
    }

    if (selected.length !== 8 || selected.some((item) => !item)) {
      setMessage('Fill all eight spots before locking your prediction.');
      return;
    }

    if (new Set(selected).size !== 8) {
      setMessage('Each contender can only appear once in this category.');
      return;
    }

    if (!selectedWinner || !selected.includes(selectedWinner)) {
      setMessage('Choose your winner from your eight predicted nominees.');
      return;
    }

    const nomineeCandidates = selected.map((id) =>
      candidates[activeCategory].find((item) => item.id === id)
    );

    const nominees = nomineeCandidates.map((candidate) =>
      candidate ? candidateLabel(candidate) : ''
    );

    if (nominees.some((name) => !name)) {
      setMessage('One or more selections are invalid. Please select them again.');
      return;
    }

    const winnerCandidate = candidates[activeCategory].find(
      (candidate) => candidate.id === selectedWinner
    );

    if (!winnerCandidate) {
      setMessage('Your winner selection is invalid. Please select it again.');
      return;
    }

    setIsSubmitting(true);
    setMessage('Saving your prediction...');

    try {
      const response = await fetch('/api/awards-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictions: [{ category: category.title, nominees }],
          winnerPredictions: [
            {
              category: category.title,
              nominee: candidateLabel(winnerCandidate),
            },
          ],
        }),
      });

      const responseText = await response.text();
      let result: ApiResult;

      try {
        result = JSON.parse(responseText) as ApiResult;
      } catch {
        throw new Error(
          `The server returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to save your prediction. Please try again.'
        );
      }

      setPredictions((previous) => ({
        ...previous,
        [activeCategory]: Array(8).fill(''),
      }));

      setWinnerPredictions((previous) => ({
        ...previous,
        [activeCategory]: '',
      }));

      setSearches(Array(8).fill(''));
      setLocked((previous) => ({
        ...previous,
        [activeCategory]: false,
      }));

      setMessage(
        'Prediction submitted successfully! You can submit another prediction anytime.'
      );

      await refreshOdds();
    } catch (error) {
      console.error('Unable to submit awards prediction:', error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="predictions-page">
      <div className="predictions-container">
        <header className="predictions-intro">
          <p className="predictions-eyebrow">ELIO CHARTS AWARDS</p>
          <h1>2026 Elio Charts Awards</h1>
          <p className="predictions-description">
            Nominations will be unveiled on the first week of December while
            the awarding will take place before the year ends.
          </p>
        </header>

        <section className="predictions-section">
          <div className="predictions-section-heading">
            <div>
              <p className="predictions-eyebrow">YOUR CALL, YOUR PREDICTION</p>
              <h2>
                Predicted Nominations Leaders
                <br />
                for General Field
              </h2>
            </div>

            {activeCategory && (
              <button
                className="predictions-back-button"
                onClick={() => {
                  setActiveCategory(null);
                  setMessage('');
                }}
              >
                ← ALL CATEGORIES
              </button>
            )}
          </div>

          {category ? (
            <section className="prediction-form">
              <div className="prediction-category-header">
                <h3>{category.title}</h3>

                {locked[category.id] ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLocked((previous) => ({
                        ...previous,
                        [category.id]: false,
                      }));
                      setMessage(
                        'Editing enabled. Save again to update your prediction.'
                      );
                    }}
                  >
                    ✎ EDIT
                  </button>
                ) : (
                  <span>YOUR TOP 8</span>
                )}
              </div>

              <p className="prediction-form-description">
                Choose eight different contenders in your predicted nomination
                order. Then select which of those eight you think will win.
              </p>

              <div className="prediction-slots">
                {Array.from({ length: 8 }, (_, index) => {
                  const chosen = selected[index] ?? '';
                  const available = candidates[category.id].filter(
                    (candidate) =>
                      !selected.includes(candidate.id) ||
                      candidate.id === chosen
                  );

                  const selectedCandidate = candidates[category.id].find(
                    (item) => item.id === chosen
                  );

                  return (
                    <div className="prediction-slot" key={index}>
                      <span className="prediction-slot-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="prediction-slot-content">
                        <label htmlFor={`prediction-${index}`}>
                          {index === 0
                            ? 'FIRST PREDICTED NOMINEE'
                            : `PREDICTED NOMINEE ${index + 1}`}
                        </label>

                        <input
                          id={`prediction-${index}`}
                          list={`candidate-list-${index}`}
                          value={
                            selectedCandidate
                              ? candidateLabel(selectedCandidate)
                              : searches[index]
                          }
                          placeholder="Search for a contender..."
                          disabled={Boolean(locked[category.id])}
                          onChange={(event) => {
                            const value = event.target.value;

                            setSearches((previous) =>
                              previous.map((item, i) =>
                                i === index ? value : item
                              )
                            );

                            const match = available.find(
                              (item) =>
                                candidateLabel(item).toLowerCase() ===
                                value.trim().toLowerCase()
                            );

                            updatePrediction(index, match?.id ?? '');
                          }}
                          autoComplete="off"
                        />

                        <datalist id={`candidate-list-${index}`}>
                          {available.map((candidate) => (
                            <option
                              key={candidate.id}
                              value={candidateLabel(candidate)}
                            />
                          ))}
                        </datalist>
                      </div>

                      {chosen && (
                        <button
                          type="button"
                          className="prediction-remove"
                          aria-label={`Remove nominee ${index + 1}`}
                          disabled={Boolean(locked[category.id])}
                          onClick={() => {
                            updatePrediction(index, '');
                            setSearches((previous) =>
                              previous.map((item, i) =>
                                i === index ? '' : item
                              )
                            );
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="prediction-winner-section">
                <div className="prediction-winner-heading">
                  <span className="prediction-winner-icon" aria-hidden="true">
                    ★
                  </span>
                  <div>
                    <h4>Predict the winner!</h4>
                    <p>Choose from your eight predicted nominees.</p>
                  </div>
                </div>

                <label
                  className="prediction-winner-label"
                  htmlFor="prediction-winner"
                >
                  YOUR WINNER
                </label>

                <select
                  id="prediction-winner"
                  className="prediction-winner-select"
                  value={selectedWinner}
                  disabled={
                    Boolean(locked[category.id]) ||
                    selected.filter(Boolean).length === 0
                  }
                  onChange={(event) => {
                    setWinnerPredictions((previous) => ({
                      ...previous,
                      [category.id]: event.target.value,
                    }));
                    setMessage('');
                  }}
                  required
                >
                  <option value="">Select your predicted winner...</option>
                  {selected.map((id) => {
                    if (!id) return null;

                    const candidate = candidates[category.id].find(
                      (item) => item.id === id
                    );

                    if (!candidate) return null;

                    return (
                      <option key={id} value={id}>
                        {candidateLabel(candidate)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                className="prediction-lock-button"
                onClick={lockPrediction}
                disabled={
                  Boolean(locked[category.id]) ||
                  candidates[category.id].length < 8 ||
                  isSubmitting
                }
              >
                {isSubmitting
                  ? 'SAVING PREDICTION...'
                  : locked[category.id]
                    ? 'PREDICTION LOCKED ✓'
                    : 'SUBMIT YOUR PREDICTION'}
              </button>

              {candidates[category.id].length === 0 && (
                  <p className="prediction-notice">
                    No eligible contenders are available for this category.
                  </p>
                )}

              {message && (
                <p
                  className="prediction-message"
                  role="status"
                  aria-live="polite"
                >
                  {message}
                </p>
              )}
            </section>
          ) : (
            <div className="prediction-category-grid">
              {categories.map((item) => {
                const categoryOdds = oddsByCategory[item.title];
                const submissionCount = Math.max(
                  0,
                  Number(categoryOdds?.submissionCount) || 0
                );

                const candidateList = getCandidateList(item.id, candidates);
                const allContenders = mergeContenders(
                  categoryOdds?.nominees ?? [],
                  candidateList
                );

                const winnerCategory = winnerCategories[item.title];

                const winnerLeaders = new Set(
                  (winnerCategory?.nominees ?? [])
                    .filter(
                      (contender) =>
                        Number(contender.votes) > 0 &&
                        Number(contender.votes) ===
                          Number(winnerCategory?.highestVotes)
                    )
                    .map((contender) => normalizeNominee(contender.nominee))
                );

                const visibleContenders = [
                  ...allContenders.slice(0, 8),
                  ...allContenders.filter(
                    (contender) =>
                      winnerLeaders.has(normalizeNominee(contender.nominee)) &&
                      !allContenders
                        .slice(0, 8)
                        .some(
                          (visible) =>
                            normalizeNominee(visible.nominee) ===
                            normalizeNominee(contender.nominee)
                        )
                  ),
                ];

                const isExpanded = Boolean(expandedCategories[item.id]);

                const contenders = isExpanded
                  ? allContenders
                  : visibleContenders;

                return (
                  <article className="prediction-category-card" key={item.id}>
                    <div className="prediction-category-header">
                      <h3>{item.title}</h3>
                      <button onClick={() => openPrediction(item.id)}>
                        PREDICT <span aria-hidden="true">↗</span>
                      </button>
                    </div>

                    <div className="prediction-table-head">
                      <span>CONTENDER</span>
                      <span>ODDS</span>
                    </div>

                    {contenders.length > 0 ? (
                      <div className="prediction-odds-list">
                        {contenders.map((contender, index) => {
                          const parsedNominee = splitNominee(contender.nominee);

                          const isWinnerLeader = winnerLeaders.has(
                            normalizeNominee(contender.nominee)
                          );

                          const useArtistImage =
                            item.id === 'album' ||
                            item.id === 'artist' ||
                            item.id === 'new-artist';

                          const isArtistOnlyCategory =
                            item.id === 'artist' || item.id === 'new-artist';

                          const title = isArtistOnlyCategory
                            ? contender.nominee
                            : parsedNominee.title;

                          const artist = isArtistOnlyCategory
                            ? ''
                            : parsedNominee.artist;

                          const imageArtist = isArtistOnlyCategory
                            ? contender.nominee
                            : artist;

                          const imageKey = useArtistImage
                            ? normalizeArtist(imageArtist)
                            : normalizeImageKey(contender.nominee);

                          const imageUrl = useArtistImage
                            ? artistImages[imageKey] ??
                              artistImages[normalizeImageKey(imageArtist)]
                            : songArtworks[imageKey] ??
                              songArtworks[
                                normalizeImageKey(
                                  `${parsedNominee.title} — ${parsedNominee.artist}`
                                )
                              ];

                          const failedImageKey = `${item.id}:${imageKey}`;
                          const imageFailed = Boolean(
                            failedImages[failedImageKey]
                          );

                          const appearances = Math.max(
                            0,
                            Number(contender.appearances) || 0
                          );

                          const percentage = Math.max(
  0,
  Math.min(100, Number(contender.odds) || 0)
);

                          const change =
                            typeof contender.change === 'number' &&
                            Number.isFinite(contender.change)
                              ? contender.change
                              : null;

                          return (
                            <article
                              className="prediction-odds-row"
                              key={contender.nominee}
                            >
                              <span className="prediction-odds-rank">
                                {index + 1}.
                              </span>

                              <div className="prediction-odds-image">
                                {imageUrl && !imageFailed ? (
                                  <img
                                    src={imageUrl}
                                    alt={imageArtist || title}
                                    loading="lazy"
                                    onError={() => {
                                      setFailedImages((previous) => ({
                                        ...previous,
                                        [failedImageKey]: true,
                                      }));
                                    }}
                                  />
                                ) : (
                                  <div className="prediction-odds-image-placeholder">
                                    {title.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="prediction-odds-info">
                                <div className="prediction-odds-topline">
                                  <div className="prediction-odds-names">
                                    <span className="prediction-odds-title">
                                      {title}
                                      {isWinnerLeader && (
                                        <span
                                          className="prediction-winner-star"
                                          title="Currently tied for the most winner prediction votes"
                                          aria-label="Winner prediction vote leader"
                                        >
                                          {' '}★
                                        </span>
                                      )}
                                    </span>

                                    {artist && (
                                      <span className="prediction-odds-artist">
                                        {artist}
                                      </span>
                                    )}
                                  </div>

                                  <div className="prediction-odds-metrics">
                                    <span className="prediction-odds-percentage">
                                      {percentage.toFixed(1)}%
                                    </span>

                                    <span
                                      className={`prediction-odds-change ${
                                        change === null
                                          ? 'is-flat'
                                          : change > 0
                                            ? 'is-up'
                                            : change < 0
                                              ? 'is-down'
                                              : 'is-flat'
                                      }`}
                                    >
                                      {change === null
                                        ? '—'
                                        : `${change > 0 ? '+' : ''}${change.toFixed(1)}% ${
                                            change > 0
                                              ? '▲'
                                              : change < 0
                                                ? '▼'
                                                : '—'
                                          }`}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className="prediction-odds-bar"
                                  role="progressbar"
                                  aria-label={`${title} nomination percentage`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={Number(percentage.toFixed(1))}
                                >
                                  <span
                                    className="prediction-odds-bar-fill"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="prediction-empty">
                        <span className="prediction-empty-mark">✳</span>
                        <p>
                          {isLoadingOdds
                            ? 'Loading contender odds...'
                            : 'No contenders available.'}
                        </p>
                        <span>
                          {isLoadingOdds
                            ? 'Retrieving submitted rankings.'
                            : 'The contender list is currently empty.'}
                        </span>
                      </div>
                    )}

                    {allContenders.length > 8 && (
                      <button
                        type="button"
                        className="prediction-view-all"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedCategories((previous) => ({
                            ...previous,
                            [item.id]: !previous[item.id],
                          }))
                        }
                      >
                        {isExpanded ? 'SHOW LESS ↑' : 'VIEW ALL ↓'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="predictions-footer">
          <span>ELIO CHARTS</span>
          <span>2026 AWARDS SEASON</span>
        </footer>
      </div>

      <style jsx global>{`
        .predictions-page {
          min-height: 80vh;
          background: #fff;
          color: #111;
          padding: 64px 28px 40px;
          font-family: var(--font-brown-regular), sans-serif;
        }

        .predictions-container {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
        }

        .predictions-intro {
          padding: 12px 0 52px;
          border-bottom: 1px solid #e5e5e5;
        }

        .predictions-eyebrow {
          margin: 0 0 14px;
          color: #666;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 11px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .predictions-intro h1 {
          margin: 0;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: clamp(34px, 5.5vw, 68px);
          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .predictions-description {
          max-width: 620px;
          margin: 20px 0 0;
          color: #555;
          font-size: 15px;
          line-height: 1.8;
        }

        .predictions-section {
          padding-top: 44px;
        }

        .predictions-section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .predictions-section-heading h2 {
          margin: 0;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: clamp(25px, 3.2vw, 40px);
          line-height: 1.14;
          letter-spacing: -0.035em;
        }

        .predictions-back-button {
          border: 1px solid #d8d8d8;
          background: #fff;
          padding: 12px 15px;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 10px;
          letter-spacing: 0.04em;
          cursor: pointer;
        }

        .prediction-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .prediction-category-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          border: 1px solid #e6e6e6;
          background: #fff;
        }

        .prediction-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 62px;
          padding: 14px 16px;
          background: #111;
          color: #e6c878;
        }

        .prediction-category-header h3 {
          margin: 0;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0.025em;
        }

        .prediction-category-header button {
          flex-shrink: 0;
          border: 1px solid #e6c878;
          background: transparent;
          color: #e6c878;
          padding: 9px 10px;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 10px;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }

        .prediction-category-header button:hover {
          background: #e6c878;
          color: #111;
        }

        .prediction-table-head {
          display: flex;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #e8e8e8;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 9px;
          letter-spacing: 0.1em;
        }

        .prediction-empty {
          display: flex;
          min-height: 190px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }

        .prediction-empty-mark {
          color: #c5a34f;
          font-size: 25px;
        }

        .prediction-empty p {
          margin: 12px 0 7px;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 13px;
        }

        .prediction-empty > span:last-child {
          max-width: 250px;
          color: #777;
          font-size: 11px;
          line-height: 1.7;
        }

        .prediction-odds-list {
          flex: 1;
        }

        .prediction-odds-row {
          display: grid;
          grid-template-columns: 24px 64px minmax(0, 1fr);
          align-items: center;
          column-gap: 14px;
          padding: 18px 16px;
          border-bottom: 1px solid #ededed;
        }

        .prediction-odds-row:last-child {
          border-bottom: 0;
        }

        .prediction-odds-rank {
          align-self: start;
          padding-top: 3px;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }

        .prediction-odds-image {
          position: relative;
          display: block;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 14px;
          background: #f1f1f1;
        }

        .prediction-odds-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .prediction-odds-image-placeholder {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          background: #f1f1f1;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 22px;
        }

        .prediction-odds-info {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 12px;
        }

        .prediction-odds-topline {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .prediction-odds-names {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 5px;
        }

        .prediction-odds-title {
          color: #111;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;
          text-transform: uppercase;
        }

        .prediction-winner-star {
          display: inline-block;
          margin-left: 4px;
          color: #c5a34f;
          font-size: 15px;
          line-height: 1;
          vertical-align: 1px;
        }

        .prediction-odds-artist {
          color: #777;
          font-family: var(--font-brown-regular), sans-serif;
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
          text-transform: none;
        }

        .prediction-odds-metrics {
          display: flex;
          flex-shrink: 0;
          align-items: flex-end;
          flex-direction: column;
          gap: 4px;
          text-align: right;
        }

        .prediction-odds-bar {
          width: 100%;
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #e9e9e9;
        }

        .prediction-odds-bar-fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #c5a34f;
          transition: width 300ms ease;
        }

        .prediction-odds-percentage {
          color: #111;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .prediction-odds-change {
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .prediction-odds-change.is-up {
          color: #16834a;
        }

        .prediction-odds-change.is-down {
          color: #d43d3d;
        }

        .prediction-odds-change.is-flat {
          color: #888;
        }

        .prediction-view-all {
          display: block;
          width: 100%;
          min-height: 48px;
          margin-top: auto;
          padding: 15px 16px;
          border: 0;
          border-top: 1px solid #292929;
          background: #111;
          color: #e6c878;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-align: center;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }

        .prediction-view-all:hover {
          background: #242424;
          color: #f4dc91;
        }

        .prediction-view-all:focus-visible {
          outline: 2px solid #e6c878;
          outline-offset: -4px;
        }

        .prediction-form {
          max-width: 900px;
          border: 1px solid #e5e5e5;
          background: #fff;
        }

        .prediction-form-description {
          margin: 0;
          padding: 22px 24px;
          color: #666;
          font-size: 13px;
          line-height: 1.8;
        }

        .prediction-slots {
          padding: 0 24px;
        }

        .prediction-slot {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 0;
          border-top: 1px solid #ededed;
        }

        .prediction-slot-number {
          display: flex;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          background: #f3f0e7;
          color: #806728;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 12px;
        }

        .prediction-slot-content {
          min-width: 0;
          flex: 1;
        }

        .prediction-slot-content label {
          display: block;
          margin-bottom: 8px;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 9px;
          letter-spacing: 0.09em;
        }

        .prediction-slot-content input {
          width: 100%;
          min-height: 44px;
          border: 1px solid #dedede;
          border-radius: 8px;
          outline: none;
          background: #fff;
          padding: 0 13px;
          color: #111;
          font: inherit;
          font-size: 13px;
        }

        .prediction-slot-content input:focus {
          border-color: #0050ff;
          box-shadow: 0 0 0 2px rgb(0 80 255 / 9%);
        }

        .prediction-remove {
          width: 30px;
          height: 30px;
          border: 0;
          background: transparent;
          color: #777;
          font-size: 23px;
          cursor: pointer;
        }

        .prediction-remove:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .prediction-winner-section {
          margin: 8px 24px 0;
          padding: 22px;
          border: 1px solid #eadbb0;
          background: #fffdf7;
        }

        .prediction-winner-heading {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 22px;
        }

        .prediction-winner-icon {
          display: flex;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #e6c878;
          border-radius: 50%;
          background: #f8edc9;
          color: #a47b18;
          font-size: 21px;
          line-height: 1;
        }

        .prediction-winner-heading h4 {
          margin: 0;
          color: #111;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 15px;
          line-height: 1.4;
        }

        .prediction-winner-heading p {
          margin: 5px 0 0;
          color: #777;
          font-size: 12px;
          line-height: 1.6;
        }

        .prediction-winner-label {
          display: block;
          margin-bottom: 8px;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 9px;
          letter-spacing: 0.09em;
        }

        .prediction-winner-select {
          display: block;
          width: 100%;
          min-height: 48px;
          border: 1px solid #ded5bd;
          border-radius: 8px;
          outline: none;
          background: #fff;
          padding: 0 13px;
          color: #111;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .prediction-winner-select:focus {
          border-color: #c5a34f;
          box-shadow: 0 0 0 2px rgb(197 163 79 / 13%);
        }

        .prediction-winner-select:disabled {
          background: #f7f5ef;
          color: #999;
          cursor: not-allowed;
        }

        .prediction-lock-button {
          display: block;
          width: calc(100% - 48px);
          min-height: 54px;
          margin: 20px 24px 24px;
          border: 0;
          background: #0050ff;
          color: #fff;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 12px;
          letter-spacing: 0.045em;
          cursor: pointer;
        }

        .prediction-lock-button:hover:not(:disabled) {
          background: #003fd0;
        }

        .prediction-lock-button:disabled {
          background: #a9b9e9;
          cursor: not-allowed;
        }

        .prediction-notice,
        .prediction-message {
          margin: 0 24px 24px;
          color: #777;
          font-size: 12px;
          line-height: 1.7;
        }

        .prediction-message {
          color: #0050ff;
        }

        .predictions-footer {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 56px;
          padding-top: 18px;
          border-top: 1px solid #e5e5e5;
          color: #777;
          font-family: var(--font-brown-bold), sans-serif;
          font-size: 9px;
          letter-spacing: 0.12em;
        }

        @media (max-width: 1000px) {
          .prediction-category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .prediction-odds-row {
            grid-template-columns: 22px 56px minmax(0, 1fr);
            column-gap: 11px;
            padding: 16px 12px;
          }

          .prediction-odds-image {
            width: 56px;
            height: 56px;
            border-radius: 12px;
          }

          .prediction-odds-info {
            gap: 10px;
          }

          .prediction-odds-topline {
            gap: 8px;
          }

          .prediction-odds-title {
            font-size: 12px;
          }

          .prediction-odds-artist {
            font-size: 10px;
          }

          .prediction-odds-percentage {
            font-size: 12px;
          }

          .prediction-odds-change {
            font-size: 9px;
          }
        }

        @media (max-width: 640px) {
          .predictions-page {
            padding: 36px 16px 28px;
          }

          .predictions-intro {
            padding-bottom: 34px;
          }

          .predictions-section {
            padding-top: 32px;
          }

          .predictions-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .prediction-category-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }

          .prediction-category-header {
            padding: 13px;
          }

          .prediction-category-header h3 {
            font-size: 11px;
          }

          .prediction-table-head {
            padding: 12px;
          }

          .prediction-odds-row {
            grid-template-columns: 20px 48px minmax(0, 1fr);
            column-gap: 9px;
            padding: 15px 10px;
          }

          .prediction-odds-image {
            width: 48px;
            height: 48px;
            border-radius: 10px;
          }

          .prediction-odds-info {
            gap: 9px;
          }

          .prediction-odds-topline {
            gap: 6px;
          }

          .prediction-odds-title {
            font-size: 11px;
          }

          .prediction-odds-artist {
            font-size: 10px;
          }

          .prediction-odds-percentage {
            font-size: 10px;
          }

          .prediction-odds-change {
            font-size: 8px;
          }

          .prediction-form-description {
            padding: 18px 16px;
          }

          .prediction-slots {
            padding: 0 16px;
          }

          .prediction-slot {
            gap: 12px;
          }

          .prediction-slot-number {
            width: 32px;
            height: 32px;
          }

          .prediction-winner-section {
            margin: 8px 16px 0;
            padding: 17px 15px;
          }

          .prediction-winner-heading {
            gap: 10px;
          }

          .prediction-winner-heading h4 {
            font-size: 14px;
          }

          .prediction-winner-heading p {
            font-size: 11px;
          }

          .prediction-lock-button {
            width: calc(100% - 32px);
            margin: 20px 16px;
            font-size: 10px;
          }

          .prediction-notice,
          .prediction-message {
            margin-right: 16px;
            margin-left: 16px;
          }

          .predictions-footer {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}