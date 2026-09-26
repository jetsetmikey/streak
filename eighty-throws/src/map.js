/* 80 Throws: the map. A flat map that wraps around the world, centred on your
 * plane, drawn fresh each frame. Longitudes may be "unwrapped" (past 180). */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});
  const geo = ET.geo;
  const weather = ET.weather;

  const C = {
    sea: '#d6e6f5',
    grid: 'rgba(30, 79, 168, 0.09)',
    land: '#fdfdfb',
    visited: '#fbe0e3',
    border: 'rgba(20, 48, 107, 0.25)',
    coast: '#1c3f86',
    label: 'rgba(20, 48, 107, 0.5)',
    oceanLabel: 'rgba(30, 79, 168, 0.4)',
    ink: '#14306b',
    red: '#d7263d',
    blue: '#1e4fa8',
    amber: '#d98a00',
    wind: 'rgba(20, 48, 107, 0.34)',
    hat: '#23232a',
    edge: '#eef3fa',
  };
  const FONT = '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
  const OCEANS = [
    ['NORTH ATLANTIC', 38, -42], ['SOUTH ATLANTIC', -25, -15], ['NORTH PACIFIC', 32, -150], ['NORTH PACIFIC', 30, 170],
    ['SOUTH PACIFIC', -30, -125], ['INDIAN OCEAN', -22, 78], ['ARCTIC OCEAN', 80, 20], ['SOUTHERN OCEAN', -58, 60],
  ];
  const LOCAL_KM = 3000; // width of the close-up view
  const WORLD_LAT = 0; // centre of the whole-world view

  function createMap(canvas, world) {
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    let dpr = 1;
    const view = { lon: 0, lat: 50, zoom: 0 }; // zoom 0 = close-up, 1 = whole world
    let k = 1; // px per degree of latitude
    let kx = 1; // px per degree of longitude
    let clat = 0;

    function resize(w, h) {
      dpr = Math.min(3, root.devicePixelRatio || 1);
      W = Math.max(1, Math.floor(w));
      H = Math.max(1, Math.floor(h));
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }

    function updateScales() {
      const kLocal = W / (LOCAL_KM / geo.KM_PER_DEG);
      const kWorld = Math.min(W / 360, H / 140);
      const z = view.zoom;
      k = Math.exp(Math.log(kLocal) + (Math.log(kWorld) - Math.log(kLocal)) * z);
      const cosLat = Math.cos(view.lat * geo.DEG);
      kx = k * (cosLat + (1 - cosLat) * z);
      clat = view.lat + (WORLD_LAT - view.lat) * z;
    }

    function project(lat, lon) {
      return [W / 2 + (lon - view.lon) * kx, H / 2 - (lat - clat) * k];
    }

    function unproject(x, y) {
      return [clat - (y - H / 2) / k, view.lon + (x - W / 2) / kx];
    }

    // Longitude offsets (multiples of 360) at which a span [a, b] shows on screen.
    function copiesOf(a, b) {
      const lo = view.lon - W / 2 / kx;
      const hi = view.lon + W / 2 / kx;
      const out = [];
      for (let m = Math.floor((lo - b) / 360); m <= Math.ceil((hi - a) / 360); m++) {
        const o = m * 360;
        if (b + o >= lo && a + o <= hi) out.push(o);
      }
      return out;
    }

    function latVisible(a, b) {
      const top = clat + H / 2 / k;
      const bottom = clat - H / 2 / k;
      return b >= bottom && a <= top;
    }

    function traceRings(rings, o) {
      rings.forEach((ring) => {
        for (let i = 0; i < ring.length; i++) {
          const x = W / 2 + (ring[i][0] + o - view.lon) * kx;
          const y = H / 2 - (ring[i][1] - clat) * k;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      });
    }

    function drawGrid() {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = view.zoom > 0.5 ? 30 : 10;
      const [top, left] = unproject(0, 0);
      const [bottom, right] = unproject(W, H);
      const y0 = Math.max(0, project(90, 0)[1]);
      const y1 = Math.min(H, project(-90, 0)[1]);
      for (let lon = Math.ceil(left / step) * step; lon <= right; lon += step) {
        const x = project(0, lon)[0];
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let lat = Math.max(-90, Math.ceil(bottom / step) * step); lat <= Math.min(90, top); lat += step) {
        const y = project(lat, 0)[1];
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
    }

    function drawLand(visited) {
      world.countries.forEach((c, i) => {
        if (!latVisible(c.bbox[1], c.bbox[3])) return;
        copiesOf(c.bbox[0], c.bbox[2]).forEach((o) => {
          ctx.beginPath();
          c.polys.forEach((poly) => traceRings(poly, o));
          ctx.fillStyle = visited && visited.has(i) ? C.visited : C.land;
          ctx.fill('evenodd');
          ctx.strokeStyle = C.border;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });
      });
      ctx.strokeStyle = C.coast;
      ctx.lineWidth = 1.3;
      ctx.lineJoin = 'round';
      copiesOf(-180, 180).forEach((o) => {
        ctx.beginPath();
        world.land.forEach((poly) => traceRings(poly, o));
        ctx.stroke();
      });
    }

    function drawLabels() {
      const placed = [];
      ctx.font = '600 10.5px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fits = (x, y, w, h) => {
        if (x - w / 2 < 4 || x + w / 2 > W - 4 || y - h / 2 < 4 || y + h / 2 > H - 4) return false;
        for (const r of placed) if (Math.abs(r[0] - x) < (r[2] + w) / 2 && Math.abs(r[1] - y) < (r[3] + h) / 2) return false;
        placed.push([x, y, w, h]);
        return true;
      };
      ctx.fillStyle = C.oceanLabel;
      ctx.font = 'italic 600 11px ' + FONT;
      OCEANS.forEach(([name, lat, lon]) => {
        copiesOf(lon, lon).forEach((o) => {
          const p = project(lat, lon + o);
          if (fits(p[0], p[1], ctx.measureText(name).width + 8, 16)) ctx.fillText(name, p[0], p[1]);
        });
      });
      ctx.fillStyle = C.label;
      ctx.font = '600 10.5px ' + FONT;
      world.countries
        .map((c) => ({ c, w: (c.bbox[2] - c.bbox[0]) * kx }))
        .filter((e) => e.w > 64)
        .sort((a, b) => b.w - a.w)
        .forEach(({ c }) => {
          const name = c.name.toUpperCase();
          copiesOf(c.label[0], c.label[0]).forEach((o) => {
            const p = project(c.label[1], c.label[0] + o);
            if (fits(p[0], p[1], ctx.measureText(name).width + 10, 16)) ctx.fillText(name, p[0], p[1]);
          });
        });
    }

    function drawWind(seed) {
      if (view.zoom > 0.4) return;
      const alpha = 1 - view.zoom / 0.4;
      const S = 62;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = C.wind;
      ctx.fillStyle = C.wind;
      ctx.lineWidth = 1.4;
      for (let y = S / 2; y < H; y += S) {
        for (let x = S / 2; x < W; x += S) {
          const [lat, lon] = unproject(x, y);
          if (lat > 80 || lat < -70) continue;
          const w = weather.windAt(lat, lon, seed);
          const dx = (w[0] / geo.KM_PER_DEG) * k;
          const dy = (-w[1] / geo.KM_PER_DEG) * k;
          const len = Math.hypot(dx, dy);
          if (len < 3) continue;
          const f = Math.min(1, (S * 0.7) / len);
          const ex = x + dx * f * 0.5;
          const ey = y + dy * f * 0.5;
          const sx = x - dx * f * 0.5;
          const sy = y - dy * f * 0.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          const a = Math.atan2(ey - sy, ex - sx);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 6 * Math.cos(a - 0.45), ey - 6 * Math.sin(a - 0.45));
          ctx.lineTo(ex - 6 * Math.cos(a + 0.45), ey - 6 * Math.sin(a + 0.45));
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function polyline(path, o) {
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const p = project(path[i][0], path[i][1] + o);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
    }

    function spanOf(path) {
      let a = Infinity;
      let b = -Infinity;
      path.forEach((p) => {
        if (p[1] < a) a = p[1];
        if (p[1] > b) b = p[1];
      });
      return [a, b];
    }

    function drawFogg(fogg) {
      if (!fogg) return;
      const route = ET.race.FOGG.map((f) => [f.lat, f.lon]);
      const span = spanOf(route);
      ctx.save();
      ctx.strokeStyle = 'rgba(35, 35, 42, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([1.5, 5]);
      ctx.lineCap = 'round';
      copiesOf(span[0], span[1]).forEach((o) => {
        polyline(route, o);
        ctx.stroke();
      });
      ctx.restore();
      copiesOf(fogg.lon, fogg.lon).forEach((o) => {
        const p = project(fogg.lat, fogg.lon + o);
        drawHat(p[0], p[1]);
      });
    }

    function drawHat(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = C.hat;
      ctx.beginPath();
      ctx.ellipse(0, 1, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6.5, -13, 13, 14);
      ctx.fillStyle = C.red;
      ctx.fillRect(-6.5, -3.5, 13, 3);
      ctx.fillStyle = C.hat;
      ctx.font = '600 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText('Fogg', 0, 7);
      ctx.fillText('Fogg', 0, 7);
      ctx.restore();
    }

    function drawRoute(route, landings, current) {
      ctx.save();
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.setLineDash([7, 5]);
      const all = current ? route.concat([current]) : route;
      all.forEach((path) => {
        if (path.length < 2) return;
        const span = spanOf(path);
        copiesOf(span[0], span[1]).forEach((o) => {
          polyline(path, o);
          ctx.stroke();
        });
      });
      ctx.setLineDash([]);
      landings.forEach((l) => {
        copiesOf(l[1], l[1]).forEach((o) => {
          const p = project(l[0], l[1] + o);
          ctx.beginPath();
          ctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2);
          ctx.fillStyle = C.red;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        });
      });
      ctx.restore();
    }

    function drawStart(start) {
      copiesOf(start.lon, start.lon).forEach((o) => {
        const p = project(start.lat, start.lon + o);
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0], p[1] - 18);
        ctx.stroke();
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1] - 18);
        ctx.lineTo(p[0] + 11, p[1] - 14.5);
        ctx.lineTo(p[0], p[1] - 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }

    function drawAim(aim) {
      if (!aim) return;
      const risk = Math.round(aim.risk * 100);
      const color = risk > 15 ? C.red : risk > 0 ? C.amber : C.blue;
      const end = aim.path[aim.path.length - 1];
      const span = spanOf(aim.path);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.setLineDash([0.5, 6]);
      copiesOf(span[0], span[1]).forEach((o) => {
        polyline(aim.path, o);
        ctx.stroke();
        const p = project(end[0], end[1] + o);
        const r = (aim.spreadKm / geo.KM_PER_DEG) * k;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(6, r), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.setLineDash([0.5, 6]);
        ctx.lineWidth = 2.5;
      });
      ctx.restore();
    }

    function drawPlane(plane, time) {
      const p = project(plane.lat, plane.lon);
      const a = (plane.heading - 90) * geo.DEG;
      const alt = plane.alt || 0;
      if (plane.idle) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 380);
        ctx.strokeStyle = 'rgba(215, 38, 61, ' + (0.25 + 0.3 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 20 + 6 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      const shape = (c) => {
        c.beginPath();
        c.moveTo(15, 0);
        c.lineTo(-10, -9);
        c.lineTo(-5, 0);
        c.lineTo(-10, 9);
        c.closePath();
      };
      ctx.save();
      ctx.translate(p[0] + 4 + alt * 10, p[1] + 5 + alt * 16);
      ctx.rotate(a);
      shape(ctx);
      ctx.fillStyle = 'rgba(20, 48, 107, ' + (0.22 - alt * 0.1).toFixed(3) + ')';
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(a);
      const s = 1 + alt * 0.25;
      ctx.scale(s, s);
      shape(ctx);
      ctx.fillStyle = plane.soggy ? '#e4eef9' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-5, 0);
      ctx.stroke();
      ctx.restore();
    }

    function draw(s) {
      updateScales();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.sea;
      ctx.fillRect(0, 0, W, H);
      // Beyond the poles there is no map; frame it off like the page around it.
      const north = project(90, view.lon)[1];
      const south = project(-90, view.lon)[1];
      ctx.fillStyle = C.edge;
      if (north > 0) ctx.fillRect(0, 0, W, north);
      if (south < H) ctx.fillRect(0, south, W, H - south);
      drawGrid();
      drawLand(s.visited);
      drawLabels();
      if (s.showWind) drawWind(s.seed);
      drawFogg(s.fogg);
      drawStart(s.start);
      drawRoute(s.route, s.landings, s.current);
      drawAim(s.aim);
      drawPlane(s.plane, s.time || 0);
    }

    return {
      view,
      resize,
      draw,
      project,
      unproject,
      get width() {
        return W;
      },
      get height() {
        return H;
      },
    };
  }

  ET.createMap = createMap;
})(typeof globalThis !== 'undefined' ? globalThis : this);
