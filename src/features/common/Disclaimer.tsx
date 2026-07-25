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
        入力された氏名・生年月日・出生地は、このブラウザの中（localStorage）にのみ保存され、
        外部のサーバーには送信されません。AI鑑定を実行したときにサーバーへ送られるのは、
        判定結果のルールIDと、その判定に使った宮名・宿名などの記号だけです
        （氏名・生年月日・出生地は含まれません）。
      </p>
    </div>
  );
}
