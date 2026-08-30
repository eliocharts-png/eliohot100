'use client';

import { useState } from 'react';

import type {
  SongRecord,
  ArtistRecord,
  RecordsData,
} from '@/lib/records';

interface RecordsPageProps {
  records: RecordsData;
}

/*
 * =========================================================
 * SONG RECORD CARD
 * =========================================================
 */

function SongRecordCard({
  record,
  recordTitle,
}: {
  record: SongRecord;
  recordTitle: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <article
      className="group relative min-w-0 cursor-pointer overflow-hidden"
      onClick={() => setActive((value) => !value)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {/* ARTWORK */}
      <div className="relative aspect-square w-full overflow-hidden bg-black/5">

        {record.artwork ? (
          <img
            src={record.artwork}
            alt={`${record.title} artwork`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/5 text-xs font-brown-regular uppercase tracking-[0.25em] text-black/30">
            ARTWORK
          </div>
        )}

        {/* GRADIENT */}
        <div
          className="absolute inset-x-0 bottom-0 h-[65%]"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              #00000033 35%,
              #000000CC 78%,
              #000000 100%
            )`,
          }}
        />

        {/* SONG INFORMATION */}
        <div
          className={`absolute inset-x-0 bottom-0 p-3 transition-all duration-300 sm:p-5 ${
            active
              ? 'translate-y-0 opacity-100'
              : 'translate-y-1 opacity-100'
          }`}
        >
          {/* RECORD TITLE */}
          <p className="font-brown-regular text-[0.52rem] uppercase leading-tight tracking-[0.16em] text-white/70 sm:text-[0.65rem] sm:tracking-[0.2em]">
            {recordTitle}
          </p>

          {/* SONG TITLE */}
          <h3 className="mt-1 break-words font-brown-bold text-[1rem] leading-[0.98] text-white sm:text-[1.65rem] sm:leading-[1]">
            {record.title}
          </h3>

          {/* ARTIST */}
          <p className="mt-1 break-words font-brown-regular text-[0.68rem] leading-tight text-white/80 sm:text-sm">
            {record.artist}
          </p>

          {/* VALUE */}
          <p className="mt-2 font-brown-bold text-[0.65rem] uppercase tracking-[0.12em] text-white sm:text-xs">
            {record.valueLabel}
          </p>
        </div>

        {/* DESCRIPTION POPUP */}
        <div
          className={`absolute inset-x-2 top-2 z-10 transition-all duration-300 sm:inset-x-4 sm:top-4 ${
            active
              ? 'translate-y-0 opacity-100'
              : '-translate-y-2 pointer-events-none opacity-0'
          }`}
        >
          <div className="bg-black/90 px-3 py-3 shadow-xl backdrop-blur-sm sm:px-4 sm:py-4">

            <p className="font-brown-regular text-[0.5rem] uppercase leading-tight tracking-[0.15em] text-white/60 sm:text-[0.6rem] sm:tracking-[0.18em]">
              {recordTitle}
            </p>

            <p className="mt-1 font-brown-bold text-[0.72rem] leading-[1.2] text-white sm:text-sm">
              {record.valueLabel}
            </p>

            <p className="mt-2 font-brown-regular text-[0.72rem] leading-[1.25] text-white/80 sm:text-sm sm:leading-[1.35]">
              {record.description}
            </p>

          </div>
        </div>

      </div>
    </article>
  );
}

/*
 * =========================================================
 * ARTIST RECORD CARD
 * =========================================================
 */

function ArtistRecordCard({
  record,
  recordTitle,
}: {
  record: ArtistRecord;
  recordTitle: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <article
      className="group relative min-w-0 cursor-pointer overflow-hidden"
      onClick={() => setActive((value) => !value)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {/* ARTIST IMAGE */}
      <div className="relative aspect-square w-full overflow-hidden bg-black/5">

        {record.image ? (
          <img
            src={record.image}
            alt={record.artist}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/5 text-xs font-brown-regular uppercase tracking-[0.25em] text-black/30">
            ARTIST
          </div>
        )}

        {/* GRADIENT */}
        <div
          className="absolute inset-x-0 bottom-0 h-[65%]"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              #00000033 35%,
              #000000CC 78%,
              #000000 100%
            )`,
          }}
        />

        {/* ARTIST INFORMATION */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">

          {/* RECORD TITLE */}
          <p className="font-brown-regular text-[0.52rem] uppercase leading-tight tracking-[0.16em] text-white/70 sm:text-[0.65rem] sm:tracking-[0.2em]">
            {recordTitle}
          </p>

          {/* ARTIST */}
          <h3 className="mt-1 break-words font-brown-bold text-[1rem] leading-[0.98] text-white sm:text-[1.65rem] sm:leading-[1]">
            {record.artist}
          </h3>

          {/* VALUE */}
          <p className="mt-2 font-brown-bold text-[0.65rem] uppercase tracking-[0.12em] text-white sm:text-xs">
            {record.valueLabel}
          </p>

        </div>

        {/* DESCRIPTION POPUP */}
        <div
          className={`absolute inset-x-2 top-2 z-10 transition-all duration-300 sm:inset-x-4 sm:top-4 ${
            active
              ? 'translate-y-0 opacity-100'
              : '-translate-y-2 pointer-events-none opacity-0'
          }`}
        >
          <div className="bg-black/90 px-3 py-3 shadow-xl backdrop-blur-sm sm:px-4 sm:py-4">

            {/* RECORD TITLE */}
            <p className="font-brown-regular text-[0.5rem] uppercase leading-tight tracking-[0.15em] text-white/60 sm:text-[0.6rem] sm:tracking-[0.18em]">
              {recordTitle}
            </p>

            {/* VALUE */}
            <p className="mt-1 font-brown-bold text-[0.72rem] leading-[1.2] text-white sm:text-sm">
              {record.valueLabel}
            </p>

            {/* DESCRIPTION */}
            <p className="mt-2 font-brown-regular text-[0.72rem] leading-[1.25] text-white/80 sm:text-sm sm:leading-[1.35]">
              {record.description}
            </p>

          </div>
        </div>

      </div>
    </article>
  );
}

/*
 * =========================================================
 * CATEGORY SELECTOR
 * =========================================================
 */

function RecordsSelector({
  activeTab,
  onChange,
}: {
  activeTab: 'songs' | 'artists';
  onChange: (tab: 'songs' | 'artists') => void;
}) {
  return (
    <div className="grid grid-cols-2">

      {/* SONGS */}
      <button
        type="button"
        onClick={() => onChange('songs')}
        className={`flex min-h-[3.25rem] items-center justify-center border-b-2 px-3 py-3 font-brown-bold text-[0.75rem] uppercase tracking-[0.18em] transition-colors sm:min-h-[4rem] sm:text-base ${
          activeTab === 'songs'
            ? 'border-black bg-black text-white'
            : 'border-black/10 bg-white text-black hover:bg-black/5'
        }`}
      >
        SONGS
      </button>

      {/* ARTISTS */}
      <button
        type="button"
        onClick={() => onChange('artists')}
        className={`flex min-h-[3.25rem] items-center justify-center border-b-2 px-3 py-3 font-brown-bold text-[0.75rem] uppercase tracking-[0.18em] transition-colors sm:min-h-[4rem] sm:text-base ${
          activeTab === 'artists'
            ? 'border-black bg-black text-white'
            : 'border-black/10 bg-white text-black hover:bg-black/5'
        }`}
      >
        ARTISTS
      </button>

    </div>
  );
}

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function RecordsPage({
  records,
}: RecordsPageProps) {
  const [activeTab, setActiveTab] =
    useState<'songs' | 'artists'>('songs');

  return (
    <section className="mx-auto max-w-[68rem] px-3 pb-20 sm:px-6">

      {/* =========================================
          PAGE TITLE
      ========================================== */}

      <div className="bg-white px-3 py-6 text-center sm:px-6 sm:py-10">
        <h1 className="font-brown-bold text-[3.8rem] uppercase leading-[0.85] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
          RECORDS
        </h1>
      </div>

      {/* =========================================
          SONGS / ARTISTS SELECTOR
      ========================================== */}

      <RecordsSelector
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* =========================================
          SONG RECORDS
      ========================================== */}

      {activeTab === 'songs' && (
        <section className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">

            {records.songs.map(
              (category) =>
                category.record ? (
                  <SongRecordCard
                    key={category.id}
                    record={category.record}
                    recordTitle={category.title}
                  />
                ) : null
            )}

          </div>

        </section>
      )}

      {/* =========================================
          ARTIST RECORDS
      ========================================== */}

      {activeTab === 'artists' && (
        <section className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">

            {records.artistRecords.map(
              (category) =>
                category.record ? (
                  <ArtistRecordCard
                    key={category.id}
                    record={category.record}
                    recordTitle={category.title}
                  />
                ) : null
            )}

          </div>

        </section>
      )}

      {/* =========================================
          HOME
      ========================================== */}

      <div className="mt-12 flex justify-center sm:mt-16">
        <a
          href="/"
          className="bg-black px-5 py-3 font-brown-regular text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:px-6 sm:py-3.5 sm:text-sm"
        >
          &lt; HOME
        </a>
      </div>

    </section>
  );
}