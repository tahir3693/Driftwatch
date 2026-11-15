import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as T from './groundReportText.js'

describe('groundReportText', () => {
  it('has the exact fixed strings', () => {
    expect(T.GROUND_REPORT_TITLE).toBe('Ground report')
    expect(T.GROUND_REPORT_SIMULATED_LINE).toBe('All data in this report is simulated. Decision support only, not a medical device.')
    expect(T.NO_ACTIVE_ALERTS).toBe('No active alerts in the last 7 days.')
    expect(T.NO_ESCALATIONS).toBe('No open escalations.')
    expect(T.NO_READINGS).toBe('No readings in the last 7 days.')
    expect(T.LOADING_DATA).toBe('Loading data')
    expect(T.CAPPED_NOTE).toBe('Lists are shortened to fit one page. Open the dashboard for the full detail.')
    expect(T.PRINT_LABEL).toBe('Print or Save as PDF')
    expect(T.NO_DATA_LABEL).toBe('No data')
    expect(T.HEADING_MODULES).toBe('Module status')
    expect(T.HEADING_ESCALATIONS).toBe('Open escalations')
    expect(T.HEADING_ALERTS).toBe('Active alerts')
    expect(T.HEADING_READINGS).toBe('Last readings')
    expect(T.RECOMMENDED_ACTION_LABEL).toBe('Recommended action')
  })

  it('builds the "more" lines', () => {
    expect(T.moreAlertsText(1)).toBe('and 1 more')
    expect(T.moreAlertsText(12)).toBe('and 12 more')
    expect(T.moreReadingsText(1)).toBe('and 1 more readings')
    expect(T.moreReadingsText(12)).toBe('and 12 more readings')
  })

  it('has no 250 and no NASA in its source', () => {
    const code = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'groundReportText.js'), 'utf8')
    expect(code).not.toMatch(/\b250\b/)
    expect(code).not.toMatch(/NASA/)
  })
})
