// src/writingCheck/analyzeClient.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.js';
import { CONCURRENCY } from './constants.js';

// functions は asia-northeast1 を指定済み（src/firebase.js を参照）。
const callAnalyze = httpsCallable(functions, 'analyzeSubmission', { timeout: 70000 });

// 一時的な混雑だけを再試行する。internal（API 側のエラー）は投げ直しても
// 同じ結果になることが多いので、行を失敗扱いにして再試行ボタンに任せる。
const RETRYABLE = new Set([
  'functions/resource-exhausted',
  'functions/unavailable',
  'functions/deadline-exceeded'
]);

const MAX_ATTEMPTS = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeOne(payload, courseContext, mode) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data } = await callAnalyze({ text: payload.text, courseContext, mode });
      return {
        status: 'ok',
        answers: data.answers,
        usage: data.usage,
        truncated: payload.truncated
      };
    } catch (err) {
      if (!RETRYABLE.has(err.code) || attempt === MAX_ATTEMPTS) {
        console.error(`Analysis failed for row ${payload.rowNumber}:`, err);
        return { status: 'error', error: err.message ?? '解析に失敗しました。' };
      }
      await wait(500 * 2 ** (attempt - 1));
    }
  }
}

/**
 * 1名 = 1リクエストで解析する。複数 state のバッチ送信は API 側が未対応。
 * 1件の失敗で全体を止めず、行ごとに成否を記録する。
 *
 * @param {Array} payloads buildPayloads() の戻り値（匿名化済み本文だけを持つ）
 * @param {{courseContext: string, onProgress: Function, shouldStop: Function}} options
 */
export async function runAnalysis(payloads, { courseContext, mode, onProgress, shouldStop }) {
  const results = new Array(payloads.length).fill(null);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < payloads.length) {
      if (shouldStop?.()) return;
      const index = cursor;
      cursor += 1;
      results[index] = await analyzeOne(payloads[index], courseContext, mode);
      completed += 1;
      onProgress?.(completed, payloads.length);
    }
  }

  const workerCount = Math.min(CONCURRENCY, payloads.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
