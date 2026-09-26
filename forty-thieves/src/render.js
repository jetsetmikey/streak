/* Forty Thieves: draws the blueprint and everything moving on it.
 * Most drawing happens in tile units; text is drawn in pixel space. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});
  const TILE = FT.TILE;
  const sim = FT.sim;

  const C = {
    paper: '#0d2b4e',
    floor: '#10345c',
    street: '#0a2039',
    grid: 'rgba(170, 205, 240, 0.07)',
    gridMajor: 'rgba(170, 205, 240, 0.14)',
    wall: '#1c4a7b',
    hatch: 'rgba(207, 227, 247, 0.13)',
    edge: '#d4e6f8',
    counter: '#255a91',
    chalk: '#e8f1fa',
    chalkSoft: 'rgba(232, 241, 250, 0.6)',
    chalkFaint: 'rgba(232, 241, 250, 0.25)',
    ink: '#0b2340',
    you: '#c8f560',
    guard: '#ff9a52',
    guardDown: '#8093a8',
    cone: 'rgba(255, 199, 99, 0.15)',
    coneEdge: 'rgba(255, 199, 99, 0.5)',
    camCone: 'rgba(255, 93, 108, 0.14)',
    camEdge: 'rgba(255, 93, 108, 0.5)',
    laser: '#ff4d5e',
    gold: '#ffc94a',
    goldDeep: '#c98f16',
    steel: '#9fb6cc',
    cyan: '#5fd4ff',
    danger: '#ff5d6c',
  };
  const FONT_UI = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const FONT_HAND = '"Architects Daughter", "Comic Sans MS", cursive';
  const FONT_DISPLAY = '"Big Shoulders Stencil Display", Impact, "Arial Narrow", sans-serif';
  const EFFECT_TICKS = 80;

  function createRenderer(canvas, level) {
    const ctx = canvas.getContext('2d');
    const layer = document.createElement('canvas');
    const lctx = layer.getContext('2d');
    const reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let tile = 0;
    let dpr = 1;
    let dirty = true;

    const px = (n) => n / tile;
    const tileSpace = (c) => c.setTransform(dpr * tile, 0, 0, dpr * tile, 0, 0);
    const pixelSpace = (c) => c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const isWall = (x, y) => {
      const k = sim.tileAt(level, x, y);
      return k === TILE.WALL;
    };

    function resize(availW, availH) {
      const t = Math.max(8, Math.floor(Math.min(availW / level.cols, availH / level.rows)));
      const d = Math.min(3, root.devicePixelRatio || 1);
      if (t === tile && d === dpr) return;
      tile = t;
      dpr = d;
      const w = level.cols * tile;
      const h = level.rows * tile;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      layer.width = canvas.width;
      layer.height = canvas.height;
      dirty = true;
    }

    function text(c, str, x, y, size, opts) {
      const o = opts || {};
      c.save();
      pixelSpace(c);
      c.font = (o.weight || 400) + ' ' + Math.max(7, size * tile).toFixed(1) + 'px ' + (o.font || FONT_UI);
      c.textAlign = o.align || 'center';
      c.textBaseline = o.baseline || 'middle';
      c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      if (o.outline) {
        c.lineWidth = Math.max(2, tile * 0.12);
        c.strokeStyle = o.outline;
        c.lineJoin = 'round';
      }
      c.fillStyle = o.color || C.chalk;
      const max = o.maxWidth ? o.maxWidth * tile : undefined;
      if (o.outline) c.strokeText(str, x * tile, y * tile, max);
      c.fillText(str, x * tile, y * tile, max);
      c.restore();
    }

    // ---- The sheet: everything that never moves ----

    function drawStatic() {
      const c = lctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, layer.width, layer.height);
      tileSpace(c);
      c.fillStyle = C.paper;
      c.fillRect(0, 0, level.cols, level.rows);

      for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
          const k = sim.tileAt(level, x, y);
          if (k === TILE.STREET || k === TILE.VAN) c.fillStyle = C.street;
          else if (k === TILE.WALL) c.fillStyle = C.wall;
          else if (k === TILE.COUNTER) c.fillStyle = C.counter;
          else c.fillStyle = C.floor;
          c.fillRect(x, y, 1, 1);
        }
      }

      c.lineWidth = px(1);
      for (let x = 0; x <= level.cols; x++) {
        c.strokeStyle = x % 5 === 0 ? C.gridMajor : C.grid;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, level.rows);
        c.stroke();
      }
      for (let y = 0; y <= level.rows; y++) {
        c.strokeStyle = y % 5 === 0 ? C.gridMajor : C.grid;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(level.cols, y);
        c.stroke();
      }

      // Section hatching inside walls, like a cut through a drawing.
      c.strokeStyle = C.hatch;
      c.lineWidth = px(1);
      c.beginPath();
      for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
          if (!isWall(x, y)) continue;
          for (let k = 1; k <= 3; k++) {
            const f = k / 3;
            c.moveTo(x, y + f);
            c.lineTo(x + f, y);
            if (k < 3) {
              c.moveTo(x + f, y + 1);
              c.lineTo(x + 1, y + f);
            }
          }
        }
      }
      c.stroke();

      // Wall outlines where a wall meets anything else.
      c.strokeStyle = C.edge;
      c.lineWidth = px(1.6);
      c.lineCap = 'square';
      c.beginPath();
      for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
          if (!isWall(x, y)) continue;
          if (!isWall(x, y - 1)) { c.moveTo(x, y); c.lineTo(x + 1, y); }
          if (!isWall(x, y + 1)) { c.moveTo(x, y + 1); c.lineTo(x + 1, y + 1); }
          if (!isWall(x - 1, y)) { c.moveTo(x, y); c.lineTo(x, y + 1); }
          if (!isWall(x + 1, y)) { c.moveTo(x + 1, y); c.lineTo(x + 1, y + 1); }
        }
      }
      c.stroke();

      // Teller counter.
      c.strokeStyle = C.chalkSoft;
      c.lineWidth = px(1);
      for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
          if (sim.tileAt(level, x, y) === TILE.COUNTER) c.strokeRect(x + 0.08, y + 0.22, 0.84, 0.56);
        }
      }

      drawVan(c);
      drawTitleBlock(c);

      // Laser emitters on the walls.
      c.fillStyle = C.steel;
      level.lasers.forEach((l) => {
        c.fillRect(l.x1 - 0.09, l.y1 - 0.09, 0.18, 0.18);
        c.fillRect(l.x2 - 0.09, l.y2 - 0.09, 0.18, 0.18);
      });

      // Camera housings.
      level.cameras.forEach((cam) => {
        c.fillStyle = C.steel;
        c.beginPath();
        c.arc(cam.x, cam.y, 0.2, 0, Math.PI * 2);
        c.fill();
      });

      // Lever plate.
      if (level.lever) {
        c.fillStyle = C.ink;
        c.strokeStyle = C.chalkSoft;
        c.lineWidth = px(1);
        c.fillRect(level.lever.x - 0.32, level.lever.y - 0.32, 0.64, 0.64);
        c.strokeRect(level.lever.x - 0.32, level.lever.y - 0.32, 0.64, 0.64);
      }

      level.labels.forEach((lb) => text(c, lb.text, lb.x, lb.y, 0.5, { font: FONT_HAND, color: C.chalkSoft }));
      text(c, 'power lever', level.lever.x - 0.6, level.lever.y + 1.35, 0.4, { font: FONT_HAND, color: C.chalkFaint });
      text(c, 'both plates at once', 10, 8.62, 0.4, { font: FONT_HAND, color: C.chalkFaint });
    }

    function drawVan(c) {
      if (!level.van.length) return;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      level.van.forEach((v) => {
        x0 = Math.min(x0, v.x);
        y0 = Math.min(y0, v.y);
        x1 = Math.max(x1, v.x + 1);
        y1 = Math.max(y1, v.y + 1);
      });
      const r = 0.35;
      c.fillStyle = '#12314f';
      c.strokeStyle = C.chalk;
      c.lineWidth = px(1.6);
      c.beginPath();
      c.moveTo(x0 + 0.12 + r, y0 + 0.08);
      c.arcTo(x1 - 0.12, y0 + 0.08, x1 - 0.12, y1 - 0.1, r);
      c.arcTo(x1 - 0.12, y1 - 0.1, x0 + 0.12, y1 - 0.1, r);
      c.arcTo(x0 + 0.12, y1 - 0.1, x0 + 0.12, y0 + 0.08, r);
      c.arcTo(x0 + 0.12, y0 + 0.08, x1 - 0.12, y0 + 0.08, r);
      c.closePath();
      c.fill();
      c.stroke();
      // Open rear doors facing the bank.
      c.strokeStyle = C.chalkSoft;
      c.beginPath();
      c.moveTo(x0 + 0.5, y0 + 0.08);
      c.lineTo(x0 + 0.1, y0 - 0.45);
      c.moveTo(x1 - 0.5, y0 + 0.08);
      c.lineTo(x1 - 0.1, y0 - 0.45);
      c.stroke();
      text(c, 'VAN', (x0 + x1) / 2, (y0 + y1) / 2 + 0.05, 0.72, { font: FONT_DISPLAY, weight: 800, color: C.chalk });
      text(c, 'drop loot here →', x0 - 2.4, (y0 + y1) / 2, 0.42, { font: FONT_HAND, color: C.chalkSoft });
    }

    function drawTitleBlock(c) {
      const x0 = 12.45;
      const y0 = 19.3;
      const x1 = level.cols - 0.25;
      const y1 = level.rows - 0.25;
      c.strokeStyle = C.chalkSoft;
      c.lineWidth = px(1);
      c.strokeRect(x0, y0, x1 - x0, y1 - y0);
      c.beginPath();
      c.moveTo(x0, y0 + 1.25);
      c.lineTo(x1, y0 + 1.25);
      c.stroke();
      const inner = x1 - x0 - 0.4;
      text(c, level.name.toUpperCase(), (x0 + x1) / 2, y0 + 0.66, 0.62, { font: FONT_DISPLAY, weight: 800, color: C.chalk, maxWidth: inner });
      if (tile >= 18) {
        text(c, 'HEIST PLAN · SHEET 1 OF 1', (x0 + x1) / 2, y0 + 1.72, 0.3, { color: C.chalkSoft, maxWidth: inner });
        text(c, 'SCALE 1:100 · DRAWN BY THE CREW', (x0 + x1) / 2, y0 + 2.15, 0.26, { color: C.chalkFaint, maxWidth: inner });
      }
      // North arrow.
      c.strokeStyle = C.chalkSoft;
      c.fillStyle = C.chalkSoft;
      c.beginPath();
      c.moveTo(1.3, 21.5);
      c.lineTo(1.3, 19.9);
      c.stroke();
      c.beginPath();
      c.moveTo(1.3, 19.6);
      c.lineTo(1.05, 20.1);
      c.lineTo(1.55, 20.1);
      c.closePath();
      c.fill();
      text(c, 'N', 1.85, 19.85, 0.38, { weight: 600, color: C.chalkSoft });
    }

    // ---- Things that change ----

    function doorAcross(d) {
      // A door with walls above and below is walked through east-west.
      const t0 = d.tiles[0];
      return isWall(t0.x, t0.y - 1) && isWall(t0.x, t0.y + 1);
    }

    function drawPlatesAndDoors(world) {
      level.plates.forEach((p, i) => {
        const on = world.plates[i];
        ctx.lineWidth = px(1.5);
        ctx.strokeStyle = C.cyan;
        ctx.setLineDash(on ? [] : [px(3), px(3)]);
        if (on) {
          ctx.fillStyle = 'rgba(95, 212, 255, 0.35)';
          ctx.fillRect(p.x + 0.14, p.y + 0.14, 0.72, 0.72);
        }
        ctx.strokeRect(p.x + 0.14, p.y + 0.14, 0.72, 0.72);
        ctx.setLineDash([]);
        text(ctx, level.doors[p.door].letter, p.x + 0.5, p.y + 0.52, 0.36, { weight: 600, color: C.cyan });
      });

      level.doors.forEach((d, i) => {
        const st = world.doors[i];
        const across = doorAcross(d);
        d.tiles.forEach((tl) => {
          if (st.open) {
            ctx.strokeStyle = C.chalkFaint;
            ctx.lineWidth = px(1);
            ctx.setLineDash([px(2), px(3)]);
            ctx.beginPath();
            if (across) {
              ctx.moveTo(tl.x + 0.5, tl.y);
              ctx.lineTo(tl.x + 0.5, tl.y + 1);
            } else {
              ctx.moveTo(tl.x, tl.y + 0.5);
              ctx.lineTo(tl.x + 1, tl.y + 0.5);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.fillStyle = d.latch ? C.steel : C.chalk;
            if (across) ctx.fillRect(tl.x + 0.34, tl.y, 0.32, 1);
            else ctx.fillRect(tl.x, tl.y + 0.34, 1, 0.32);
          }
        });
        const first = d.tiles[0];
        const last = d.tiles[d.tiles.length - 1];
        const cx = (first.x + last.x + 1) / 2;
        const cy = (first.y + last.y + 1) / 2;
        if (!st.open && d.latch) {
          // The vault wheel.
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = px(1.5);
          ctx.beginPath();
          ctx.arc(cx, cy, 0.26, 0, Math.PI * 2);
          ctx.moveTo(cx - 0.26, cy);
          ctx.lineTo(cx + 0.26, cy);
          ctx.moveTo(cx, cy - 0.26);
          ctx.lineTo(cx, cy + 0.26);
          ctx.stroke();
        } else if (!st.open) {
          text(ctx, d.letter, cx, cy + 0.02, 0.3, { weight: 600, color: C.ink });
        }
      });
    }

    function drawLasers(world, powered, t) {
      const flicker = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t / 45);
      ctx.save();
      level.lasers.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        if (powered) {
          ctx.globalAlpha = flicker;
          ctx.strokeStyle = C.laser;
          ctx.lineWidth = px(2);
          ctx.shadowColor = C.laser;
          ctx.shadowBlur = 8;
          ctx.setLineDash([]);
        } else {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = C.laser;
          ctx.lineWidth = px(1);
          ctx.shadowBlur = 0;
          ctx.setLineDash([px(2), px(4)]);
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawLever(powered) {
      const lv = level.lever;
      if (!lv) return;
      ctx.strokeStyle = C.chalk;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      ctx.moveTo(lv.x, lv.y);
      const hy = powered ? lv.y - 0.26 : lv.y + 0.26;
      ctx.lineTo(lv.x + 0.14, hy);
      ctx.stroke();
      ctx.fillStyle = powered ? C.danger : C.cyan;
      ctx.beginPath();
      ctx.arc(lv.x + 0.14, hy, 0.11, 0, Math.PI * 2);
      ctx.fill();
    }

    function lootIcon(kind, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.lineWidth = px(1.2) / s;
      ctx.strokeStyle = C.ink;
      if (kind === 'cash') {
        ctx.fillStyle = C.gold;
        ctx.fillRect(-0.34, -0.2, 0.68, 0.4);
        ctx.strokeRect(-0.34, -0.2, 0.68, 0.4);
        ctx.fillStyle = C.goldDeep;
        ctx.beginPath();
        ctx.arc(0, 0, 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'box') {
        ctx.fillStyle = C.steel;
        ctx.fillRect(-0.3, -0.26, 0.6, 0.52);
        ctx.strokeRect(-0.3, -0.26, 0.6, 0.52);
        ctx.fillStyle = C.gold;
        ctx.fillRect(-0.08, -0.06, 0.16, 0.12);
        ctx.beginPath();
        ctx.moveTo(-0.3, -0.12);
        ctx.lineTo(0.3, -0.12);
        ctx.stroke();
      } else if (kind === 'painting') {
        ctx.fillStyle = C.ink;
        ctx.fillRect(-0.36, -0.28, 0.72, 0.56);
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = px(2) / s;
        ctx.strokeRect(-0.36, -0.28, 0.72, 0.56);
        ctx.fillStyle = C.cyan;
        ctx.beginPath();
        ctx.moveTo(-0.26, 0.18);
        ctx.lineTo(-0.06, -0.1);
        ctx.lineTo(0.06, 0.04);
        ctx.lineTo(0.14, -0.04);
        ctx.lineTo(0.26, 0.18);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'gold') {
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.moveTo(-0.36, 0.18);
        ctx.lineTo(-0.22, -0.16);
        ctx.lineTo(0.22, -0.16);
        ctx.lineTo(0.36, 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#fff3c4';
        ctx.beginPath();
        ctx.moveTo(-0.16, -0.08);
        ctx.lineTo(0.12, -0.08);
        ctx.stroke();
      } else if (kind === 'diamond') {
        ctx.fillStyle = '#dff7ff';
        ctx.beginPath();
        ctx.moveTo(0, -0.36);
        ctx.lineTo(0.3, -0.06);
        ctx.lineTo(0, 0.36);
        ctx.lineTo(-0.3, -0.06);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C.cyan;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-0.3, -0.06);
        ctx.lineTo(0.3, -0.06);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLoot(world) {
      world.loot.forEach((l, n) => {
        if (l.banked || l.holder >= 0) return;
        ctx.fillStyle = 'rgba(255, 201, 74, 0.12)';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 0.42, 0, Math.PI * 2);
        ctx.fill();
        lootIcon(level.loot[n].kind, l.x, l.y, 0.9);
      });
    }

    function march(world, ox, oy, dx, dy, range) {
      for (let r = 0.05; r < range; r += 0.08) {
        if (sim.blocked(world, level, Math.floor(ox + dx * r), Math.floor(oy + dy * r))) return r;
      }
      return range;
    }

    function drawCone(world, ox, oy, fx, fy, range, cosHalf, fill, edge) {
      const a0 = Math.atan2(fy, fx);
      const half = Math.acos(cosHalf);
      const n = 30;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      for (let i = 0; i <= n; i++) {
        const a = a0 - half + (2 * half * i) / n;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const r = march(world, ox, oy, dx, dy, range);
        ctx.lineTo(ox + dx * r, oy + dy * r);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = px(1);
      ctx.strokeStyle = edge;
      ctx.stroke();
    }

    function drawCones(world, powered) {
      if (powered) {
        level.cameras.forEach((cam, k) => {
          const f = world.cams[k];
          drawCone(world, cam.x, cam.y, f.fx, f.fy, cam.range, sim.CAM_COS, C.camCone, C.camEdge);
        });
      }
      world.guards.forEach((g) => {
        if (g.down > world.tick) return;
        drawCone(world, g.x, g.y, g.fx, g.fy, sim.GUARD_RANGE, sim.GUARD_COS, C.cone, C.coneEdge);
      });
    }

    function drawCameras(world, powered) {
      level.cameras.forEach((cam, k) => {
        const f = world.cams[k];
        ctx.strokeStyle = powered ? C.danger : C.guardDown;
        ctx.lineWidth = px(3);
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.lineTo(cam.x + f.fx * 0.34, cam.y + f.fy * 0.34);
        ctx.stroke();
      });
    }

    function drawGuards(world) {
      world.guards.forEach((g) => {
        const down = g.down > world.tick;
        ctx.fillStyle = down ? C.guardDown : C.guard;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.arc(g.x, g.y, 0.33, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (down) {
          const left = (g.down - world.tick) / sim.KO_TICKS;
          ctx.strokeStyle = C.chalk;
          ctx.lineWidth = px(2);
          ctx.beginPath();
          ctx.arc(g.x, g.y, 0.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
          ctx.stroke();
          text(ctx, 'z', g.x + 0.42, g.y - 0.42, 0.42, { weight: 600, color: C.chalk });
        } else {
          // Nose: which way he's looking.
          ctx.fillStyle = C.ink;
          ctx.beginPath();
          ctx.arc(g.x + g.fx * 0.18, g.y + g.fy * 0.18, 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    function drawThieves(world, o, t) {
      const showNumbers = tile >= 15;
      // Past selves first, you on top.
      const order = world.thieves.map((th, i) => i);
      order.sort((a, b) => (world.thieves[a].day === o.youDay) - (world.thieves[b].day === o.youDay));
      order.forEach((i) => {
        const th = world.thieves[i];
        const you = th.day === o.youDay;
        if (th.caught) {
          ctx.strokeStyle = you ? C.you : C.danger;
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = px(2.5);
          ctx.beginPath();
          ctx.moveTo(th.x - 0.2, th.y - 0.2);
          ctx.lineTo(th.x + 0.2, th.y + 0.2);
          ctx.moveTo(th.x + 0.2, th.y - 0.2);
          ctx.lineTo(th.x - 0.2, th.y + 0.2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          return;
        }
        if (you) {
          const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t / 160);
          ctx.strokeStyle = C.you;
          ctx.globalAlpha = 0.35 + 0.4 * pulse;
          ctx.lineWidth = px(2);
          ctx.beginPath();
          ctx.arc(th.x, th.y, 0.46 + 0.1 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = you ? C.you : C.chalk;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.arc(th.x, th.y, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (showNumbers) text(ctx, String(th.day), th.x, th.y + 0.03, th.day > 9 ? 0.3 : 0.36, { weight: 600, color: C.ink });
        if (th.carry >= 0) lootIcon(level.loot[th.carry].kind, th.x + 0.26, th.y - 0.34, 0.55);
      });

      if (o.ghost) {
        ctx.strokeStyle = C.you;
        ctx.lineWidth = px(1.5);
        ctx.setLineDash([px(3), px(3)]);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(o.ghost.x, o.ghost.y, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        text(ctx, 'ghost', o.ghost.x, o.ghost.y - 0.6, 0.36, { font: FONT_HAND, color: C.you });
      }
    }

    function drawPaths(world, o) {
      ctx.lineWidth = px(1.5);
      ctx.lineJoin = 'round';
      o.paths.forEach((pts, i) => {
        if (pts.length < 4) return;
        const you = world.thieves[i] && world.thieves[i].day === o.youDay;
        ctx.strokeStyle = you ? 'rgba(200, 245, 96, 0.55)' : 'rgba(232, 241, 250, 0.22)';
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.stroke();
      });
    }

    const EFFECT_TEXT = {
      bank: (e) => ['+' + FT.timeline.money(e.value), C.gold],
      caught: () => ['CAUGHT', C.danger],
      ko: () => ['KO', C.guard],
      power: () => ['POWER OFF', C.cyan],
      alarm: () => ['ALARM', C.danger],
      vault: () => ['VAULT OPEN', C.chalk],
      police: () => ['POLICE', C.danger],
    };

    function drawEffects(world, o) {
      const now = world.tick;
      for (let n = world.events.length - 1; n >= 0; n--) {
        const e = world.events[n];
        const age = now - e.t;
        if (age > EFFECT_TICKS) break;
        let label = null;
        if (e.type === 'pick' && e.day === o.youDay) label = [level.loot[e.loot].name, C.gold];
        else if (EFFECT_TEXT[e.type]) label = EFFECT_TEXT[e.type](e);
        if (!label) continue;
        const f = age / EFFECT_TICKS;
        text(ctx, label[0], e.x, e.y - 0.7 - f * 0.8, e.type === 'police' ? 0.9 : 0.5, {
          font: FONT_DISPLAY,
          weight: 800,
          color: label[1],
          outline: C.ink,
          alpha: 1 - f * f,
        });
      }
    }

    function drawAlarm(t) {
      const pulse = reduceMotion ? 0.6 : 0.45 + 0.35 * Math.abs(Math.sin(t / 220));
      const w = level.cols;
      const h = level.rows;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(255, 77, 94, 0)');
      g.addColorStop(1, 'rgba(255, 77, 94, ' + (0.45 * pulse).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function draw(world, opts) {
      if (!tile) return;
      const o = opts || {};
      const t = o.time || 0;
      if (dirty) {
        drawStatic();
        dirty = false;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer, 0, 0);
      tileSpace(ctx);
      const powered = sim.isPowered(world);
      drawPlatesAndDoors(world);
      drawLasers(world, powered, t);
      drawLever(powered);
      drawLoot(world);
      if (o.paths) drawPaths(world, o);
      drawCones(world, powered);
      drawCameras(world, powered);
      drawGuards(world);
      drawThieves(world, o, t);
      drawEffects(world, o);
      if (world.alarmAt >= 0) drawAlarm(t);
    }

    return {
      resize,
      draw,
      invalidate() {
        dirty = true;
      },
      get tile() {
        return tile;
      },
    };
  }

  FT.createRenderer = createRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
