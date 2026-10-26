// Xây dựng đồ thị mạng MTR: đỉnh = ga, cạnh = đoạn metro / liên kết đi bộ.

import { stations } from '../data/stations.js';
import { lineProfiles, lineSequences, transferLinks } from '../data/lines.js';
import { haversine } from './geo.js';
import { roundedMinutes } from './utils.js';

export const stationById = new Map(stations.map(station => [station.id, station]));

export function canonicalEdgeKey(u, v) {
  return [u, v].sort().join('-');
}

export function lineLabel(line) {
  return lineProfiles[line]?.name || line;
}

export function lineColor(line) {
  return lineProfiles[line]?.color || '#4d9cff';
}

function estimateRailMinutes(line, u, v) {
  const profile = lineProfiles[line];
  const distanceKm = haversine(stationById.get(u), stationById.get(v)) / 1000;
  const rawMins = (distanceKm / profile.speedKmh) * 60 + profile.dwellMins;
  return roundedMinutes(Math.max(profile.minEdgeMins, rawMins));
}

function buildEdges() {
  const mapByKey = new Map();

  Object.entries(lineSequences).forEach(([line, branches]) => {
    branches.forEach(sequence => {
      for (let i = 0; i < sequence.length - 1; i += 1) {
        const u = sequence[i];
        const v = sequence[i + 1];
        if (!stationById.has(u) || !stationById.has(v)) continue;

        const key = canonicalEdgeKey(u, v);
        if (!mapByKey.has(key)) {
          mapByKey.set(key, {
            key,
            u,
            v,
            lines: [],
            timeByLine: {},
            isTransfer: false,
            distanceKm: roundedMinutes(haversine(stationById.get(u), stationById.get(v)) / 1000)
          });
        }

        const edge = mapByKey.get(key);
        if (!edge.lines.includes(line)) edge.lines.push(line);
        edge.timeByLine[line] = estimateRailMinutes(line, u, v);
      }
    });
  });

  transferLinks.forEach(link => {
    const key = canonicalEdgeKey(link.u, link.v);
    mapByKey.set(key, {
      key,
      u: link.u,
      v: link.v,
      lines: ['XFER'],
      timeByLine: { XFER: link.mins },
      isTransfer: true,
      distanceKm: roundedMinutes(haversine(stationById.get(link.u), stationById.get(link.v)) / 1000)
    });
  });

  return [...mapByKey.values()];
}

function buildAdjacency(edgeList) {
  const graph = new Map();
  stations.forEach(station => graph.set(station.id, []));
  edgeList.forEach(edge => {
    graph.get(edge.u).push(edge);
    graph.get(edge.v).push(edge);
  });
  return graph;
}

export const edges = buildEdges();
export const edgeByKey = new Map(edges.map(edge => [edge.key, edge]));
export const adjacency = buildAdjacency(edges);
export const railEdgeCount = edges.filter(edge => !edge.isTransfer).length;

/** Ga gần nhất với một toạ độ (không kiểm tra ranh giới). */
export function nearestStation(latlng) {
  let best = stations[0].id;
  let min = Infinity;
  stations.forEach(station => {
    const d = haversine(latlng, station);
    if (d < min) {
      min = d;
      best = station.id;
    }
  });
  return best;
}
