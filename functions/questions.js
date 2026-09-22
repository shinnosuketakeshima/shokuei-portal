// functions/questions.js
import { score } from '@typesafe-ai/sdk';

// 評価軸の定義はサーバー側に置く。クライアントから任意の指示文を送れるようにすると、
// 採点基準を差し替えられるうえ、API キーの利用枠を自由に使われることになるため。
//
// criteria は「高度」のような抽象語ではなく具体的な状況で書く（TypeSafe のルーブリック指針）。
// 各軸は 0〜3 の 4 段階で、低い方から順に並べる。
//
// 文章の種類で軸を分けているのは、種類によって「良い書き方」が正反対になるため。
// 実験レポートは目的・方法・結果・考察の型どおりに書くのが正しいので、
// 感想文用の「文体の定型性」を当てると、丁寧に書けている学生ほど AI 的に出てしまう。

function contextLine(courseContext, genre) {
  const where = courseContext ? `大学の授業「${courseContext}」` : '大学の授業';
  return `次の文章は、${where}で学生が提出した${genre}です。`;
}

// 授業の感想・振り返り用
function reflectionQuestions(courseContext) {
  const intro = contextLine(courseContext, '感想・振り返り');

  return {
    lecture_specificity: score(
      `${intro}その回の授業で実際に扱われた内容に、どれだけ具体的に踏み込んでいますか。`,
      [
        '授業で何を扱ったかが読み取れない、一般的な感想だけで終わっている',
        '教科書レベルの用語は出てくるが説明は一般的で、その回に何が強調されたかは読み取れない',
        '授業で扱われた用語・数値・図や、説明の順序に複数の具体的な言及がある',
        '教員の言い回しや例え、説明の流れなど、その回の授業を聞いた者にしか書けない細部が含まれる'
      ]
    ),

    personal_reflection: score(
      `${intro}書き手自身の固有の経験や理解の変化に、どれだけ具体的に触れていますか。`,
      [
        '書き手自身への言及がなく、内容の要約だけで終わっている',
        '「よく分かった」「これから頑張りたい」のような定型的な感想が添えられている程度',
        '高校での既習内容、以前の思い違い、分かりにくかった点など、自分固有の経験に具体的に触れている',
        'どう誤解していて何をきっかけにどう理解が変わったかを、誤解の中身まで含めて説明している'
      ]
    ),

    ...aiToneQuestions(intro, ''),

    content_accuracy: accuracyQuestion(intro)
  };
}

// 実験レポート用
function reportQuestions(courseContext) {
  const intro = contextLine(courseContext, '実験レポート');
  const note = 'レポートが目的・方法・結果・考察の型に沿っていること自体は減点材料ではありません。';

  return {
    observed_specifics: score(
      `${intro}${note}その日その班で実際に得られたとしか考えられない、固有の実測値や観察の記述がどれだけありますか。`,
      [
        '一般的な説明ばかりで、自分たちが測定したとわかる数値や観察がまったくない',
        '数値は出てくるが、教科書や配布資料の値をなぞったようなものに見える',
        '体重や臓器の状態など、自分たちの実測値・観察が複数の箇所に具体的に書かれている',
        '個体差、想定と違った点、手順上の失敗や気づきなど、その場に居た者にしか書けない記述が含まれる'
      ]
    ),

    discussion_grounding: score(
      `${intro}${note}考察は、自分たちの得た結果にどれだけ結びついていますか。`,
      [
        '考察が一般論の説明にとどまり、自分たちの結果に一度も触れていない',
        '結果に触れてはいるが、教科書的な説明を並べただけで結果との対応が薄い',
        '自分たちの結果を引用しながら、その理由や意味を筋道立てて論じている',
        '想定との差やばらつきの原因まで、自分たちの観察に即して具体的に検討している'
      ]
    ),

    ...aiToneQuestions(intro, note),

    content_accuracy: accuracyQuestion(intro)
  };
}

// AI らしさの三大特徴「整いすぎ・無難すぎ・丁寧すぎ」。
// 1つにまとめず別々に聞くのは、どれが効いているかを教員に示すため。
// TypeSafe の指針どおり、各軸は1次元に絞る（混ぜると確信度が落ちる）。
function aiToneQuestions(intro, genreNote) {
  return {
    even_structure: score(
      `${intro}${genreNote}構成と文のリズムは、どれだけ均整が取れていますか。見出しや箇条書きの使い方、「まず」「次に」「最後に」といった接続の型、段落や一文の長さのばらつきを見てください。`,
      [
        '構成が不揃いで、一文の長さも段落の分量もばらついている',
        '大筋は整っているが、話が前後したり長さに偏りがある箇所がある',
        '見出しや接続語が規則的に使われ、段落の長さもおおむね揃っている',
        '見出し・箇条書き・接続の型が最後まで崩れず、文の長さもリズムも一定で揺れがまったくない'
      ]
    ),

    generic_phrasing: score(
      `${intro}${genreNote}「重要である」「効果的である」「〜が期待される」のような、もっともらしいが中身の薄い言い回しがどれだけ多いですか。書き手固有の言い切りや癖がどれだけ残っているかも併せて見てください。`,
      [
        '具体的に言い切っており、書き手の癖のある表現が随所にある',
        'おおむね具体的だが、無難な言い回しも混じる',
        '無難で当たり障りのない表現が目立ち、誰が書いても同じような文章になっている',
        '全体が一般論の言い換えで構成され、断定や固有の表現が一切なく、内容を取り出せない'
      ]
    ),

    over_explanation: score(
      `${intro}${genreNote}読み手が分かっていることまで補足したり、同じ内容を言い換えて繰り返したりしていませんか。削っても意味が変わらない文がどれだけあるかを見てください。`,
      [
        '記述は簡潔で、繰り返しや不要な補足がない',
        '一部に言い換えの重複があるが、分量としては気にならない',
        '自明な補足や「まとめると」のような再説が複数あり、削れる文が目立つ',
        '全体にわたって過剰に丁寧で、要約すれば半分以下になるほど重複した説明が続く'
      ]
    )
  };
}

function accuracyQuestion(intro) {
  return score(`${intro}書かれている内容は、学術的にどれだけ正確ですか。`, [
    '基本的な概念を取り違えた重大な誤りが複数ある',
    '部分的な誤りや、不正確な言い換えがある',
    'おおむね正確だが、曖昧な表現や説明不足の箇所がある',
    '正確であり、用語の使い方も適切である'
  ]);
}

const BUILDERS = {
  reflection: reflectionQuestions,
  report: reportQuestions
};

export const MODES = Object.keys(BUILDERS);

export function buildQuestions(courseContext, mode) {
  const build = BUILDERS[mode] ?? reflectionQuestions;
  return build(courseContext);
}

// criteria の段数。クライアント側の正規化（score / SCORE_MAX）と必ず揃える。
export const SCORE_MAX = 3;

// カスタムルーブリックのパース・検証・質問生成

const CUSTOM_RUBRIC_MAX_ITEMS = 5;
const CUSTOM_RUBRIC_MAX_LEVEL_LENGTH = 500;
const CUSTOM_RUBRIC_MAX_TOTAL_LENGTH = 2000;

// src/writingCheck/parseCustomRubric.js とロジックを同期させること。
// クライアントは表示用に同じパースを行うが、実際に採点へ使う質問は必ずこちら
// （サーバー側）で再構築する。
export function parseCustomRubric(text) {
  if (!text || typeof text !== 'string') {
    return { items: [], errors: ['ルーブリックが空です。'] };
  }

  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { items: [], errors: ['ルーブリックが空です。'] };
  }

  const items = [];
  const errors = [];
  let i = 0;
  let headerMarkersSeen = 0;
  let dataMarkersSeen = 0;

  // 「評価方法」は配点説明（例:「レポート80%…」）の行にも、Bレベルの説明文中にも
  // 現れうるので、単独行（他の情報を含まない）場合だけヘッダー／区切りとして扱う。
  const isEvaluationMethodLine = (line) => line.length <= 40 && line.includes('評価方法') && !line.match(/^【/);

  while (i < lines.length) {
    const line = lines[i];

    if (isEvaluationMethodLine(line)) {
      i++;
      continue;
    }

    // テーブルヘッダー行（DP・評価項目などを含み【S】【A】【B】【C】が複数並ぶ行）はスキップ
    const markersInLine = (line.match(/【[SABC]】/g) || []).length;
    if ((line.includes('DP') || line.includes('評価項目')) && markersInLine >= 2) {
      headerMarkersSeen += markersInLine;
      i++;
      continue;
    }
    // 視覚的な区切り線（・や空白のみ）
    if (line.match(/^[・\s]+$/)) {
      i++;
      continue;
    }

    // 項目名の行を探す：【コード】項目名 の形式
    const codeMatch = line.match(/^【([^】]+)】(.*)$/);
    const isLevelMarkerLine = codeMatch && codeMatch[1].match(/^[SABC]$/);

    let itemName = null;
    if (codeMatch && !isLevelMarkerLine) {
      itemName = codeMatch[2].trim() || codeMatch[1];
      i++;
    } else if (!codeMatch && i + 1 < lines.length && lines[i + 1].match(/^【S】/)) {
      // プレーンテキストの項目名（直後に【S】が続く場合のみ項目名として採用）
      itemName = line;
      i++;
    }

    if (itemName === null) {
      i++;
      continue;
    }

    // 項目名の直後、【S】マーカー付きの行が近くにあるか先読みする
    let markerStart = -1;
    for (let k = i; k < Math.min(i + 6, lines.length); k++) {
      if (lines[k].match(/^【S】/)) {
        markerStart = k;
        break;
      }
      if (lines[k].match(/^【[^SABC]/) || isEvaluationMethodLine(lines[k])) break;
    }

    if (markerStart >= 0) {
      // 【S】【A】【B】【C】マーカー付きで4段階を集める
      i = markerStart;
      const levels = ['', '', '', ''];
      let count = 0;
      while (i < lines.length && count < 4) {
        const m = lines[i].match(/^【([SABC])】(.*)$/);
        if (!m) break;
        const idx = ['S', 'A', 'B', 'C'].indexOf(m[1]);
        levels[idx] = m[2].trim();
        count++;
        dataMarkersSeen++;
        i++;
      }
      if (count === 4 && levels.every((l) => l.length > 0)) {
        items.push({ name: itemName, levels });
      } else {
        errors.push(`項目「${itemName}」: 【S】【A】【B】【C】が4つ揃いませんでした。`);
      }
      continue;
    }

    // マーカーなし：項目名の直後から「評価方法」行または次の項目名行までを集める
    const collected = [];
    while (i < lines.length) {
      const l = lines[i];
      if (isEvaluationMethodLine(l)) {
        i++;
        break;
      }
      const nextCode = l.match(/^【([^】]+)】(.*)$/);
      if (nextCode && !nextCode[1].match(/^[SABC]$/)) break;
      collected.push(l);
      i++;
    }

    let levels = null;
    if (collected.length === 4) {
      levels = collected;
    } else if (collected.length === 5) {
      // 先頭1行は「到達目標」の総括説明とみなし、残り4行を S/A/B/C とする
      levels = collected.slice(1);
    } else if (collected.length > 5) {
      levels = collected.slice(collected.length - 4);
    }

    if (levels && levels.every((l) => l.length > 0)) {
      items.push({ name: itemName, levels });
    } else {
      errors.push(
        `項目「${itemName}」: 4段階の説明文を特定できませんでした（${collected.length}行検出）。【S】【A】【B】【C】を付けて貼り直してください。`
      );
    }
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push(
      `ルーブリックの項目を検出できませんでした（${lines.length}行読み込み、レベルマーカー ヘッダー${headerMarkersSeen}個/データ${dataMarkersSeen}個）。項目名の直後に【S】【A】【B】【C】の4段階が続く形式で貼り付けてください。`
    );
  }

  return { items, errors };
}

export function validateRubric(rubric) {
  const errors = [];

  if (!rubric || !Array.isArray(rubric.items)) {
    errors.push('ルーブリック構造が不正です。');
    return { valid: false, errors };
  }

  if (rubric.items.length === 0) {
    errors.push('ルーブリック項目がありません。');
    return { valid: false, errors };
  }

  if (rubric.items.length > CUSTOM_RUBRIC_MAX_ITEMS) {
    errors.push(`ルーブリック項目は${CUSTOM_RUBRIC_MAX_ITEMS}個までです。`);
  }

  let totalLength = 0;
  for (let i = 0; i < rubric.items.length; i++) {
    const item = rubric.items[i];
    if (!item.name || typeof item.name !== 'string') {
      errors.push(`項目 ${i + 1}: 評価項目名がありません。`);
      continue;
    }
    if (!item.levels || !Array.isArray(item.levels) || item.levels.length !== 4) {
      errors.push(`項目 ${i + 1}「${item.name}」: 【S】【A】【B】【C】が揃っていません。`);
      continue;
    }
    for (const [idx, level] of item.levels.entries()) {
      if (!level || typeof level !== 'string') {
        const levelNames = ['S', 'A', 'B', 'C'];
        errors.push(`項目 ${i + 1}「${item.name}」の【${levelNames[idx]}】が空です。`);
        continue;
      }
      if (level.length > CUSTOM_RUBRIC_MAX_LEVEL_LENGTH) {
        const levelNames = ['S', 'A', 'B', 'C'];
        errors.push(`項目 ${i + 1}「${item.name}」の【${levelNames[idx]}】が長すぎます（${CUSTOM_RUBRIC_MAX_LEVEL_LENGTH}文字まで）。`);
      }
      totalLength += level.length;
    }
  }

  if (totalLength > CUSTOM_RUBRIC_MAX_TOTAL_LENGTH) {
    errors.push(`ルーブリック全体が長すぎます（${CUSTOM_RUBRIC_MAX_TOTAL_LENGTH}文字まで）。`);
  }

  return { valid: errors.length === 0, errors };
}

export function buildCustomRubricQuestions(rubric, courseContext) {
  if (!rubric || !Array.isArray(rubric.items) || rubric.items.length === 0) {
    throw new Error('Invalid custom rubric');
  }

  const intro = contextLine(courseContext, 'ユーザー指定のルーブリックで採点');
  const questions = {};

  for (let i = 0; i < rubric.items.length; i++) {
    const item = rubric.items[i];
    const key = `custom_${i}`;
    questions[key] = score(
      `${intro}「${item.name}」に関して、この文章を以下の4段階で評価してください。`,
      item.levels
    );
  }

  return questions;
}
