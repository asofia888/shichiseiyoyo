interface Props {
  /** 余白の付け方を呼び出し側で調整するためのクラス */
  className?: string;
}

// 免責とプライバシーの表記。
// 生年月日という機微な情報を扱い、AIが人生について語るアプリなので、
// READMEだけでなく利用者が実際に見る画面に常に出しておく。
export function Disclaimer({ className = '' }: Props) {
  return (
    <div className={`text-[11px] leading-relaxed text-[#F5F2ED]/40 print:text-gray-600 ${className}`}>
      <p className="mb-1">
        <span className="text-[#D4AF37]/60">免責</span>{' '}
        本アプリの鑑定結果は伝統的占術の解釈をエンターテインメントとして提供するものであり、
        医療・法律・投資等の専門的助言に代わるものではありません。
      </p>
      <p>
        <span className="text-[#D4AF37]/60">プライバシー</span>{' '}
        入力された氏名・生年月日・出生地は、履歴に保存したとき（AI鑑定を実行したときも自動で保存されます）に
        このブラウザの中（localStorage）にだけ保存され、このアプリのサーバーには送られません。
        外部へ送られるのは次の場合だけです。
        地名で緯度経度を検索したときは、入力した地名が OpenStreetMap（Nominatim）に送られます。
        AI鑑定を実行したときは、判定結果のルールIDと、判定に使った宮名・宿名・星曜名・大限の年齢の範囲・鑑定する年が
        このアプリのサーバーに送られ、文章を作るために Google の Gemini API に渡されます
        （氏名・生年月日・出生地は含まれません）。
      </p>
    </div>
  );
}
