import { Injectable } from '@nestjs/common';

export type PiiType = 'rut' | 'email' | 'phone';

export interface PiiFinding {
  type: PiiType;
  count: number;
}

export interface PiiRedactionResult {
  text: string;
  clean: boolean;
  piiRedacted: boolean;
  found: PiiFinding[];
}

const REDACTED = '[*_REDACTED]';

@Injectable()
export class PiiValidationService {
  private readonly patterns: Array<{ type: PiiType; regex: RegExp }> = [
    { type: 'rut', regex: /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/g },
    { type: 'email', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { type: 'phone', regex: /(?:\+?56\s*)?(?:9\s*)?\d{4}\s*\d{4}\b/g },
  ];

  redact(text: string): PiiRedactionResult {
    let redacted = text ?? '';
    const found: PiiFinding[] = [];

    for (const pattern of this.patterns) {
      const matches = redacted.match(pattern.regex) ?? [];
      if (matches.length > 0) {
        found.push({ type: pattern.type, count: matches.length });
        redacted = redacted.replace(pattern.regex, REDACTED);
      }
    }

    return {
      text: redacted,
      clean: found.length === 0,
      piiRedacted: found.length > 0,
      found,
    };
  }

  scan(text: string): Omit<PiiRedactionResult, 'text'> {
    const result = this.redact(text);
    return {
      clean: result.clean,
      piiRedacted: result.piiRedacted,
      found: result.found,
    };
  }
}
