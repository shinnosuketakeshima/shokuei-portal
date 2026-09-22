// src/writingCheck/parseCustomRubric.js
//
// functions/questions.js の parseCustomRubric() とロジックを同期させること。
// クライアントは UI 表示用の項目数・項目名だけを必要とし、実際の採点質問は
// サーバー側で同じロジックにより再構築される（クライアントの結果は信用しない）。

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
