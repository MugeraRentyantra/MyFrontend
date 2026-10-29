/**
 * Submission and review text used to seed realistic task history (ticket GP1). Pure data.
 *
 * SUBMISSION_DESCRIPTIONS[i] is written for java-banking task T(i + 1) (index 0 = T1 ... 11 = T12),
 * so the main demo student (Java / Banking) gets matching descriptions. Every string is
 * 120-300 characters (the API minimum is 50).
 * REVIEW_FEEDBACK is generic enough for any task; CHANGES_REQUESTED items are specific and actionable.
 */

export const SUBMISSION_DESCRIPTIONS = [
  'I created my copy of the starter, installed JDK 17 and Maven 3.9 and ran mvn clean verify, which passed with 42 tests. My inspection notes cover the package layout, build commands, branch naming rule and commit message format.',
  'I reproduced LEDGER-101 with the sample request: a transfer of exactly the available balance (5,000.00) was rejected. The funds check rejected when balance.compareTo(amount) <= 0 instead of < 0. I fixed the comparison, reran the request and all tests, and wrote the RCA note.',
  'I merged feature/statement-export into my bugfix branch and resolved the conflicts in TransferService and application.yml, keeping both the fix and the new export endpoint. mvn clean verify passes, and I described each conflict in the pull request.',
  'I opened PR #7 against main with every template section filled in: problem, root cause, fix, testing and risk, linked to LEDGER-101. CI is green. I answered both review comments and pushed a follow-up commit that renames the validator method.',
  'I added a parameterised regression test for the funds check covering equal, one paisa above, one paisa below, zero and negative amounts. The equal-balance case fails without the fix and passes with it. All 51 tests pass; the report is attached.',
  'I followed the release SOP for 1.1.0: created release/1.1.0, set the version with mvn versions:set, added LEDGER-101 and the statement export to CHANGELOG.md, ran mvn clean verify, tagged v1.1.0 and opened the merge back into main.',
  'I reproduced LEDGER-117 with a failing test for a transfer at 00:30 IST on 1 November. Statement dates were derived in UTC, so it landed in October. I now convert with ZoneId Asia/Kolkata, added month-boundary tests and opened PR #11 with an RCA note.',
  'I wrote docs/requirements/transactions.md with the INITIATED, PENDING, POSTED, FAILED and REVERSED states and their allowed transitions, nine validation rules with error codes and HTTP statuses, and idempotency rules for retried requests.',
  'I implemented POST /api/transfers, GET /api/transfers/{id} and the paginated account history. Rules live in TransferService, errors map through one controller advice and 23 Mockito tests cover each rule. A repeated Idempotency-Key returns the original transfer.',
  'I added a filter that reads or generates X-Correlation-Id and puts it in the MDC, switched Logback to JSON and masked account numbers. Unknown errors now return 500 in the standard format. Tests cover three failure cases; log samples are in the screenshots.',
  'I added Flyway migrations for account, transfer and ledger_entry, and each transfer now runs in one @Transactional method with locks taken in account-ID order. Testcontainers tests prove rollback after a failed credit and no overdraft under 20 parallel transfers.',
  'I tagged v1.2.0 and ran the acceptance suite: all 18 scenarios pass. My demo shows a successful transfer, an insufficient-funds rejection, a reversal and a trace by correlation ID. The README covers setup, configuration and known limitations.',
];

export const REVIEW_FEEDBACK = {
  APPROVED: [
    'Clean, focused change with a clear description. The tests cover the boundary cases I would have asked for. Approved.',
    'Good work. The commit history is easy to follow, and the README steps worked first time on my machine.',
    'Approved. Including the failure scenario in your screenshots made this review much faster. Keep doing that.',
    'Solid submission. Error handling is consistent and the naming is clear. Carry the same discipline into the next task.',
    'Approved. Your note explains why the problem happened, not just what you changed. That is exactly the standard we expect.',
  ],
  CHANGES_REQUESTED: [
    'The GitHub link points to the repository home page. Please submit the URL of the pull request or the exact commit for this task so that I can review the changes.',
    'Your tests cover only the success path. Add tests for invalid input and for the boundary values in the acceptance criteria, then resubmit with the updated test report.',
    'A database password is committed in a configuration file. Move it to an environment variable or user secrets, add an example file without real values, and resubmit.',
    'The description says what you built but not how you tested it. Add the commands you ran and their results, and include a screenshot of the passing test run.',
    'Errors are caught and logged, but the API still returns 200 with an error message. Return the correct status code in the agreed error format and add a test for each error case.',
    'This pull request mixes formatting changes with the actual fix, which makes it hard to review. Move the formatting into a separate commit or pull request and resubmit the focused change.',
  ],
  REJECTED: [
    'This submission is for a different task and does not address any of the acceptance criteria. Please read the task instructions again and submit work for this task.',
    'The linked repository is empty and the screenshots do not show your own work. Push your code and submit again with screenshots of your running solution.',
  ],
};
