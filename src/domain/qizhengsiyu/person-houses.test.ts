import { describe, it, expect } from 'vitest';
import {
  PERSON_HOUSES,
  getHouseAtLongitude,
  getPersonHouseAt,
  getMansionPosition,
  SIDEREAL_MANSIONS,
} from './constants';

describe('十二次の判定', () => {
  it('境界と負値・360°超の黄経を正しく丸める', () => {
    expect(getHouseAtLongitude(0).name).toBe('白羊');
    expect(getHouseAtLongitude(29.999).name).toBe('白羊');
    expect(getHouseAtLongitude(30).name).toBe('金牛');
    expect(getHouseAtLongitude(359.99).name).toBe('双魚');
    expect(getHouseAtLongitude(360).name).toBe('白羊');
    expect(getHouseAtLongitude(-1).name).toBe('双魚');
  });

  it('十二次と地支の対応が伝統通り (白羊=戌 … 双魚=亥)', () => {
    expect(getHouseAtLongitude(0).branch).toBe('戌');
    expect(getHouseAtLongitude(210).branch).toBe('卯'); // 天蝎
    expect(getHouseAtLongitude(330).branch).toBe('亥');
  });
});

describe('人事十二宮 (整宮制・命宮から黄経順行)', () => {
  it('命宮の在る十二次全体が命宮になる', () => {
    const asc = 238.907; // 基準命盤の命度。天蝎(卯)宮 210〜240° の途中
    expect(getHouseAtLongitude(asc).name).toBe('天蝎');
    expect(getPersonHouseAt(210, asc).name).toBe('命宮'); // 宮の起点も
    expect(getPersonHouseAt(239.99, asc).name).toBe('命宮'); // 宮の末尾も命宮
    expect(getPersonHouseAt(240, asc).name).toBe('財帛宮'); // 次の十二次から財帛宮
    expect(getPersonHouseAt(209.99, asc).name).toBe('相貌宮'); // 一つ手前の宮
  });

  it('命宮から黄経+30°ごとに 命→財帛→兄弟→田宅… と進む', () => {
    const asc = 210; // 天蝎(卯)宮の起点
    const expected = ['命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮',
                      '妻妾宮', '疾厄宮', '遷移宮', '官禄宮', '福徳宮', '相貌宮'];
    expected.forEach((name, i) => {
      expect(getPersonHouseAt(210 + i * 30 + 15, asc).name, `${i}宮目`).toBe(name);
    });
  });

  it('盤上の地支は命宮から逆行する (卯→寅→丑→子…)', () => {
    const asc = 210; // 天蝎(卯)
    expect(getHouseAtLongitude(210).branch).toBe('卯'); // 命宮
    expect(getHouseAtLongitude(240).branch).toBe('寅'); // 財帛宮
    expect(getHouseAtLongitude(270).branch).toBe('丑'); // 兄弟宮
    expect(getPersonHouseAt(240, asc).name).toBe('財帛宮');
    expect(getPersonHouseAt(270, asc).name).toBe('兄弟宮');
  });

  it('0°をまたいでも宮の順序が保たれる', () => {
    const asc = 330; // 双魚(亥)宮
    expect(getPersonHouseAt(330, asc).name).toBe('命宮');
    expect(getPersonHouseAt(0, asc).name).toBe('財帛宮'); // 白羊へ回り込む
    expect(getPersonHouseAt(30, asc).name).toBe('兄弟宮');
  });

  it('十二宮の名称が伝統の並びで12個ある', () => {
    expect(PERSON_HOUSES).toHaveLength(12);
    expect(PERSON_HOUSES[0]).toBe('命宮');
    expect(PERSON_HOUSES[6]).toBe('妻妾宮'); // 命宮の対宮
    expect(PERSON_HOUSES[9]).toBe('官禄宮');
  });
});

describe('入宿度', () => {
  it('宿の起点は初度、360°法の度数は0になる', () => {
    const jiao = SIDEREAL_MANSIONS.find(m => m.name === '角')!;
    const pos = getMansionPosition(jiao.startLongitude, 0);
    expect(pos.mansion.name).toBe('角');
    expect(pos.degree).toBeCloseTo(0, 6);
    expect(pos.label).toBe('角宿 0.00°（角初度）');
  });

  it('360°法と古度(365.25度周天)を併記する', () => {
    const liu = SIDEREAL_MANSIONS.find(m => m.name === '柳')!;
    const pos = getMansionPosition(liu.startLongitude + 12.0, 0);
    expect(pos.mansion.name).toBe('柳');
    expect(pos.degree).toBeCloseTo(12.0, 6);
    // 12.0° × 365.25/360 = 12.175 → 十二度
    expect(pos.ancientDegree).toBeCloseTo(12.175, 3);
    expect(pos.label).toBe('柳宿 12.00°（柳十二度）');
  });

  it('古度の漢数字表記が10・20台でも正しい', () => {
    // 古度 = 360°法の度数 × 365.25/360 なので、360°法より僅かに大きい値になる
    const jing = SIDEREAL_MANSIONS.find(m => m.name === '井')!; // 幅30.427°と最大
    const label = (deg: number) => getMansionPosition(jing.startLongitude + deg, 0).label;
    expect(label(8.9)).toContain('井九度');    // 9.030 古度
    expect(label(9.9)).toContain('井十度');    // 10.045 古度
    expect(label(20.7)).toContain('井二十一度'); // 21.002 古度
    expect(label(29.6)).toContain('井三十度');  // 30.032 古度
  });

  it('入宿度は必ず0以上、その宿の幅未満に収まる', () => {
    for (const m of SIDEREAL_MANSIONS) {
      for (const frac of [0, 0.25, 0.5, 0.99]) {
        const lon = (m.startLongitude + m.width * frac) % 360;
        const pos = getMansionPosition(lon, 0);
        expect(pos.degree, `${m.name} frac=${frac}`).toBeGreaterThanOrEqual(0);
        expect(pos.degree, `${m.name} frac=${frac}`).toBeLessThan(pos.mansion.width + 0.002);
      }
    }
  });

  it('境界とオフセットの丸め誤差でも 360° や undefined にならない', () => {
    // getMansionAtLongitude と判定が食い違うと「宿undefined十五度」のような表示になる
    for (const off of [0, 20.28, 23.857, 24.206, 359.1]) {
      for (const m of SIDEREAL_MANSIONS) {
        const pos = getMansionPosition(m.startLongitude + off, off);
        expect(pos.mansion.name, `${m.name} offset=${off}`).toBe(m.name);
        expect(pos.degree, `${m.name} offset=${off}`).toBeLessThan(1);
        expect(pos.label, `${m.name} offset=${off}`).not.toContain('undefined');
      }
    }
  });

  it('トロピカル命盤でも mansionOffset で正しい入宿度になる', () => {
    const jiao = SIDEREAL_MANSIONS.find(m => m.name === '角')!;
    const offset = 24.206; // 2025年のLahiri値
    const pos = getMansionPosition(jiao.startLongitude + 5 + offset, offset);
    expect(pos.mansion.name).toBe('角');
    expect(pos.degree).toBeCloseTo(5, 6);
  });
});
