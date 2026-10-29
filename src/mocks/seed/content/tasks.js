/**
 * Task definitions per schedule template (tickets GP1, MM10). Pure data: no imports.
 *
 * TASK_TEMPLATES[templateKey] = [{ key, dayNumber, title, problemStatement, expectedOutcome,
 *   acceptanceCriteria: string[], starterRepoUrl, estimatedHours, requiresTrainerReview,
 *   prerequisiteKeys: string[] }]
 * Keys are "T1".."Tn" (sequence = array order). prerequisiteKeys refer to keys in the same template
 * and contain no cycles. templateKey matches SCHEDULE_TEMPLATES[].key in ./schedules.js, and every
 * dayNumber exists in that template.
 */

const JAVA_BANKING_REPO = 'https://github.com/internship-portal/java-banking-starter';
const FULLSTACK_ECOMMERCE_REPO =
  'https://github.com/internship-portal/fullstack-ecommerce-starter';
const DEVOPS_TELECOM_REPO = 'https://github.com/internship-portal/devops-telecom-starter';
const DOTNET_HEALTHCARE_REPO = 'https://github.com/internship-portal/dotnet-healthcare-starter';

export const TASK_TEMPLATES = {
  'java-banking': [
    {
      key: 'T1',
      dayNumber: 1,
      title: 'Set up the repository and project conventions',
      problemStatement:
        'You are joining the team that maintains LedgerCore, the account and fund-transfer service of a retail bank. Before you change any code you need a working local environment and a clear picture of how the repository is organised. Create your own copy of the starter repository, build it and run the full test suite. Then document the package layout, build commands, branch naming rule and commit message format that the team follows.',
      expectedOutcome:
        'A local environment that builds and passes every test, and inspection notes that a new joiner could follow on their first day.',
      acceptanceCriteria: [
        'mvn clean verify finishes with BUILD SUCCESS on your machine',
        'docs/inspection-notes.md describes the packages, build commands, branch naming rule and commit format',
        'Your work is pushed on a branch that follows the type/short-description naming rule',
        'The submission includes a screenshot of the successful build and test summary',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 3,
      requiresTrainerReview: false,
      prerequisiteKeys: [],
    },
    {
      key: 'T2',
      dayNumber: 2,
      title: 'Reproduce and fix a reported defect',
      problemStatement:
        'Customers report that a transfer for exactly their available balance is rejected with INSUFFICIENT_FUNDS (defect LEDGER-101), while a transfer of one rupee less goes through. Branch staff are raising manual workarounds every day. Reproduce the defect locally with the sample request, trace it to its root cause in the funds validation and fix it with the smallest safe change. Record a root-cause analysis so that the operations team understands what went wrong and which customers were affected.',
      expectedOutcome:
        'Transfers equal to the available balance succeed, transfers above it are still rejected, and an RCA note explains the cause and the fix.',
      acceptanceCriteria: [
        'The defect is reproduced and the failing request is recorded in the RCA note',
        'A transfer equal to the available balance is accepted and leaves a zero balance',
        'A transfer one paisa above the available balance is still rejected with INSUFFICIENT_FUNDS',
        'The fix is on a fix/LEDGER-101 branch and contains no unrelated changes',
        'docs/rca/LEDGER-101.md covers symptom, root cause, fix and impact',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 5,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T1'],
    },
    {
      key: 'T3',
      dayNumber: 3,
      title: 'Resolve merge conflicts on a feature branch',
      problemStatement:
        'While you were fixing LEDGER-101, another developer added statement export to the same TransferService and changed application.yml on the feature/statement-export branch. Merging the two branches now produces conflicts. Resolve them so that both the bug fix and the statement export keep working, without silently dropping either change. Explain each conflict and how you combined the two sides.',
      expectedOutcome:
        'A merge commit that keeps both changes, with the full test suite passing and a short note for every resolved conflict.',
      acceptanceCriteria: [
        'No conflict markers remain anywhere in the repository',
        'The LEDGER-101 fix and the statement export endpoint both work after the merge',
        'mvn clean verify passes on the merged branch',
        'The merge commit message names the branch that was merged',
        'Each conflict and its resolution is described in the submission',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 4,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T4',
      dayNumber: 4,
      title: 'Open a pull request with a clear description',
      problemStatement:
        'The change-management policy of the bank requires every change to the ledger to go through a reviewed pull request. Open a pull request for your LEDGER-101 work against main using the pull request template in the repository. The description must let a reviewer understand the problem, root cause, fix, testing and risk without running the code. Respond to every review comment until the pull request is approved.',
      expectedOutcome:
        'An approved pull request whose title, description and commit history form a complete audit trail of the change.',
      acceptanceCriteria: [
        'The title follows the conventional format, for example fix: allow transfers of the exact available balance',
        'The description covers problem, root cause, fix, testing and risk, and links LEDGER-101',
        'All checks are green on the latest commit',
        'Every review comment has a reply or a follow-up commit',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 3,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T3'],
    },
    {
      key: 'T5',
      dayNumber: 5,
      title: 'Write regression tests for the fixed defect',
      problemStatement:
        'The operations team wants proof that LEDGER-101 cannot return in a future release. Write automated tests that fail on the code before your fix and pass after it. Cover the boundary values of the funds check: an amount equal to the balance, one paisa above and below it, zero and a negative amount. Publish the test results with a short bug-fix summary for the release notes.',
      expectedOutcome:
        'A regression suite that pins the corrected behaviour, with a test report and a bug-fix summary ready for the release notes.',
      acceptanceCriteria: [
        'At least one test fails when the fix is reverted and passes with the fix in place',
        'Equal, above, below, zero and negative amounts are covered with parameterised tests',
        'Amounts in the tests use BigDecimal, never double',
        'mvn clean verify passes and the test report is attached as a screenshot',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 4,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T6',
      dayNumber: 6,
      title: 'Complete the release checklist (SOP)',
      problemStatement:
        'LedgerCore release 1.1.0 contains your LEDGER-101 fix and the statement export feature. Releases of banking software are audited, so every step of the release SOP must be followed and recorded. Create the release branch, set the version, update the changelog, run the full verification, tag the release and merge it back. Complete the release checklist in the portal as you go.',
      expectedOutcome:
        'Release 1.1.0 is tagged with a matching version and changelog, and every item of the release checklist is complete.',
      acceptanceCriteria: [
        'pom.xml, CHANGELOG.md and the Git tag all show version 1.1.0',
        'The changelog lists LEDGER-101 and the statement export with their IDs',
        'Tag v1.1.0 is pushed and points to a commit with a green build',
        'The release branch is merged back into main',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 3,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T4', 'T5'],
    },
    {
      key: 'T7',
      dayNumber: 7,
      title: 'Consolidation exercise',
      problemStatement:
        'A branch manager in Pune reports that transfers made just after midnight appear in the statement for the previous month (defect LEDGER-117). Handle this defect on your own from start to finish using the SOPs from this week. Reproduce it with a failing test, find the root cause, fix it, add boundary tests and open a pull request with an RCA note. Your trainer will review it exactly as a production change.',
      expectedOutcome:
        'LEDGER-117 is fixed with tests around midnight and month-end boundaries, documented in an RCA note and approved through a reviewed pull request.',
      acceptanceCriteria: [
        'A failing test reproduces LEDGER-117 before the fix',
        'Statement periods are calculated explicitly in the Asia/Kolkata time zone, not the server default',
        'Tests cover 23:59 and 00:01 IST on the last and first day of a month',
        'The pull request includes an RCA note and passes all checks',
        'All trainer feedback is addressed with follow-up commits',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 6,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T6'],
    },
    {
      key: 'T8',
      dayNumber: 8,
      title: 'Define transaction states and validation rules',
      problemStatement:
        'The bank is adding scheduled and instant transfers to LedgerCore, and the API team needs agreed rules before anyone writes code. Define the lifecycle of a transfer, including which state changes are allowed and what triggers them. Specify validation rules with exact limits for amounts, accounts and daily totals, and one error format with stable error codes. This document becomes the contract for the APIs you build next.',
      expectedOutcome:
        'A reviewed requirements document with a state model, validation rules and an error catalogue that the transaction APIs can be built and tested against.',
      acceptanceCriteria: [
        'States INITIATED, PENDING, POSTED, FAILED and REVERSED are defined with their allowed transitions',
        'Each validation rule states an exact limit, an error code and an HTTP status',
        'One JSON error format is used for every error response',
        'Retried requests are handled with an idempotency key',
        'The document is committed under docs/requirements',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 4,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T1'],
    },
    {
      key: 'T9',
      dayNumber: 9,
      title: 'Build the transaction APIs',
      problemStatement:
        'Using the requirements you defined, build the REST endpoints that create a transfer, fetch it by ID and list the transfers of an account with pagination. Keep controllers thin and put business rules in the service layer so that they can be unit tested. Map every domain error to the agreed error format. A transfer request repeated with the same idempotency key must never create a second transfer.',
      expectedOutcome:
        'Working transfer endpoints that enforce the documented rules, with unit tests for the service layer.',
      acceptanceCriteria: [
        'POST /api/transfers, GET /api/transfers/{id} and GET /api/accounts/{id}/transfers work as documented',
        'Invalid input returns 400 and business-rule violations return 422 with the agreed error body',
        'Repeating a request with the same Idempotency-Key returns the original transfer',
        'Service-layer unit tests cover every validation rule and state transition',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 10,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T8'],
    },
    {
      key: 'T10',
      dayNumber: 10,
      title: 'Add structured logging and error handling',
      problemStatement:
        'During a recent incident the support team could not trace a failed transfer because the logs were plain text with no request identifiers. Add structured JSON logging with a correlation ID that follows each request through the service. Handle errors centrally so that clients always receive the agreed error format and never see a stack trace. Account numbers must be masked in every log line.',
      expectedOutcome:
        'Every request can be traced end to end through JSON logs with a correlation ID, and all errors reach clients in one safe, consistent format.',
      acceptanceCriteria: [
        'Each log line is JSON and includes timestamp, level, correlationId and message',
        'The X-Correlation-Id header is read or generated and returned in the response',
        'Unhandled exceptions return 500 in the agreed format without a stack trace',
        'Account numbers appear masked in logs, for example XXXXXX4821',
        'Tests verify the error responses for at least three failure cases',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 6,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T11',
      dayNumber: 12,
      title: 'Implement persistence and transaction handling',
      problemStatement:
        'Transfers are currently held in memory and are lost whenever the service restarts. Persist accounts, transfers and ledger entries in PostgreSQL using JPA and Flyway migrations. A transfer must debit one account, credit the other and write both ledger entries in a single database transaction, so that a failure at any step leaves no partial update. Balances must stay correct when several transfers hit the same account at once.',
      expectedOutcome:
        'Transfers survive restarts, and every transfer is atomic: either all balance and ledger changes are saved or none are.',
      acceptanceCriteria: [
        'Flyway migrations create the full schema on an empty database',
        'A failure after the debit rolls back both balance changes and the ledger entries',
        'Concurrent transfers from the same account never produce a negative balance',
        'Integration tests run against PostgreSQL, for example with Testcontainers',
        'Total debits equal total credits in the ledger after the integration tests',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 10,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T9'],
    },
    {
      key: 'T12',
      dayNumber: 14,
      title: 'Final review: demo and acceptance tests',
      problemStatement:
        'LedgerCore is ready for sign-off. Prepare the final repository, run the acceptance test suite supplied by the bank and demonstrate the main flows to your trainer: a successful transfer, a rejected transfer, a reversal and tracing a request through the logs. Your README must let another engineer run the service and the tests from a fresh clone. Close with the known limitations and what you would improve next.',
      expectedOutcome:
        'A tagged final release that passes the acceptance tests, a recorded demo of the main flows and documentation that lets anyone run the project.',
      acceptanceCriteria: [
        'The acceptance test suite passes on the final tagged commit',
        'The demo shows a successful, a rejected and a reversed transfer, and a log trace by correlation ID',
        'The README covers setup, configuration, running, testing and API examples',
        'Known limitations and next steps are listed in the final submission',
      ],
      starterRepoUrl: JAVA_BANKING_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T7', 'T11', 'T10'],
    },
  ],

  'fullstack-ecommerce': [
    {
      key: 'T1',
      dayNumber: 1,
      title: 'Set up the storefront workspace',
      problemStatement:
        'BazaarLane, an online store for home and kitchen products, is rebuilding its storefront on the MERN stack. Set up the starter monorepo with the React client and the Express API connected to a local MongoDB instance. Configure environment variables, linting and formatting so that every developer works the same way. Document how to run the project and the branch and commit conventions.',
      expectedOutcome:
        'Both the client and the API run locally from documented commands, linting passes and the health check returns ok.',
      acceptanceCriteria: [
        'npm run dev starts the client and the API, and GET /api/health returns status ok',
        'Secrets live in git-ignored .env files, and .env.example files are committed',
        'npm run lint passes for the client and the server',
        'The setup notes describe scripts, ports and branch naming',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 3,
      requiresTrainerReview: false,
      prerequisiteKeys: [],
    },
    {
      key: 'T2',
      dayNumber: 3,
      title: 'Build the product catalogue',
      problemStatement:
        'Shoppers need to browse about 500 products across categories such as cookware, storage and lighting. Build a products API with search, category filter, price sort and pagination backed by MongoDB, and the React listing and product detail pages that use it. Pages must handle loading, empty and error states and work well on a phone. Prices are stored as integers in paise and formatted in rupees only in the interface.',
      expectedOutcome:
        'Shoppers can search, filter, sort and page through products and open a product detail page on any screen size.',
      acceptanceCriteria: [
        'GET /api/products supports search, category, sort and page and returns { items, page, limit, total }',
        'Query parameters are validated on the server and the page size is capped at 50',
        'Listing and detail pages show skeletons while loading and a clear message when nothing matches',
        'Prices are stored in paise and displayed in rupees with Indian digit grouping',
        'Pages have no horizontal scroll at 360 px width',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 10,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T1'],
    },
    {
      key: 'T3',
      dayNumber: 4,
      title: 'Implement the shopping cart',
      problemStatement:
        'Shoppers want to add products to a cart, change quantities and see the total update immediately. Build the cart in React with a reducer and context, and keep it across page refreshes. Quantities cannot go below one or above the available stock, and the server must confirm prices and stock before checkout. Show a mini-cart summary in the header on every page.',
      expectedOutcome:
        'A cart that survives refreshes, respects stock limits and always agrees with the server on the total.',
      acceptanceCriteria: [
        'Adding, removing and updating items change the header count and subtotal immediately',
        'The cart is restored after a page refresh',
        'Quantities are limited to between 1 and the available stock',
        'Unit tests cover the cart reducer for add, update, remove and clear',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 6,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T4',
      dayNumber: 5,
      title: 'Add customer sign-up and login',
      problemStatement:
        'Guests can browse, but placing an order requires an account. Add registration and login to the API with hashed passwords, short-lived JWT access tokens and a refresh token in an httpOnly cookie. In the React app, add sign-up and login pages and protect the checkout and order history routes. Return the same error for a wrong email and a wrong password so that attackers cannot discover registered emails.',
      expectedOutcome:
        'Customers can register, log in and stay signed in safely, and protected pages send guests to the login page.',
      acceptanceCriteria: [
        'Passwords are hashed with bcrypt and never returned by any endpoint',
        'A wrong email and a wrong password return the same 401 error',
        'Protected routes redirect to login and return to the original page after sign-in',
        'Login is rate limited to 5 attempts per minute per IP',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T5',
      dayNumber: 7,
      title: 'Build checkout and order placement',
      problemStatement:
        'BazaarLane is ready to take orders. Build a checkout that collects a delivery address with a valid Indian PIN code, recalculates the total on the server and creates an order in PENDING_PAYMENT. Integrate the mock payment gateway and mark the order PAID only when a signed webhook confirms the payment, never because the browser was redirected. Reduce stock only for paid orders.',
      expectedOutcome:
        'Customers can place an order and pay through the mock gateway, and order status changes only on verified payment events.',
      acceptanceCriteria: [
        'The server ignores prices sent by the browser and recalculates totals from the database',
        'Address validation rejects PIN codes that are not exactly 6 digits',
        'An order becomes PAID only after a valid webhook, and a replayed webhook changes nothing',
        'Stock is reduced exactly once per paid order',
        'The confirmation page shows the order number and its current status',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 12,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T3', 'T4'],
    },
    {
      key: 'T6',
      dayNumber: 10,
      title: 'Final review: deploy and demo the storefront',
      problemStatement:
        'Prepare BazaarLane for its launch review. Deploy the client and the API to a hosting platform of your choice with production environment variables and HTTPS. Run the end-to-end test that searches, adds to cart, logs in and places a paid order against the deployed build. Present a short demo to your trainer and list the known issues and next steps.',
      expectedOutcome:
        'A deployed storefront that passes the end-to-end purchase journey, with a demo and documentation ready for review.',
      acceptanceCriteria: [
        'The deployed URL serves the app over HTTPS with no console errors',
        'The end-to-end purchase test passes against the deployed build',
        'Secrets are configured on the hosting platform, not committed to the repository',
        'The README lists the live URL, setup steps and known limitations',
      ],
      starterRepoUrl: FULLSTACK_ECOMMERCE_REPO,
      estimatedHours: 6,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T5'],
    },
  ],

  'devops-telecom': [
    {
      key: 'T1',
      dayNumber: 1,
      title: 'Run the usage-billing service locally',
      problemStatement:
        'A mobile operator rates call detail records (CDRs) for calls, SMS and data with its usage-billing service, which produces monthly charges for about two million subscribers. Before automating anything you need to understand how the service is built, configured and run. Run it locally with its PostgreSQL database, import the sample CDR file and confirm the rated totals. Document the build steps, configuration variables, ports and health endpoints in a runbook.',
      expectedOutcome:
        'The service runs locally against PostgreSQL, rates the sample CDRs correctly and is documented well enough to automate.',
      acceptanceCriteria: [
        'npm test passes and the service starts on port 8080',
        'GET /healthz returns 200 and the sample CDR file produces the documented totals',
        'Every environment variable the service reads is listed with its purpose and default',
        'docs/runbook.md is committed on a feature branch',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 3,
      requiresTrainerReview: false,
      prerequisiteKeys: [],
    },
    {
      key: 'T2',
      dayNumber: 2,
      title: 'Build the CI pipeline',
      problemStatement:
        'Developers test the billing service only on their laptops, and broken code has reached the main branch twice this month. Build a GitHub Actions pipeline that runs on every pull request and on pushes to main: install dependencies, lint, run the tests and publish the test report. Cache dependencies so that the pipeline stays fast. Protect the main branch so that a pull request cannot be merged while the pipeline is failing.',
      expectedOutcome:
        'Every pull request is checked automatically, and failing changes cannot be merged into main.',
      acceptanceCriteria: [
        'The workflow runs on pull requests and on pushes to main',
        'Lint and test failures fail the pipeline with a readable log',
        'Dependency caching shortens repeat runs, shown by run timings in the submission',
        'Branch protection requires the pipeline to pass before merging',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 5,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T1'],
    },
    {
      key: 'T3',
      dayNumber: 3,
      title: 'Containerise the billing service',
      problemStatement:
        'The operations team wants the billing service to run the same way in every environment. Write a multi-stage Dockerfile that produces a small production image running as a non-root user, and a Docker Compose file that starts the service with PostgreSQL for local testing. Add a .dockerignore so that secrets and local files never enter the image. Scan the image for known vulnerabilities and fix any critical findings.',
      expectedOutcome:
        'A small, non-root production image that starts with Docker Compose and has no critical vulnerabilities.',
      acceptanceCriteria: [
        'The final image is under 200 MB and runs as a non-root user',
        'docker compose up starts the service and PostgreSQL, and /healthz returns 200',
        'The image contains no .env files, tests or .git folder',
        'The image scan reports no critical vulnerabilities',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 5,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T4',
      dayNumber: 5,
      title: 'Provision the environment with Terraform',
      problemStatement:
        'The staging infrastructure for the billing service was created by hand, and nobody knows its exact configuration. Describe it as code with Terraform: the network, a managed PostgreSQL database, the container registry and a Kubernetes namespace for staging. Store state in a remote backend with locking, and run terraform plan in the CI pipeline for every pull request that changes infrastructure.',
      expectedOutcome:
        'Staging infrastructure is reproducible from code, and every change is reviewed as a plan in CI before it is applied.',
      acceptanceCriteria: [
        'terraform fmt -check and terraform validate pass in CI',
        'State is stored in a remote backend with locking enabled',
        'A pull request that changes .tf files shows the terraform plan output in the pipeline',
        'No credentials or secrets appear in .tf files or in Git history',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T5',
      dayNumber: 7,
      title: 'Deploy to Kubernetes with zero-downtime updates',
      problemStatement:
        'Releases currently interrupt usage rating for several minutes. Deploy the billing service to the staging cluster with Deployment, Service, ConfigMap and Secret manifests or a Helm chart. Set resource requests and limits, readiness and liveness probes and a rolling-update strategy. Prove that a new release rolls out without failed requests and that a bad release can be rolled back with one command.',
      expectedOutcome:
        'The service runs in staging with health probes and rolling updates, and both a rollout and a rollback are demonstrated.',
      acceptanceCriteria: [
        'Pods run with resource requests, limits and readiness and liveness probes',
        'A rolling update completes while a load test shows no failed requests',
        'kubectl rollout undo restores the previous version',
        'Database credentials come from a Secret, not from the image or a plain manifest',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 10,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T3', 'T4'],
    },
    {
      key: 'T6',
      dayNumber: 10,
      title: 'Monitor the service and run an incident drill',
      problemStatement:
        'Billing runs every night, and the operations team usually learns about failures from customer complaints. Expose service metrics, build a dashboard for request rate, error rate, latency and CDR processing lag, and add alerts based on service-level objectives. Then run an incident drill: break a dependency in staging, follow the alert to the cause, recover and write a short post-incident report.',
      expectedOutcome:
        'Dashboards and SLO-based alerts that detect a real failure, and a post-incident report from the drill.',
      acceptanceCriteria: [
        '/metrics exposes request, error, latency and CDR lag metrics in Prometheus format',
        'The dashboard shows rate, errors, latency percentiles and saturation for the service',
        'An alert fires within five minutes of the simulated failure',
        'The post-incident report includes timeline, root cause, impact and follow-up actions',
      ],
      starterRepoUrl: DEVOPS_TELECOM_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T5'],
    },
  ],

  'dotnet-healthcare': [
    {
      key: 'T1',
      dayNumber: 1,
      title: 'Set up the clinic API solution',
      problemStatement:
        'A chain of multi-speciality clinics in Bengaluru and Hyderabad is replacing paper registers with an appointment and patient-record API. Set up the starter solution with the .NET 8 SDK, connect it to a local SQL Server container, and run the API and the tests. Review the solution layout and document how the projects depend on each other. Configure user secrets so that no connection string is ever committed.',
      expectedOutcome:
        'The solution builds, the tests pass and the API runs locally against SQL Server, with secrets kept out of the repository.',
      acceptanceCriteria: [
        'dotnet build and dotnet test succeed from the solution root',
        'The API starts and GET /health returns Healthy',
        'The connection string comes from user secrets or environment variables, not appsettings.json',
        'docs/setup.md explains the project layout and the run steps',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 3,
      requiresTrainerReview: true,
      prerequisiteKeys: [],
    },
    {
      key: 'T2',
      dayNumber: 3,
      title: 'Model patients and appointments with EF Core',
      problemStatement:
        'The clinics need to store patients, doctors, departments and appointments reliably. Design the entities and relationships, configure them with the EF Core fluent API and create the initial migration. Enforce the rules in the model and the database where possible: a unique patient registration number, required contact details and appointment times stored in UTC. Seed sample doctors and departments for development.',
      expectedOutcome:
        'A migrated database schema that represents patients, doctors and appointments with their rules, ready for the APIs.',
      acceptanceCriteria: [
        'dotnet ef database update creates the schema on an empty database',
        'Patient registration numbers are unique at database level',
        'Appointment times are stored in UTC',
        'Unit tests cover the rules that live in the domain entities',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 6,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T1'],
    },
    {
      key: 'T3',
      dayNumber: 4,
      title: 'Build the patient records API',
      problemStatement:
        'Reception staff need to register patients, update contact details and find a patient quickly by name, phone or registration number. Build the patient endpoints with request DTOs, validation and paginated search. List results must contain only the fields reception needs, never clinical notes. Deleting a patient must be a soft delete so that the medical history is preserved.',
      expectedOutcome:
        'Reception can register, update, search and archive patients through a validated, paginated API.',
      acceptanceCriteria: [
        'POST, GET, PUT and DELETE /api/patients work with validated DTOs',
        'Search by name, phone or registration number is paginated with a maximum page size of 50',
        'List results exclude clinical notes and other sensitive fields',
        'Deleting a patient archives the record instead of removing the row',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T4',
      dayNumber: 5,
      title: 'Implement appointment booking',
      problemStatement:
        'Patients often wait at the clinics because the same slot was booked twice. Build endpoints that show the free slots of a doctor and let a patient book, reschedule or cancel an appointment. Two bookings for the same doctor and time must never both succeed, even when they arrive at the same moment. Cancellations are allowed up to two hours before the appointment.',
      expectedOutcome:
        'Reliable booking with no double-booked slots and clear errors whenever a rule is broken.',
      acceptanceCriteria: [
        'GET /api/doctors/{id}/slots returns only free slots for the requested date',
        'Two concurrent bookings for the same slot result in one success and one 409 Conflict',
        'Cancelling less than two hours before the appointment returns 422 with a clear error code',
        'Integration tests cover booking, rescheduling and cancellation',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T2'],
    },
    {
      key: 'T5',
      dayNumber: 7,
      title: 'Enforce privacy rules and audit access',
      problemStatement:
        'Patient records are sensitive health data, and the clinics must be able to show who viewed or changed them. Restrict access by role: reception sees contact and appointment details, doctors see clinical notes only for their own patients, and administrators manage users but not clinical data. Record every read and change of a patient record in an audit log, mask phone and identity numbers wherever the full value is not needed, and keep personal data out of application logs.',
      expectedOutcome:
        'Role-based access to patient data, masked identifiers and a complete audit trail of every record access.',
      acceptanceCriteria: [
        'A doctor receives 403 when opening the clinical notes of a patient who is not under their care',
        'Every read and update of a patient record creates an audit entry with user, action and time',
        'Phone and identity numbers are masked in list responses and never appear in logs',
        'Integration tests cover the authorisation rules for each role',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 10,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T3', 'T4'],
    },
    {
      key: 'T6',
      dayNumber: 10,
      title: 'Final review: demo and acceptance tests',
      problemStatement:
        'The clinic chain wants to pilot the platform in one branch. Prepare the final release: run the acceptance tests supplied with the starter, containerise the API and document the configuration for the pilot environment. Demonstrate patient registration, booking and cancelling an appointment, and the audit trail to your trainer. Close with a short list of known limitations and privacy risks.',
      expectedOutcome:
        'A pilot-ready release that passes the acceptance tests, with a demo of the main journeys and documentation for deployment.',
      acceptanceCriteria: [
        'The acceptance test suite passes on the final tagged commit',
        'docker compose up starts the API and the database with documented settings',
        'The demo covers patient registration, booking, cancellation and the audit trail',
        'The README lists configuration, known limitations and privacy risks',
      ],
      starterRepoUrl: DOTNET_HEALTHCARE_REPO,
      estimatedHours: 8,
      requiresTrainerReview: true,
      prerequisiteKeys: ['T5'],
    },
  ],
};
