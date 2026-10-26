// Thuật toán A* có trọng số trên đồ thị trạng thái (ga, tuyến đang đi).
// Module thuần: không đụng tới DOM/Leaflet, nhận tập đoạn bị chặn qua tham số.

import { FASTEST_SPEED_KMH, DEFAULT_TRANSFER_MINS, transferPenaltyMins } from '../data/lines.js';
import { routeModeOrder } from '../data/route-modes.js';
import { haversine } from './geo.js';
import { adjacency, stationById } from './graph.js';
import { roundedMinutes } from './utils.js';
import {
  getRouteMode,
  getRouteSuggestions,
  routeTourScore,
  stationTourBonus
} from './suggestions.js';

function heuristic(u, dst) {
  if (u === dst) return 0;
  const distanceKm = haversine(stationById.get(u), stationById.get(dst)) / 1000;
  return (distanceKm / FASTEST_SPEED_KMH) * 60;
}

function stateKey(stationId, line) {
  return `${stationId}|${line || 'START'}`;
}

function transferPenalty(stationId, fromLine, toLine) {
  if (!fromLine || !toLine || fromLine === toLine || fromLine === 'XFER' || toLine === 'XFER') {
    return 0;
  }
  return transferPenaltyMins[stationId] || DEFAULT_TRANSFER_MINS;
}

function countTransfers(legs) {
  return legs.filter(leg => leg.isTransfer || leg.transferTime > 0).length;
}

function decorateRouteResult(result, modeKey, score) {
  const profile = getRouteMode(modeKey);
  return {
    ...result,
    modeKey,
    modeLabel: profile.label,
    modeShortLabel: profile.shortLabel,
    modeTag: profile.tag,
    modeDescription: profile.description,
    transfers: countTransfers(result.legs),
    suggestionCount: getRouteSuggestions(result.route).length,
    tourScore: roundedMinutes(routeTourScore(result.route, modeKey)),
    score: roundedMinutes(score ?? result.cost)
  };
}

function reconstructPath(src, finalKey, trace, cost, score, modeKey) {
  const legs = [];
  let key = finalKey;
  const startKey = stateKey(src, null);

  while (key !== startKey) {
    const record = trace.get(key);
    if (!record) break;
    legs.push(record);
    key = record.prevKey;
  }

  legs.reverse();
  return decorateRouteResult(
    { route: [src, ...legs.map(leg => leg.to)], legs, cost: roundedMinutes(cost) },
    modeKey,
    score
  );
}

/**
 * Tìm đường từ ga src tới ga dst.
 * @param {string} src
 * @param {string} dst
 * @param {{ modeKey?: string, blockedEdges?: Set<string> | { has(key: string): boolean } }} options
 */
export function findPath(src, dst, options = {}) {
  const modeKey = options.modeKey || 'fastest';
  const blocked = options.blockedEdges || new Set();
  const profile = getRouteMode(modeKey);

  if (src === dst) {
    return decorateRouteResult({ route: [src], legs: [], cost: 0 }, modeKey, 0);
  }

  const startKey = stateKey(src, null);
  const score = new Map([[startKey, 0]]);
  const actual = new Map([[startKey, 0]]);
  const trace = new Map();
  const closed = new Set();
  const open = [{
    station: src,
    line: null,
    key: startKey,
    visited: new Set([src]),
    f: heuristic(src, dst) * profile.heuristicWeight
  }];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();

    if (closed.has(current.key)) continue;
    closed.add(current.key);

    if (current.station === dst) {
      return reconstructPath(src, current.key, trace, actual.get(current.key), score.get(current.key), modeKey);
    }

    for (const edge of adjacency.get(current.station) || []) {
      if (!edge.isTransfer && blocked.has(edge.key)) continue;

      const nextStation = edge.u === current.station ? edge.v : edge.u;
      if (current.visited.has(nextStation) && nextStation !== dst) continue;

      for (const edgeLine of edge.lines) {
        const nextLine = edge.isTransfer ? null : edgeLine;
        const extraTransfer = edge.isTransfer ? 0 : transferPenalty(current.station, current.line, edgeLine);
        const edgeTime = edge.timeByLine[edgeLine];
        const actualEdgeCost = edgeTime + extraTransfer;
        const bonus = stationTourBonus(nextStation, modeKey);
        const weightedEdgeCost = Math.max(
          0.25,
          edgeTime * profile.timeWeight + extraTransfer * profile.transferWeight - bonus
        );
        const tentativeScore = score.get(current.key) + weightedEdgeCost;
        const tentativeActual = actual.get(current.key) + actualEdgeCost;
        const nextKey = stateKey(nextStation, nextLine);

        if (tentativeScore >= (score.get(nextKey) ?? Infinity)) continue;

        score.set(nextKey, tentativeScore);
        actual.set(nextKey, tentativeActual);
        trace.set(nextKey, {
          prevKey: current.key,
          from: current.station,
          to: nextStation,
          line: edgeLine,
          edgeTime,
          transferTime: extraTransfer,
          isTransfer: edge.isTransfer,
          scoreTime: roundedMinutes(weightedEdgeCost),
          tourBonus: roundedMinutes(bonus)
        });

        open.push({
          station: nextStation,
          line: nextLine,
          key: nextKey,
          visited: new Set([...current.visited, nextStation]),
          f: tentativeScore + heuristic(nextStation, dst) * profile.heuristicWeight
        });
      }
    }
  }

  return null;
}

/**
 * Chạy A* với mọi chế độ, gộp các tuyến trùng nhau, trả về tối đa 4 phương án.
 * Phương án của chế độ đang chọn luôn đứng đầu.
 */
export function buildRouteOptions(src, dst, activeModeKey, blockedEdges) {
  const candidateModes = [...new Set([activeModeKey, ...routeModeOrder])];
  const bySignature = new Map();

  candidateModes.forEach(modeKey => {
    const result = findPath(src, dst, { modeKey, blockedEdges });
    if (!result) return;

    const signature = result.route.join('>');
    const label = getRouteMode(modeKey).shortLabel;
    const existing = bySignature.get(signature);

    if (!existing) {
      bySignature.set(signature, { ...result, matchedModes: [label] });
      return;
    }

    existing.matchedModes.push(label);
    if (modeKey === activeModeKey) {
      bySignature.set(signature, { ...result, matchedModes: existing.matchedModes });
    }
  });

  return [...bySignature.values()]
    .sort((a, b) => {
      if (a.modeKey === activeModeKey) return -1;
      if (b.modeKey === activeModeKey) return 1;
      return a.score - b.score;
    })
    .slice(0, 4);
}
