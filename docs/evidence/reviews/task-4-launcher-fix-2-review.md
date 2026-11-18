# Task 4 launcher fix 2 — apostrophe credential redaction

**Disposition: addressed. Spec Compliance: pass. Task Quality: pass.** The residual Important finding from fix 1 is closed at `762c429be21cfef08187ebb7b86d1bf7c64e204e`. No new Important or Minor finding arose within this repair. Against base `afa7fd25606db19b9b915cb915ba295cdecda00c`, the commit changes only the launcher logger and its core test.

## Evidence

- The URL match at `desktop-launcher/src/main/logger.ts:143` includes a literal apostrophe within PostgreSQL credentials through the authority delimiter. It still permits an enclosing single quote to terminate the displayed URL after the endpoint. The full URL goes to the existing URL parser, which replaces its password at line 147. Percent-encoded apostrophes follow the same path.
- The regression at `desktop-launcher/src/tests/launcher-core-test.ts:75` covers leading and embedded apostrophes in punctuation-heavy passwords. Line 87 uses the production configuration helper, and line 94 builds both the helper's literal form and its percent-encoded counterpart. Current records enter through the real logger; historical records are written directly to a temporary server log at line 96. This exercises archive-time sanitization for records that predate the repair.
- The real TXT export is checked for full forms and unique password fragments at `desktop-launcher/src/tests/launcher-core-test.ts:137`. The test also requires the labeled current entries to contain the complete quoted, redacted IPv6 URL. Every file in the ZIP is scanned at line 164. The archived server log must retain each labeled current and historical entry in both spellings, including the masked password, IPv6 host, port, database path and schema query option at line 169. These positive assertions prevent a missing log line from passing as correct redaction.
- I inspected the supplied diff, tracked file list, assertions and verification logs. The logs show 54/63 before the repair and 63/63 afterward. The implementation report records exit 1 and exit 0 respectively and a successful launcher main TypeScript build. I did not rerun those commands.

## Declined judgments

This review covers the remaining PostgreSQL apostrophe finding and regressions introduced by its two-file repair. The previously closed environment precedence and Auto-Setup findings were not reopened. Native Windows, packaging, live database behavior, gameplay, admin and whole-branch acceptance are outside this review. No working environment file or shared runtime was accessed.
