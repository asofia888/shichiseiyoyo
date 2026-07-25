import { describe, it, expect } from 'vitest';
import {
  ganzhiOfYear, getBirthYearGanzhi, getRisshunUtc, getFortuneDirection,
  computeFortune, listDaXian,
} from './fortune';
import { BirthInput } from '../astronomy/types';

const base: Omit<BirthInput, 'birthDate' | 'gender'> = {
  name: 't', birthTime: '14:30', timeAccuracy: 'exact',
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
};
const input = (birthDate: string, gender?: 'male' | 'female'): BirthInput =>
  ({ ...base, birthDate, gender });

describe('干支', () => {
  it('既知の年の干支と一致する', () => {
    expect(`${ganzhiOfYear(1984).stem}${ganzhiOfYear(1984).branch}`).toBe('甲子'); // 甲子の起点
    expect(`${ganzhiOfYear(1988).stem}${ganzhiOfYear(1988).branch}`).toBe('戊辰');
    expect(`${ganzhiOfYear(2024).stem}${ganzhiOfYear(2024).branch}`).toBe('甲辰');
    expect(`${ganzhiOfYear(2026).stem}${ganzhiOfYear(2026).branch}`).toBe('丙午');
  });

  it('60年で一巡する', () => {
    for (const y of [1900, 1984, 2000]) {
      expect(ganzhiOfYear(y + 60).stem).toBe(ganzhiOfYear(y).stem);
      expect(ganzhiOfYear(y + 60).branch).toBe(ganzhiOfYear(y).branch);
    }
  });

  it('陽干は甲丙戊庚壬', () => {
    const yang = ['甲', '丙', '戊', '庚', '壬'];
    for (let y = 1900; y < 1960; y++) {
      expect(ganzhiOfYear(y).isYang, `${y}年 ${ganzhiOfYear(y).stem}`).toBe(yang.includes(ganzhiOfYear(y).stem));
    }
  });

  it('立春は2月3〜5日に来る', () => {
    for (const y of [1900, 1950, 1988, 2000, 2026, 2050]) {
      const d = getRisshunUtc(y);
      expect(d.getUTCMonth(), `${y}年`).toBe(1); // 2月
      expect(d.getUTCDate(), `${y}年`).toBeGreaterThanOrEqual(3);
      expect(d.getUTCDate(), `${y}年`).toBeLessThanOrEqual(5);
    }
  });

  it('立春より前に生まれた場合は前年の干支になる', () => {
    // 1988年の立春は2/4。2/3生まれは1987年(丁卯)扱い
    expect(`${getBirthYearGanzhi(input('1988-02-03'))!.stem}${getBirthYearGanzhi(input('1988-02-03'))!.branch}`).toBe('丁卯');
    expect(`${getBirthYearGanzhi(input('1988-02-05'))!.stem}${getBirthYearGanzhi(input('1988-02-05'))!.branch}`).toBe('戊辰');
  });
});

describe('大限の順逆 (陽男陰女＝順行)', () => {
  const yang = ganzhiOfYear(1988); // 戊辰 = 陽
  const yin = ganzhiOfYear(1989);  // 己巳 = 陰

  it('陽年の男は順行、女は逆行', () => {
    expect(yang.isYang).toBe(true);
    expect(getFortuneDirection(input('1988-08-15', 'male'), yang).direction).toBe('順行');
    expect(getFortuneDirection(input('1988-08-15', 'female'), yang).direction).toBe('逆行');
  });

  it('陰年の男は逆行、女は順行', () => {
    expect(yin.isYang).toBe(false);
    expect(getFortuneDirection(input('1989-08-15', 'male'), yin).direction).toBe('逆行');
    expect(getFortuneDirection(input('1989-08-15', 'female'), yin).direction).toBe('順行');
  });

  it('性別未指定は順行と仮定し、そのことを示す', () => {
    const r = getFortuneDirection(input('1988-08-15'), yang);
    expect(r.direction).toBe('順行');
    expect(r.assumed).toBe(true);
  });
});

describe('大限・小限・流年', () => {
  const ASC = 238.907; // 基準命盤の命度。天蝎(卯)宮

  it('第1大限は命宮そのもので、以後10年ごとに1宮進む', () => {
    const f0 = computeFortune(input('1988-08-15', 'male'), ASC, 1988)!;
    expect(f0.age).toBe(0);
    expect(f0.daXianIndex).toBe(1);
    expect(f0.daXian.houseName).toBe('天蝎');
    expect(f0.daXian.personHouseName).toBe('命宮');
    expect(f0.daXianRange).toEqual([0, 10]);

    const f38 = computeFortune(input('1988-08-15', 'male'), ASC, 2026)!;
    expect(f38.age).toBe(38);
    expect(f38.daXianIndex).toBe(4);
    expect(f38.daXianRange).toEqual([30, 40]);
    // 順行: 天蝎→人馬→磨羯→宝瓶
    expect(f38.daXian.houseName).toBe('宝瓶');
    expect(f38.daXian.personHouseName).toBe('田宅宮');
  });

  it('逆行では大限が反対向きに進む', () => {
    const f = computeFortune(input('1988-08-15', 'female'), ASC, 2026)!;
    expect(f.direction).toBe('逆行');
    // 逆行: 天蝎→天秤→双女→獅子
    expect(f.daXian.houseName).toBe('獅子');
    expect(f.daXian.personHouseName).toBe('官禄宮');
  });

  it('小限は一年一宮で12年周期', () => {
    const at = (year: number) => computeFortune(input('1988-08-15', 'male'), ASC, year)!.xiaoXian;
    expect(at(1988).personHouseName).toBe('命宮');
    expect(at(1989).personHouseName).toBe('財帛宮');
    expect(at(2000).personHouseName).toBe('命宮'); // 12年後に一巡
  });

  it('流年は太歳(年支)が入る十二次', () => {
    const f = computeFortune(input('1988-08-15', 'male'), ASC, 2026)!;
    expect(`${f.liuNianGanzhi.stem}${f.liuNianGanzhi.branch}`).toBe('丙午');
    expect(f.liuNian.branch).toBe('午');
    expect(f.liuNian.houseName).toBe('獅子');
    // 命宮=天蝎(卯)から獅子(午)は10宮目 → 官禄宮
    expect(f.liuNian.personHouseName).toBe('官禄宮');
  });

  it('流年は性別・順逆に依存しない (太歳で決まる)', () => {
    const m = computeFortune(input('1988-08-15', 'male'), ASC, 2026)!;
    const f = computeFortune(input('1988-08-15', 'female'), ASC, 2026)!;
    expect(m.liuNian).toEqual(f.liuNian);
  });

  it('壊れた生年月日・範囲外の年では null を返す (呼び出し側が表示を諦められる)', () => {
    expect(computeFortune({ ...base, birthDate: '', gender: 'male' }, ASC, 2026)).toBeNull();
    expect(computeFortune({ ...base, birthDate: '1988-08-15', birthTime: '', gender: 'male' }, ASC, 2026)).toBeNull();
    expect(computeFortune(input('1988-08-15', 'male'), ASC, 0)).toBeNull();
    expect(computeFortune(input('1988-08-15', 'male'), ASC, 9999)).toBeNull();
    expect(computeFortune(input('1988-08-15', 'male'), ASC, NaN)).toBeNull();
    expect(getBirthYearGanzhi({ ...base, birthDate: '0050-01-01', gender: 'male' })).toBeNull();
  });

  it('大限一覧は12宮ぶんで、年齢が重ならず連続する', () => {
    for (const dir of ['順行', '逆行'] as const) {
      const list = listDaXian(ASC, dir);
      expect(list).toHaveLength(12);
      expect(new Set(list.map(d => d.houseName)).size).toBe(12); // 全宮を1度ずつ
      list.forEach((d, i) => {
        expect(d.range).toEqual([i * 10, (i + 1) * 10]);
      });
    }
  });

  it('順行と逆行では第1大限だけが一致する', () => {
    const fwd = listDaXian(ASC, '順行');
    const bwd = listDaXian(ASC, '逆行');
    expect(fwd[0].houseName).toBe(bwd[0].houseName);
    expect(fwd[1].houseName).not.toBe(bwd[1].houseName);
    expect(fwd[6].houseName).toBe(bwd[6].houseName); // 対宮は一致する
  });
});
