/* 80 Throws: the race. Everyone starts in London, like Phileas Fogg, and the
 * goal is to cross every line of longitude. Fogg keeps to the timetable from
 * Around the World in Eighty Days (1872) and never skips a day. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});

  const START = { place: 'London', lat: 51.507, lon: -0.128 };
  const DAYS = 80;

  // Longitudes keep counting east past 180, so the finish is 360 degrees on.
  const FOGG = [
    { day: 0, place: 'London', lat: 51.507, lon: -0.128 },
    { day: 7, place: 'Suez', lat: 29.97, lon: 32.55 },
    { day: 20, place: 'Bombay', lat: 18.94, lon: 72.84 },
    { day: 23, place: 'Calcutta', lat: 22.57, lon: 88.36 },
    { day: 36, place: 'Hong Kong', lat: 22.28, lon: 114.16 },
    { day: 42, place: 'Yokohama', lat: 35.44, lon: 139.64 },
    { day: 64, place: 'San Francisco', lat: 37.77, lon: 237.58 },
    { day: 71, place: 'New York', lat: 40.71, lon: 285.99 },
    { day: 80, place: 'London', lat: 51.507, lon: 359.872 },
  ];

  // Share of the way around the world, 0 to 1, in whichever direction you're going.
  function progress(lon) {
    return Math.min(1, Math.abs(lon - START.lon) / 360);
  }

  // Where Fogg is at the end of a given day (day 1 is the first day).
  function fogg(day) {
    const d = Math.max(0, Math.min(DAYS, day));
    let i = 0;
    while (i < FOGG.length - 2 && FOGG[i + 1].day <= d) i++;
    const a = FOGG[i];
    const b = FOGG[i + 1];
    const f = Math.min(1, (d - a.day) / (b.day - a.day));
    const lat = a.lat + (b.lat - a.lat) * f;
    const lon = a.lon + (b.lon - a.lon) * f;
    const place = f >= 1 ? b.place : f === 0 ? a.place : 'between ' + a.place + ' and ' + b.place;
    return { lat, lon, place, progress: progress(lon) };
  }

  // The (fractional) day Fogg reached a given share of the way around.
  function foggDayAt(share) {
    const target = START.lon + share * 360;
    if (target <= FOGG[0].lon) return 0;
    for (let i = 0; i < FOGG.length - 1; i++) {
      const a = FOGG[i];
      const b = FOGG[i + 1];
      if (target <= b.lon) return a.day + ((target - a.lon) / (b.lon - a.lon)) * (b.day - a.day);
    }
    return DAYS;
  }

  // Positive: you're that many days ahead of Fogg's pace.
  function daysAhead(share, day) {
    return foggDayAt(share) - day;
  }

  ET.race = { START, DAYS, FOGG, progress, fogg, foggDayAt, daysAhead };
})(typeof globalThis !== 'undefined' ? globalThis : this);
