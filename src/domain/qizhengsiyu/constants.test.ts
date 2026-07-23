import { describe, it, expect } from 'vitest';
import { SIDEREAL_MANSIONS, getMansionAtLongitude } from './constants';

describe('二十八宿テーブル (距星実測・サイデリアル境界)', () => {
  it('宿幅の合計が360°になる', () => {
    const total = SIDEREAL_MANSIONS.reduce((s, m) => s + m.width, 0);
    expect(total).toBeCloseTo(360, 6);
  });

  it('角宿の距星スピカ(サイデリアル179.984°)は角宿、その直前は軫宿', () => {
    expect(getMansionAtLongitude(179.984, 0).name).toBe('角');
    expect(getMansionAtLongitude(179.5, 0).name).toBe('軫');
  });

  it('参宿が觜宿に先行する (乾隆17年改暦の「参前觜後」と同現象)', () => {
    const shen = SIDEREAL_MANSIONS.find(m => m.name === '参')!;
    const zi = SIDEREAL_MANSIONS.find(m => m.name === '觜')!;
    expect(shen.startLongitude).toBeLessThan(zi.startLongitude);
  });

  it('0°をまたぐ領域(奎宿)も正しく判定される', () => {
    // 奎: 356.723° 起点、幅13.390° → 360°をまたいで 10.113°(婁の起点) まで
    expect(getMansionAtLongitude(359.9, 0).name).toBe('奎');
    expect(getMansionAtLongitude(2.0, 0).name).toBe('奎');
    expect(getMansionAtLongitude(10.113, 0).name).toBe('婁');
  });

  it('丸めによる境界の隙間値も直前の宿に帰属する(全域に判定漏れがない)', () => {
    // 角end=190.636 と 亢start=190.637 の間の値
    expect(getMansionAtLongitude(190.6365, 0).name).toBe('角');
    expect(getMansionAtLongitude(190.637, 0).name).toBe('亢');
  });

  it('トロピカル命盤では mansionOffset で恒星基準に補正して判定する', () => {
    // 2025年のLahiri≈24.21°: スピカのトロピカル黄経≈204.2°が角宿と判定される
    expect(getMansionAtLongitude(204.2, 24.206).name).toBe('角');
  });

  it('全ての宿の起点境界は(オフセット併用時も)その宿自身に帰属する', () => {
    // 浮動小数点ジッタ対策(1e-9スナップ)の回帰防止:
    // 起点+オフセットの引き算で生じる微小誤差があっても、境界値は必ず自分の宿に入る
    for (const off of [0, 20.28, 23.857, 24.206]) {
      for (const m of SIDEREAL_MANSIONS) {
        expect(
          getMansionAtLongitude(m.startLongitude + off, off).name,
          `境界 ${m.name} (offset=${off})`
        ).toBe(m.name);
      }
    }
  });
});
