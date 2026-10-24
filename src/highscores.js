// src/highscores.js
const KEY = 'demonstar.highscores.v1';
const MAX = 5;

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

export function loadScores() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function qualifies(score) {
  if (!score || score <= 0) return false;
  const s = loadScores();
  return s.length < MAX || score > s[s.length - 1].score;
}

export function addScore(name, score, stage) {
  const s = loadScores();
  s.push({ name, score, stage, ts: Date.now() });
  s.sort((a, b) => b.score - a.score);
  const top = s.slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(top)); } catch {}
  return top;
}