/* 80 Throws: geography. Distances on the globe, the map data decoder, and
 * "where did I land?" lookups (country, sea, nearest city). No DOM. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});

  const R = 6371; // Earth's radius, km
  const DEG = Math.PI / 180;
  const KM_PER_DEG = R * DEG; // about 111.2 km per degree of latitude

  function wrapLon(lon) {
    return ((((lon + 180) % 360) + 360) % 360) - 180;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * DEG;
    const dLon = (lon2 - lon1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  // Move by a displacement given in km east and km north. Fine for steps of a few km.
  function offset(lat, lon, eastKm, northKm) {
    const cosLat = Math.max(0.05, Math.cos(lat * DEG));
    return [lat + northKm / KM_PER_DEG, lon + eastKm / (KM_PER_DEG * cosLat)];
  }

  // Compass bearing (0 = north, 90 = east) as words.
  const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  function compass(bearingDeg) {
    return POINTS[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8];
  }

  // ---- TopoJSON (the map data format) ----

  function decodeArcs(topology) {
    const sx = topology.transform.scale[0];
    const sy = topology.transform.scale[1];
    const tx = topology.transform.translate[0];
    const ty = topology.transform.translate[1];
    return topology.arcs.map((arc) => {
      let x = 0;
      let y = 0;
      return arc.map((p) => {
        x += p[0];
        y += p[1];
        return [x * sx + tx, y * sy + ty];
      });
    });
  }

  function ringFrom(ids, arcs) {
    const pts = [];
    ids.forEach((id, k) => {
      const arc = id < 0 ? arcs[~id].slice().reverse() : arcs[id];
      for (let j = k === 0 ? 0 : 1; j < arc.length; j++) pts.push(arc[j]);
    });
    return pts;
  }

  // Rings that cross the date line jump from +180 to -180. Let their longitudes
  // keep counting instead, so each shape stays in one piece on a flat map. A
  // ring that crosses only once circles a pole, so close it along the pole.
  function unwrapRing(ring) {
    const out = [[ring[0][0], ring[0][1]]];
    let shift = 0;
    let jumps = 0;
    for (let i = 1; i < ring.length; i++) {
      const d = ring[i][0] - ring[i - 1][0];
      if (d > 180) {
        shift -= 360;
        jumps++;
      } else if (d < -180) {
        shift += 360;
        jumps++;
      }
      out.push([ring[i][0] + shift, ring[i][1]]);
    }
    if (jumps % 2 === 1) {
      const pole = out.reduce((sum, p) => sum + p[1], 0) > 0 ? 90 : -90;
      out.push([out[out.length - 1][0], pole], [out[0][0], pole]);
    }
    return out;
  }

  // Each polygon is [outerRing, ...holes]; each ring is [[lon, lat], ...].
  function polygonsOf(geom, arcs) {
    if (geom.type === 'Polygon') return [geom.arcs.map((r) => unwrapRing(ringFrom(r, arcs)))];
    if (geom.type === 'MultiPolygon') return geom.arcs.map((poly) => poly.map((r) => unwrapRing(ringFrom(r, arcs))));
    return [];
  }

  function ringArea(ring) {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    return a / 2;
  }

  function ringCentroid(ring) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f;
      cx += (ring[j][0] + ring[i][0]) * f;
      cy += (ring[j][1] + ring[i][1]) * f;
    }
    return [cx / (3 * a), cy / (3 * a)];
  }

  // Countries with decoded outlines, bounding boxes and a spot for their label.
  function buildWorld(data) {
    const arcs = decodeArcs(data.topology);
    const geoms = data.topology.objects.countries.geometries;
    const countries = geoms.map((g, i) => {
      const polys = polygonsOf(g, arcs);
      let minLon = 180;
      let minLat = 90;
      let maxLon = -180;
      let maxLat = -90;
      let biggest = null;
      let biggestArea = 0;
      polys.forEach((poly) => {
        poly[0].forEach((p) => {
          if (p[0] < minLon) minLon = p[0];
          if (p[0] > maxLon) maxLon = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[1] > maxLat) maxLat = p[1];
        });
        const area = Math.abs(ringArea(poly[0]));
        if (area > biggestArea) {
          biggestArea = area;
          biggest = poly[0];
        }
      });
      const info = data.countries[i];
      const label = info.label || (biggest ? ringCentroid(biggest) : [0, 0]);
      return { name: info.name, a2: info.a2, polys, bbox: [minLon, minLat, maxLon, maxLat], label };
    });
    const land = polygonsOf(data.topology.objects.land.geometries[0], arcs);
    return { countries, land, cities: data.cities || [] };
  }

  // ---- Lookups ----

  function inRing(ring, lon, lat) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function inPolygon(poly, lon, lat) {
    if (!inRing(poly[0], lon, lat)) return false;
    for (let h = 1; h < poly.length; h++) if (inRing(poly[h], lon, lat)) return false;
    return true;
  }

  // Index of the country at a point, or -1 for open water. Shapes that cross
  // the date line run past 180, so try the point a lap either side too.
  function countryAt(world, lat, lon) {
    const x0 = wrapLon(lon);
    for (let i = 0; i < world.countries.length; i++) {
      const c = world.countries[i];
      if (lat < c.bbox[1] || lat > c.bbox[3]) continue;
      for (let lap = -1; lap <= 1; lap++) {
        const x = x0 + lap * 360;
        if (x < c.bbox[0] || x > c.bbox[2]) continue;
        for (let p = 0; p < c.polys.length; p++) if (inPolygon(c.polys[p], x, lat)) return i;
      }
    }
    return -1;
  }

  // A rough name for the water at a point. Checked from small seas out to oceans.
  const SEAS = [
    ['Mediterranean Sea', 30, 46, -6, 36.5],
    ['Black Sea', 40.5, 47, 27, 42],
    ['Caspian Sea', 36.5, 47.5, 46.5, 55],
    ['Baltic Sea', 53, 66, 9, 30.5],
    ['North Sea', 51, 61.5, -4, 9],
    ['Red Sea', 12, 30, 32, 44],
    ['Persian Gulf', 23, 31, 47, 57],
    ['Sea of Okhotsk', 50, 63, 135, 163],
    ['Sea of Japan', 33, 52, 127, 142],
    ['Bering Sea', 51, 66, 162, 180],
    ['Bering Sea', 51, 66, -180, -157],
    ['Hudson Bay', 50, 65, -96, -76],
    ['Gulf of Mexico', 18, 31, -98, -81],
    ['Caribbean Sea', 9, 22, -88, -60],
    ['South China Sea', 0, 23, 99, 121],
    ['Bay of Bengal', 5, 23, 80, 95],
    ['Arabian Sea', 5, 26, 51, 77],
    ['Tasman Sea', -46, -28, 147, 175],
  ];

  function seaName(lat, lon) {
    const x = wrapLon(lon);
    if (lat > 66) return 'Arctic Ocean';
    if (lat < -58) return 'Southern Ocean';
    for (let i = 0; i < SEAS.length; i++) {
      const s = SEAS[i];
      if (lat >= s[1] && lat <= s[2] && x >= s[3] && x <= s[4]) return s[0];
    }
    const half = lat >= 0 ? 'North ' : 'South ';
    if ((x > -70 && x < 20) || (x <= -70 && x > -100 && lat > 15)) return half + 'Atlantic Ocean';
    if (x >= 20 && x < 147 && lat < 30 && !(x > 100 && lat > -10)) return 'Indian Ocean';
    return half + 'Pacific Ocean';
  }

  // Nearest listed city within maxKm, optionally only in one country. Cities are [name, lat, lon, countryIndex].
  function nearestCity(world, lat, lon, maxKm, countryIndex) {
    let best = null;
    let bestKm = maxKm;
    for (let i = 0; i < world.cities.length; i++) {
      const c = world.cities[i];
      if (countryIndex !== undefined && countryIndex >= 0 && c[3] !== countryIndex) continue;
      const d = distanceKm(lat, lon, c[1], c[2]);
      if (d <= bestKm) {
        best = c;
        bestKm = d;
      }
    }
    return best ? { name: best[0], km: bestKm } : null;
  }

  ET.geo = {
    R,
    DEG,
    KM_PER_DEG,
    wrapLon,
    distanceKm,
    offset,
    compass,
    decodeArcs,
    polygonsOf,
    ringCentroid,
    buildWorld,
    inPolygon,
    countryAt,
    seaName,
    nearestCity,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
