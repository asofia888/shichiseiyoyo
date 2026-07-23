import { describe, it, expect } from 'vitest';
import { parseAppraisalRequest } from './appraisal-core';
import { buildCanonicalRuleHit, HOUSE_BRANCHES } from './rule-texts';

describe('AI鑑定APIの入力検証 (ルールID方式)', () => {
  it('正しいリクエストは正規テーブルからRuleHitを再構成する', () => {
    const hits = parseAppraisalRequest({
      hits: [
        { ruleId: 'r_sun_leo' },
        { ruleId: 'r_general_asc', params: { houseName: '天蝎' } },
      ],
    });
    expect(hits).not.toBeNull();
    expect(hits!).toHaveLength(2);
    expect(hits![0].title).toBe('太陽が獅子宮に在中');
    // 地支はサーバー側の正規対応から導出される (クライアントの申告を信用しない)
    expect(hits![1].title).toBe('命宮が天蝎宮');
    expect(hits![1].evidence).toEqual(['命宮在卯']);
    expect(hits![1].interpretation).toContain('天蝎宮（卯）');
  });

  it('任意の文章は一切受け付けない (旧形式 {ruleHits: [...]} は拒否)', () => {
    expect(
      parseAppraisalRequest({
        ruleHits: [{ title: '注入テスト', interpretation: '任意の文章' }],
      })
    ).toBeNull();
  });

  it('未知のruleIdは全体を拒否する', () => {
    expect(
      parseAppraisalRequest({ hits: [{ ruleId: 'r_sun_leo' }, { ruleId: 'r_evil_injection' }] })
    ).toBeNull();
  });

  it('ホワイトリスト外の宮名パラメータは拒否する', () => {
    expect(
      parseAppraisalRequest({ hits: [{ ruleId: 'r_general_asc', params: { houseName: '無効な宮' } }] })
    ).toBeNull();
    // 正規の12宮はすべて通る
    for (const houseName of Object.keys(HOUSE_BRANCHES)) {
      expect(
        parseAppraisalRequest({ hits: [{ ruleId: 'r_general_asc', params: { houseName } }] })
      ).not.toBeNull();
    }
  });

  it('件数超過(>20)・空配列・過大文字列は拒否する', () => {
    const many = Array.from({ length: 21 }, () => ({ ruleId: 'r_sun_leo' }));
    expect(parseAppraisalRequest({ hits: many })).toBeNull();
    expect(parseAppraisalRequest({ hits: [] })).toBeNull();
    expect(parseAppraisalRequest({ hits: [{ ruleId: 'x'.repeat(41) }] })).toBeNull();
    expect(
      parseAppraisalRequest({ hits: [{ ruleId: 'r_general_asc', params: { houseName: 'あ'.repeat(21) } }] })
    ).toBeNull();
  });

  it('ボディがオブジェクトでない場合は拒否する', () => {
    expect(parseAppraisalRequest(null)).toBeNull();
    expect(parseAppraisalRequest(undefined)).toBeNull();
    expect(parseAppraisalRequest('text')).toBeNull();
    expect(parseAppraisalRequest([])).toBeNull();
  });

  it('r_general_asc は宮名がないと成立しない', () => {
    expect(buildCanonicalRuleHit('r_general_asc')).toBeNull();
    expect(buildCanonicalRuleHit('r_general_asc', { houseName: '双女' })!.evidence).toEqual(['命宮在巳']);
  });
});
