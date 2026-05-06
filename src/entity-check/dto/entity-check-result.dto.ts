export interface PhishTankResultDto {
  in_database: boolean;
  verified: boolean;
  valid_phish: boolean;
  phish_detail_url?: string;
}

export interface EntityCheckResultDto {
  name?: string;
  registered: boolean;
  isImitator: boolean;
  source: string;
  evidence?: string;
  phishtank?: PhishTankResultDto;
  _mocked: boolean;
}
