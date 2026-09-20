// functions/index.js
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { TypeSafeClient, APIError } from '@typesafe-ai/sdk';
import { buildQuestions, MODES } from './questions.js';

const TYPESAFE_API_KEY = defineSecret('TYPESAFE_API_KEY');

// 暴走課金を防ぐための見張り番であって、モデルの制限ではない。
// JEV は 1リクエスト64kトークン・state は32kトークンまで許容するので、
// 日本語で約2万字ならまだ余裕がある（2万字で概算0.15円）。
// src/writingCheck/constants.js の MAX_BODY_LENGTH と必ず同じ値にすること。
// 片方だけ上げると、クライアントが送れてサーバーが弾く行が出る。
const MAX_TEXT_LENGTH = 20000;
const MAX_CONTEXT_LENGTH = 200;

// 「認証済み＝許可」とみなさない。Authentication を有効にすると、コンソールで
// 新規登録を止めない限り公開 API キーだけで誰でもアカウントを作れてしまい、
// そのまま API キーの利用枠を消費されるため（2026-09-20 に実際に発生）。
// コンソールの設定はいつでも戻せるので、コード側でも許可した相手だけを通す。
//
// 記述チェックは学科の教員に広く使ってもらうため、個別の許可リストではなく
// 学内ドメインで判定する。先生が増えるたびに再デプロイしなくて済む。
// アカウント自体はコンソールからしか作れない（新規登録は無効化済み）ので、
// 部外者がこの条件を満たすことはない。
//
// 兼務申請の個人情報はこれとは別の権限。firestore.rules の isAdmin() が
// 審査担当者だけに限定しており、こちらを広げても影響しない。
const ALLOWED_EMAIL_DOMAIN = '@jumonji-u.ac.jp';

function isAllowed(token) {
  const email = token?.email;
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

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
    if (!isAllowed(request.auth.token)) {
      console.warn('Rejected analyzeSubmission for non-allowlisted account:', request.auth.uid);
      throw new HttpsError('permission-denied', 'この機能の利用権限がありません。');
    }

    const { text, courseContext, mode } = request.data ?? {};

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new HttpsError('invalid-argument', '本文が空です。');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new HttpsError('invalid-argument', `本文が長すぎます（${MAX_TEXT_LENGTH}文字まで）。`);
    }
    if (courseContext != null && (typeof courseContext !== 'string' || courseContext.length > MAX_CONTEXT_LENGTH)) {
      throw new HttpsError('invalid-argument', '授業の主題が長すぎます。');
    }
    // 未知の mode を既定に読み替えると、意図しない基準で採点した結果が
    // 正常値として返ってしまうので、はっきり弾く。
    if (mode != null && !MODES.includes(mode)) {
      throw new HttpsError('invalid-argument', '文章の種類の指定が不正です。');
    }

    try {
      const result = await getClient().systemOne({
        state: text,
        questions: buildQuestions(courseContext?.trim() || '', mode)
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
