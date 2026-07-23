import { SchoolConfig } from '../qizhengsiyu/schoolConfig';

export interface BirthInput {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  timeAccuracy: 'exact' | 'approximate' | 'unknown';
  latitude: number;
  longitude: number;
  timezoneOffset: number; // hours from UTC
  isDaylightSaving?: boolean;
}

export interface CelestialPosition {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  isRetrograde: boolean;
}

export interface ChartAngles {
  ascendant: number;
  midheaven: number;
  // サイデリアル(Lahiri)基準の二十八宿境界を命盤座標系へ写すためのずれ (度)。
  // 恒星黄道(Lahiri)の命盤では0。トロピカル命盤ではその日のLahiriアヤナムシャ値になる。
  mansionOffset: number;
}

export interface EphemerisProviderInfo {
  name: string;
  version: string;
  description: string;
}

export interface EphemerisProvider {
  calculateBodies(input: BirthInput, config?: SchoolConfig): Promise<CelestialPosition[]>;
  calculateAngles(input: BirthInput, config?: SchoolConfig): Promise<ChartAngles>;
  getProviderInfo(): EphemerisProviderInfo;
}

