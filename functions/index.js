// functions/index.js
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { TypeSafeClient, APIError } from '@typesafe-ai/sdk';
import { buildQuestions } from './questions.js';

const TYPESAFE_API_KEY = defineSecret('TYPESAFE_API_KEY');

const MAX_TEXT_LENGTH = 8000;
const MAX_CONTEXT_LENGTH = 200;

// 1試行25秒 × 最大2試行 ＝ 約50秒。下の timeoutSeconds: 60 に収まるようにしてある。
// どちらかを変えるときは両方見直すこと。
const ATTEMPT_TIMEOUT_MS = 25000;
const MAX_RETRIES = 1;

// モジュール直下で new しない。TYPESAFE_API_KEY は defineSecret が実行時に
// process.env へ注入するもので、デプロイ時の関数探索では存在しない。
// TypeSafeClient はキーが無いとコンストラクタで throw するため、
// モジュール直下に置くと deploy 自体が失敗する。
let client;

function getClient() {
  client ??= new TypeSafeClient({
    timeout: ATTEMPT_TIMEOUT_MS,
    retry: { maxRetries: MAX_RETRIES }
  });
  return client;
}

export const analyzeSubmission = onCall(
  {
    region: 'asia-northeast1',
    secrets: [TYPESAFE_API_KEY],
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (request) => {
    // AdminGate と同じ Firebase Auth アカウントでのみ実行できる。
    // 未認証を通すと API キーの利用枠を誰でも消費できてしまう。
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'ログインが必要です。');
    }

    const { text, courseContext } = request.data ?? {};

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new HttpsError('invalid-argument', '本文が空です。');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new HttpsError('invalid-argument', `本文が長すぎます（${MAX_TEXT_LENGTH}文字まで）。`);
    }
    if (courseContext != null && (typeof courseContext !== 'string' || courseContext.length > MAX_CONTEXT_LENGTH)) {
      throw new HttpsError('invalid-argument', '授業の主題が長すぎます。');
    }

    try {
      const result = await getClient().systemOne({
        state: text,
        questions: buildQuestions(courseContext?.trim() || '')
      });
      return { answers: result.answers, usage: result.usage, model: result.model };
    } catch (err) {
      // API キーやリクエスト不備はこちらの設定ミスなので、原因が追えるようログに残す。
      // 利用者に返すのは原因の分類だけで、レスポンス本文は返さない。
      console.error('TypeSafe systemOne failed:', err);
      if (err instanceof APIError) {
        if (err.status === 401) {
          throw new HttpsError('failed-precondition', 'APIキーが無効です。管理者に連絡してください。');
        }
        if (err.status === 429) {
          throw new HttpsError('resource-exhausted', 'API の利用制限に達しました。時間をおいて再試行してください。');
        }
        throw new HttpsError('internal', `解析APIがエラーを返しました（${err.status}）。`);
      }
      throw new HttpsError('internal', '解析に失敗しました。');
    }
  }
);
