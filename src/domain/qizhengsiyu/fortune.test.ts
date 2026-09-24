import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  ganzhiOfYear, getBirthYearGanzhi, getRisshunUtc, getFortuneDirection,
  computeFortune, formatAgeRange,
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

describe('大限・小限・流年 (陽男陰女・一宮十年)', () => {
  const ASC = 238.907; // 基準命盤の命度。天蝎(卯)宮

  it('第1大限は命宮そのもので、以後10年ごとに1宮進む', () => {
    const f0 = computeFortune(input('1988-08-15', 'male'), ASC, 1988, 'yinyang_decade')!;
    expect(f0.age).toBe(0);
    expect(f0.daXian!.index).toBe(1);
    expect(f0.daXian!.houseName).toBe('天蝎');
    expect(f0.daXian!.personHouseName).toBe('命宮');
    expect(f0.daXian!.range).toEqual([0, 10]);

    const f38 = computeFortune(input('1988-08-15', 'male'), ASC, 2026, 'yinyang_decade')!;
    expect(f38.age).toBe(38);
    expect(f38.daXian!.index).toBe(4);
    expect(f38.daXian!.range).toEqual([30, 40]);
    // 順行: 天蝎→人馬→磨羯→宝瓶
    expect(f38.daXian!.houseName).toBe('宝瓶');
    expect(f38.daXian!.personHouseName).toBe('田宅宮');
  });

  it('逆行では大限が反対向きに進む', () => {
    const f = computeFortune(input('1988-08-15', 'female'), ASC, 2026, 'yinyang_decade')!;
    expect(f.direction).toBe('逆行');
    // 逆行: 天蝎→天秤→双女→獅子
    expect(f.daXian!.houseName).toBe('獅子');
    expect(f.daXian!.personHouseName).toBe('官禄宮');
  });

  it('小限は一年一宮で12年周期', () => {
    const at = (year: number) => computeFortune(input('1988-08-15', 'male'), ASC, year, 'yinyang_decade')!.xiaoXian;
    expect(at(1988).personHouseName).toBe('命宮');
    expect(at(1989).personHouseName).toBe('財帛宮');
    expect(at(2000).personHouseName).toBe('命宮'); // 12年後に一巡
  });

  it('流年は太歳(年支)が入る十二次', () => {
    const f = computeFortune(input('1988-08-15', 'male'), ASC, 2026, 'yinyang_decade')!;
    expect(`${f.liuNianGanzhi.stem}${f.liuNianGanzhi.branch}`).toBe('丙午');
    expect(f.liuNian.branch).toBe('午');
    expect(f.liuNian.houseName).toBe('獅子');
    // 命宮=天蝎(卯)から獅子(午)は10宮目 → 官禄宮
    expect(f.liuNian.personHouseName).toBe('官禄宮');
  });

  it('流年は性別・順逆に依存しない (太歳で決まる)', () => {
    const m = computeFortune(input('1988-08-15', 'male'), ASC, 2026, 'yinyang_decade')!;
    const f = computeFortune(input('1988-08-15', 'female'), ASC, 2026, 'yinyang_decade')!;
    expect(m.liuNian).toEqual(f.liuNian);
  });

  it('壊れた生年月日・範囲外の年では null を返す (呼び出し側が表示を諦められる)', () => {
    for (const method of ['guolao', 'yinyang_decade'] as const) {
      expect(computeFortune({ ...base, birthDate: '', gender: 'male' }, ASC, 2026, method)).toBeNull();
      expect(computeFortune({ ...base, birthDate: '1988-08-15', birthTime: '', gender: 'male' }, ASC, 2026, method)).toBeNull();
      expect(computeFortune(input('1988-08-15', 'male'), ASC, 0, method)).toBeNull();
      expect(computeFortune(input('1988-08-15', 'male'), ASC, 9999, method)).toBeNull();
      expect(computeFortune(input('1988-08-15', 'male'), ASC, NaN, method)).toBeNull();
    }
    expect(getBirthYearGanzhi({ ...base, birthDate: '0050-01-01', gender: 'male' })).toBeNull();
  });

  it('大限一覧は12宮ぶんで、年齢が重ならず連続する', () => {
    for (const gender of ['male', 'female'] as const) {
      const list = computeFortune(input('1988-08-15', gender), ASC, 2026, 'yinyang_decade')!.daXianList;
      expect(list).toHaveLength(12);
      expect(new Set(list.map(d => d.houseName)).size).toBe(12); // 全宮を1度ずつ
      list.forEach((d, i) => {
        expect(d.range).toEqual([i * 10, (i + 1) * 10]);
      });
    }
  });

  it('順行と逆行では第1大限だけが一致する', () => {
    const fwd = computeFortune(input('1988-08-15', 'male'), ASC, 2026, 'yinyang_decade')!.daXianList;
    const bwd = computeFortune(input('1988-08-15', 'female'), ASC, 2026, 'yinyang_decade')!.daXianList;
    expect(fwd[0].houseName).toBe(bwd[0].houseName);
    expect(fwd[1].houseName).not.toBe(bwd[1].houseName);
    expect(fwd[6].houseName).toBe(bwd[6].houseName); // 対宮は一致する
  });
});

// 『果老星宗』の大限。中氣(太陽の視黄経が30°の倍数)の時刻は天文計算で求め、
// そこから何日後に生まれたかで童限(命宮の年数)を検証する。
describe('大限 (果老星宗・十二宮年分歌)', () => {
  const ASC = 238.907; // 天蝎(卯)宮
  const DAY = 24 * 60 * 60 * 1000;
  // 2020年の夏至 (太陽視黄経90°)
  const geshi = Astronomy.SearchSunLongitude(90, Astronomy.MakeTime(new Date(Date.UTC(2020, 5, 1))), 40)!.date;
  // 分単位の入力に直す (秒は切り捨てられる)
  const bornAt = (d: Date, gender: 'male' | 'female' = 'male'): BirthInput => ({
    name: 't', timeAccuracy: 'exact', latitude: 0, longitude: 0, timezoneOffset: 0, gender,
    birthDate: d.toISOString().slice(0, 10), birthTime: d.toISOString().slice(11, 16),
  });
  const fortune = (d: Date, targetYear: number, gender: 'male' | 'female' = 'male') =>
    computeFortune(bornAt(d, gender), ASC, targetYear, 'guolao')!;

  it('童限は直前の中氣からの日数を三日一年に換算し十年を加える', () => {
    // 中氣の直後なら10年、15日後なら15年、30日後なら20年
    expect(fortune(new Date(geshi.getTime() + 90 * 1000), 2026).tongXianYears).toBeCloseTo(10, 2);
    expect(fortune(new Date(geshi.getTime() + 15 * DAY), 2026).tongXianYears).toBeCloseTo(15, 2);
    expect(fortune(new Date(geshi.getTime() + 30 * DAY), 2026).tongXianYears).toBeCloseTo(20, 2);
    // 中氣の直前なら一つ前の中氣(小満、約31日前)まで数えるので20年を超える
    const before = fortune(new Date(geshi.getTime() - 90 * 1000), 2026).tongXianYears!;
    expect(before).toBeGreaterThan(20);
    expect(before).toBeLessThan(20.6);
  });

  it('命宮から相貌宮・福徳宮・官禄宮…と逆行し、年数は十二宮年分歌に従う', () => {
    const list = fortune(new Date(geshi.getTime() + 15 * DAY), 2026).daXianList;
    expect(list.map(d => d.personHouseName)).toEqual([
      '命宮', '相貌宮', '福徳宮', '官禄宮', '遷移宮', '疾厄宮',
      '妻妾宮', '奴僕宮', '男女宮', '田宅宮', '兄弟宮', '財帛宮',
    ]);
    const years = list.map(d => Math.round((d.range[1] - d.range[0]) * 100) / 100);
    expect(years).toEqual([15, 10, 11, 15, 8, 7, 11, 4.5, 4.5, 4.5, 5, 5]);
    // 黄経では逆行: 天蝎→天秤→双女…
    expect(list.slice(0, 3).map(d => d.houseName)).toEqual(['天蝎', '天秤', '双女']);
    // 期間は隙間なく連続する
    list.slice(1).forEach((d, i) => expect(d.range[0]).toBeCloseTo(list[i].range[1], 9));
  });

  it('童限が15年なら疾厄宮の終わりは66歳 (歌訣の「共六六」)', () => {
    const list = fortune(new Date(geshi.getTime() + 15 * DAY), 2026).daXianList;
    const jie = list.find(d => d.personHouseName === '疾厄宮')!;
    expect(jie.range[1]).toBeCloseTo(66, 2);
  });

  it('鑑定年の満年齢が入る期間を現在の大限とし、年分歌の範囲を超えたら立てない', () => {
    const born = new Date(geshi.getTime() + 15 * DAY); // 童限 ≈ 15年 (15年ちょうどより数十秒短い)
    expect(fortune(born, 2034).daXian!.personHouseName).toBe('命宮'); // 14歳
    expect(fortune(born, 2035).daXian!.personHouseName).toBe('相貌宮'); // 15歳
    expect(fortune(born, 2035).daXian!.index).toBe(2);
    expect(fortune(born, 2120).daXian!.personHouseName).toBe('財帛宮'); // 100歳 (95.5〜100.5)
    expect(fortune(born, 2121).daXian).toBeNull(); // 101歳
  });

  it('大限・小限とも男女・陰陽年で変わらない', () => {
    for (const d of [new Date(geshi.getTime() + 15 * DAY), new Date(Date.UTC(1989, 7, 15, 5, 30))]) {
      const m = fortune(d, 2026, 'male');
      const f = fortune(d, 2026, 'female');
      expect(m.daXianList).toEqual(f.daXianList);
      expect(m.xiaoXian).toEqual(f.xiaoXian);
      expect(m.direction).toBe('逆行');
      expect(m.directionAssumed).toBe(false);
    }
  });

  it('小限は一歳(出生の年)を命宮とし、財帛宮・兄弟宮と一年一宮で進む', () => {
    const born = new Date(Date.UTC(1989, 7, 15, 5, 30)); // 己巳 = 陰年
    for (const gender of ['male', 'female'] as const) {
      expect(fortune(born, 1989, gender).xiaoXian.personHouseName).toBe('命宮');
      expect(fortune(born, 1990, gender).xiaoXian.personHouseName).toBe('財帛宮');
      expect(fortune(born, 1991, gender).xiaoXian.personHouseName).toBe('兄弟宮');
      expect(fortune(born, 2001, gender).xiaoXian.personHouseName).toBe('命宮'); // 12年で一巡
    }
  });

  it('年齢の範囲は小数1桁で表し、整数には小数点を付けない', () => {
    expect(formatAgeRange([0, 13.4333])).toBe('0〜13.4歳');
    expect(formatAgeRange([95.5, 100.5])).toBe('95.5〜100.5歳');
    expect(formatAgeRange([30, 40])).toBe('30〜40歳');
  });
});
