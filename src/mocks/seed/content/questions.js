/**
 * Assessment question bank (tickets GP1, MM6). Pure data: no imports.
 *
 * QUESTION_BANK[designationSlug] = 15 questions of { text, options: [4 strings], correctIndex: 0..3 }.
 * Intermediate level, exactly one correct option, no "all/none of the above".
 * correctIndex is an answer key: the mock API must never send it to students.
 */

export const QUESTION_BANK = {
  'java-developer': [
    {
      text: 'Which statement about method overriding in Java is true?',
      options: [
        'An overriding method may use a more restrictive access modifier',
        'Static methods are overridden and dispatched on the runtime type',
        'The method that runs is chosen by the runtime type of the object',
        'An overriding method may throw broader checked exceptions',
      ],
      correctIndex: 2,
    },
    {
      text: 'What happens when you call put() on a HashMap with a key that is already present?',
      options: [
        'The value is replaced and put() returns the previous value',
        'A second entry with the same key is added to the map',
        'An IllegalArgumentException is thrown for the duplicate key',
        'The new value is ignored and put() returns null',
      ],
      correctIndex: 0,
    },
    {
      text: 'A Transaction class overrides equals() but not hashCode(). What is the most likely problem?',
      options: [
        'The class fails to compile until hashCode() is overridden',
        'equals() is ignored by every collection in java.util',
        'toString() returns the same text for every instance',
        'Equal objects can land in different HashSet buckets, allowing duplicates',
      ],
      correctIndex: 3,
    },
    {
      text: 'Which method signature lets you add Integer values to a List<Integer>, a List<Number> or a List<Object>?',
      options: [
        'void fill(List<? extends Number> list)',
        'void fill(List<? super Integer> list)',
        'void fill(List<Object> list)',
        'void fill(List<?> list)',
      ],
      correctIndex: 1,
    },
    {
      text: 'What does this statement print? Stream.of(1, 2, 3).map(n -> { System.out.print(n); return n * 2; });',
      options: [
        '123, printed as each element is mapped',
        'Nothing, because no terminal operation runs',
        '246, the values after they are doubled',
        'An IllegalStateException is thrown',
      ],
      correctIndex: 1,
    },
    {
      text: 'Which of these is a checked exception that the compiler forces you to catch or declare?',
      options: [
        'NullPointerException',
        'IllegalArgumentException',
        'ArithmeticException',
        'IOException',
      ],
      correctIndex: 3,
    },
    {
      text: 'Why should account balances be held in BigDecimal rather than double?',
      options: [
        'double cannot store most decimal fractions exactly, causing rounding errors',
        'BigDecimal arithmetic is faster than double arithmetic on modern JVMs',
        'double values cannot be stored in a relational database column',
        'BigDecimal is mutable, so a balance can be updated in place',
      ],
      correctIndex: 0,
    },
    {
      text: 'Two threads each run count++ 1,000 times on a shared int field without synchronisation. What is the final value of count?',
      options: [
        'Exactly 2,000, because int writes are atomic',
        'Exactly 1,000, because one thread overwrites the other',
        'It can be less than 2,000, because count++ is not atomic',
        'A ConcurrentModificationException is thrown',
      ],
      correctIndex: 2,
    },
    {
      text: 'Where does the JVM allocate an object created with the new keyword?',
      options: [
        'On the stack of the thread that created it',
        'In Metaspace, together with the class metadata',
        'In the string pool, until it is garbage collected',
        'On the heap, which is shared by all threads',
      ],
      correctIndex: 3,
    },
    {
      text: 'What is the recommended way to inject a required dependency into a Spring service?',
      options: [
        'Constructor injection, so the field can be final and easy to test',
        'Creating the dependency with new inside the service constructor',
        'A static field annotated with @Autowired',
        'Looking it up from the ApplicationContext in every method',
      ],
      correctIndex: 0,
    },
    {
      text: 'By default, which exceptions make a Spring @Transactional method roll back its transaction?',
      options: [
        'Any exception, whether checked or unchecked',
        'Only checked exceptions declared in the throws clause',
        'Unchecked exceptions (RuntimeException and Error)',
        'None, because rollback must always be triggered manually',
      ],
      correctIndex: 2,
    },
    {
      text: 'In JUnit 5, how do you assert that account.withdraw(500) throws InsufficientFundsException?',
      options: [
        '@Test(expected = InsufficientFundsException.class) on the test method',
        'assertThrows(InsufficientFundsException.class, () -> account.withdraw(500))',
        'assertEquals(InsufficientFundsException.class, account.withdraw(500))',
        'assertTrue(account.withdraw(500) instanceof InsufficientFundsException)',
      ],
      correctIndex: 1,
    },
    {
      text: 'A JPA query loads 50 accounts, and the code then calls getTransactions() on each one, which runs one extra query per account. What is this problem called?',
      options: [
        'The N+1 select problem',
        'A dirty read anomaly',
        'A phantom read anomaly',
        'An optimistic locking failure',
      ],
      correctIndex: 0,
    },
    {
      text: 'Which query returns every customer, including customers who have no accounts?',
      options: [
        'SELECT c.name, a.id FROM customer c INNER JOIN account a ON a.customer_id = c.id',
        'SELECT c.name, a.id FROM customer c RIGHT JOIN account a ON a.customer_id = c.id',
        'SELECT c.name, a.id FROM customer c, account a WHERE a.customer_id = c.id',
        'SELECT c.name, a.id FROM customer c LEFT JOIN account a ON a.customer_id = c.id',
      ],
      correctIndex: 3,
    },
    {
      text: 'Your local feature branch has commits, and the remote branch has new commits from a teammate. Which command updates your branch by replaying your commits on top of the remote ones?',
      options: [
        'git merge --squash origin/feature',
        'git reset --hard origin/feature',
        'git pull --rebase',
        'git push --force-with-lease',
      ],
      correctIndex: 2,
    },
  ],

  'full-stack-developer': [
    {
      text: 'What does this code log? for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); }',
      options: ['0, 1 and 2', '3, 3 and 3', 'undefined, three times', '0, 0 and 0'],
      correctIndex: 1,
    },
    {
      text: 'In what order are the letters logged? console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D");',
      options: ['A, B, C, D', 'A, C, D, B', 'A, D, B, C', 'A, D, C, B'],
      correctIndex: 3,
    },
    {
      text: 'What happens when one of the promises passed to Promise.all() rejects?',
      options: [
        'The returned promise rejects with that reason, without waiting for the rest',
        'The rejection is ignored and the other values are returned',
        'It waits for every promise and returns the status of each one',
        'It resolves with the value of whichever promise settles first',
      ],
      correctIndex: 0,
    },
    {
      text: 'When does the effect in useEffect(() => { ... }, []) run?',
      options: [
        'Before every render of the component',
        'After every render of the component',
        'After the first render only, with cleanup on unmount',
        'Only when the parent component re-renders',
      ],
      correctIndex: 2,
    },
    {
      text: 'A click handler calls setCount(count + 1) three times in a row while count is 0. What is count after the next render?',
      options: [
        '0, because state updates are ignored in event handlers',
        '1, because each call uses the same value of count',
        '2, because React drops the last batched update',
        '3, because each call adds one to the latest state',
      ],
      correctIndex: 1,
    },
    {
      text: 'Why should items in a React list use a stable unique key, such as a database ID, instead of the array index?',
      options: [
        'So React can match items across renders and keep state with the right item',
        'Because the browser needs keys to render list elements',
        'Because index keys throw an error in production builds',
        'So the key value can be read as a normal prop in the child',
      ],
      correctIndex: 0,
    },
    {
      text: 'An Express middleware checks the JWT on a request and finds it valid. What must it do so that the route handler still runs?',
      options: [
        'Return true so that Express moves to the next route',
        'Throw an error so that the error handler can continue',
        'Call res.end() before passing control on',
        'Call next() to pass control to the next handler',
      ],
      correctIndex: 3,
    },
    {
      text: 'A request without an access token reaches an endpoint that requires login. Which status code should the API return?',
      options: ['400 Bad Request', '403 Forbidden', '401 Unauthorized', '404 Not Found'],
      correctIndex: 2,
    },
    {
      text: 'Which HTTP method is defined as idempotent but not safe?',
      options: ['GET', 'POST', 'PATCH', 'PUT'],
      correctIndex: 3,
    },
    {
      text: 'Which MongoDB query finds orders whose total is greater than 500?',
      options: [
        'db.orders.find({ total: { $gte: 500 } })',
        'db.orders.find({ total: { $gt: 500 } })',
        'db.orders.find({ total: { $lt: 500 } })',
        'db.orders.find({ total: { $max: 500 } })',
      ],
      correctIndex: 1,
    },
    {
      text: 'An orders collection is often queried by customerId and sorted by createdAt, newest first. Which index supports this query best?',
      options: [
        '{ createdAt: -1 }',
        'Separate single-field indexes on both fields',
        '{ customerId: 1, createdAt: -1 }',
        '{ createdAt: -1, customerId: 1 }',
      ],
      correctIndex: 2,
    },
    {
      text: 'Which CSS centres a single child horizontally and vertically inside its container?',
      options: [
        'display: flex; justify-content: center; align-items: center;',
        'display: flex; text-align: center; vertical-align: middle;',
        'display: flex; flex-wrap: wrap; align-content: flex-start;',
        'display: grid; justify-items: start; align-items: end;',
      ],
      correctIndex: 0,
    },
    {
      text: 'Which practice best prevents stored XSS when a React app displays comments written by users?',
      options: [
        'Insert comments with dangerouslySetInnerHTML so React escapes them',
        'Serve the whole application over HTTPS with HSTS enabled',
        'Store comments in a separate MongoDB collection with an index',
        'Render comments as JSX text and sanitise any HTML with DOMPurify',
      ],
      correctIndex: 3,
    },
    {
      text: 'A React app on http://localhost:5173 calls an API on http://localhost:4000, and the browser blocks the response with a CORS error. Where is this fixed?',
      options: [
        'On the API, by sending Access-Control-Allow-Origin for the app origin',
        'In the React app, by adding mode: "no-cors" to the fetch call',
        'In MongoDB, by allowing connections from the app address',
        'In the browser, by clearing cookies and the cache',
      ],
      correctIndex: 0,
    },
    {
      text: 'Your feature branch has five small work-in-progress commits. Which command lets you combine them into one clean commit before opening a pull request?',
      options: [
        'git cherry-pick main..HEAD',
        'git rebase -i, marking the commits as squash',
        'git stash, then git stash pop',
        'git revert HEAD~5..HEAD',
      ],
      correctIndex: 1,
    },
  ],

  'dotnet-developer': [
    {
      text: 'You assign a struct variable to a new variable and then change a field on the copy. What happens to the original?',
      options: [
        'Nothing; structs are value types, so the copy is independent',
        'It changes too; structs are reference types like classes',
        'The compiler rejects the change because structs are immutable',
        'It changes only when both variables are in the same method',
      ],
      correctIndex: 0,
    },
    {
      text: 'What does patient?.Address?.City ?? "Unknown" return when patient is not null but patient.Address is null?',
      options: ['null', 'An empty string', '"Unknown"', 'A NullReferenceException is thrown'],
      correctIndex: 2,
    },
    {
      text: 'What is the main benefit of awaiting an I/O-bound call, such as a database query, in an ASP.NET Core action?',
      options: [
        'The query runs on another CPU core, so it finishes faster',
        'Exceptions from the query no longer need to be handled',
        'The result is cached automatically for later requests',
        'The thread is freed while waiting, so the server can handle more requests',
      ],
      correctIndex: 3,
    },
    {
      text: 'Why should an async method return Task rather than void, apart from event handlers?',
      options: [
        'async void methods always run synchronously on the calling thread',
        'Callers cannot await an async void method or catch its exceptions',
        'Methods that return Task are compiled without a state machine',
        'async void methods are not allowed to use await inside them',
      ],
      correctIndex: 1,
    },
    {
      text: 'patients is a List<Patient>. After var adults = patients.Where(p => p.Age >= 18); you call patients.Add(new Patient { Age = 40 }); and then adults.Count(). Is the new patient counted?',
      options: [
        'Yes, because the query is evaluated only when Count() runs',
        'No, because Where() copies the matching items immediately',
        'No, because Count() reuses a result cached by Where()',
        'No, an InvalidOperationException is thrown by Count()',
      ],
      correctIndex: 0,
    },
    {
      text: 'Which LINQ method returns the only matching element and throws if there are no matches or more than one?',
      options: ['First()', 'FirstOrDefault()', 'Single()', 'SingleOrDefault()'],
      correctIndex: 2,
    },
    {
      text: 'Which statement about interfaces and abstract classes in C# is true?',
      options: [
        'Interfaces can declare constructors, but abstract classes cannot',
        'A class can implement many interfaces but inherit from only one class',
        'Abstract classes cannot contain any implemented methods',
        'Interface members are private unless they are marked public',
      ],
      correctIndex: 1,
    },
    {
      text: 'In Program.cs, why must app.UseAuthentication() be called before app.UseAuthorization()?',
      options: [
        'Authentication has to run after the response has been sent',
        'It does not matter, because both only register services',
        'Authorization caches tokens that authentication validates later',
        'Authorization needs the user identity that authentication sets',
      ],
      correctIndex: 3,
    },
    {
      text: 'With which lifetime does AddDbContext register a DbContext by default?',
      options: [
        'Singleton: one instance for the whole application',
        'Scoped: one instance per HTTP request',
        'Transient: a new instance every time it is injected',
        'Thread-static: one instance per worker thread',
      ],
      correctIndex: 1,
    },
    {
      text: 'A controller has [Route("api/patients")] and an action has [HttpGet("{id:int}")]. Which request reaches that action?',
      options: [
        'GET /api/patients/42',
        'GET /api/patients?id=42',
        'GET /api/patients/abc',
        'POST /api/patients/42',
      ],
      correctIndex: 0,
    },
    {
      text: 'In a controller marked with [ApiController], what happens when the request body fails data-annotation validation?',
      options: [
        'The action runs, and you must check ModelState.IsValid yourself',
        'The invalid fields are reset to defaults and the action runs',
        'A 400 response with validation problem details is returned automatically',
        'The framework returns a 500 response and logs the exception',
      ],
      correctIndex: 2,
    },
    {
      text: 'What does DbContext.SaveChanges() do?',
      options: [
        'Saves all tracked inserts, updates and deletes in one transaction',
        'Reloads every tracked entity with fresh values from the database',
        'Generates a migration that matches the current model',
        'Saves only the entity passed to the most recent Add() call',
      ],
      correctIndex: 0,
    },
    {
      text: 'You query appointments and need the Doctor of each appointment loaded in the same database query. Which EF Core call do you use?',
      options: [
        '.AsNoTracking()',
        '.Select(a => a.Doctor)',
        '.Find(a => a.Doctor)',
        '.Include(a => a.Doctor)',
      ],
      correctIndex: 3,
    },
    {
      text: 'In xUnit, which attribute marks a test that runs once for each [InlineData] row?',
      options: ['[Fact]', '[Theory]', '[TestCase]', '[TestMethod]'],
      correctIndex: 1,
    },
    {
      text: 'Why register a service against an interface, such as IAppointmentRepository, in ASP.NET Core?',
      options: [
        'The DI container cannot construct concrete classes',
        'Calls through an interface run faster at runtime',
        'Interface registrations always become singletons',
        'Tests can swap in a fake or mock implementation',
      ],
      correctIndex: 3,
    },
  ],

  'devops-engineer': [
    {
      text: 'What access does chmod 640 app.log grant?',
      options: [
        'Owner read/write/execute, group read, others read',
        'Owner read, group read/write, others no access',
        'Owner read/write, group read, others no access',
        'Owner, group and others read/write, no execute',
      ],
      correctIndex: 2,
    },
    {
      text: 'An application on a cloud VM must read files from one storage bucket. What is the most secure way to grant access?',
      options: [
        'Attach a role to the VM that allows read access to that bucket only',
        'Put the root account access keys in an environment variable',
        'Make the bucket public so that no credentials are needed',
        'Commit a long-lived access key to the repository config file',
      ],
      correctIndex: 0,
    },
    {
      text: 'What does set -e do at the top of a Bash script?',
      options: [
        'Prints each command before it is executed',
        'Exits the script as soon as a command fails',
        'Exports every new variable to child processes',
        'Treats any unset variable as an error',
      ],
      correctIndex: 1,
    },
    {
      text: 'Why do Node.js Dockerfiles usually copy package.json and run npm ci before copying the rest of the source?',
      options: [
        'COPY can copy only one file per instruction',
        'npm ci works only in the first layer of an image',
        'It keeps node_modules out of the final image',
        'The dependency layer stays cached when only source code changes',
      ],
      correctIndex: 3,
    },
    {
      text: 'What is the difference between a Docker image and a container?',
      options: [
        'An image is a read-only template; a container is a running instance of it',
        'An image runs only on Linux; a container runs on any operating system',
        'A container is the compressed archive that docker build produces',
        'An image is created by docker run, and a container by docker build',
      ],
      correctIndex: 0,
    },
    {
      text: 'Which Kubernetes object gives a changing set of pods a stable virtual IP and DNS name?',
      options: ['Deployment', 'ConfigMap', 'Service', 'ReplicaSet'],
      correctIndex: 2,
    },
    {
      text: 'Which probe should fail while a pod temporarily cannot serve requests, so that it is removed from Service endpoints without being restarted?',
      options: ['livenessProbe', 'readinessProbe', 'startupProbe', 'A postStart lifecycle hook'],
      correctIndex: 1,
    },
    {
      text: 'Which command rolls the billing-api Deployment back to its previous revision?',
      options: [
        'kubectl delete deployment/billing-api --previous',
        'kubectl apply --revert -f deployment.yaml',
        'kubectl scale deployment/billing-api --replicas=0',
        'kubectl rollout undo deployment/billing-api',
      ],
      correctIndex: 3,
    },
    {
      text: 'Why should a pipeline promote the same image, tagged with the commit SHA, from staging to production instead of rebuilding it?',
      options: [
        'So production runs exactly the artefact that passed testing',
        'Registries reject a second push for the same commit',
        'Rebuilt images cannot be scanned for vulnerabilities',
        'So the production deployment can skip its health checks',
      ],
      correctIndex: 0,
    },
    {
      text: 'In trunk-based development, how is unfinished work usually kept away from users in production?',
      options: [
        'Each feature stays on its own branch for several months',
        'The CI pipeline is switched off for unfinished commits',
        'Feature flags keep the new code switched off until it is ready',
        'Changes are merged to main only once a quarter after a freeze',
      ],
      correctIndex: 2,
    },
    {
      text: 'Which DNS record type maps a hostname to an IPv4 address?',
      options: ['CNAME', 'AAAA', 'MX', 'A'],
      correctIndex: 3,
    },
    {
      text: 'A load balancer returns 502 Bad Gateway. What does this usually indicate?',
      options: [
        'The client sent a malformed request to the load balancer',
        'The upstream service sent an invalid response or refused the connection',
        'The user is not authorised to access the requested resource',
        'The requested path does not exist on the upstream service',
      ],
      correctIndex: 1,
    },
    {
      text: 'Which latency metric best shows what most users actually experience, including slow outliers?',
      options: [
        'The average response time over the whole day',
        'The p95 or p99 response-time percentile',
        'The fastest response recorded in each minute',
        'The CPU utilisation of the database server',
      ],
      correctIndex: 1,
    },
    {
      text: 'What does terraform plan do?',
      options: [
        'Shows the changes Terraform would make, without applying them',
        'Downloads providers and initialises the state backend',
        'Deletes resources that are missing from the configuration',
        'Rewrites .tf files in the canonical formatting style',
      ],
      correctIndex: 0,
    },
    {
      text: 'Why do teams keep Terraform state in a remote backend with state locking?',
      options: [
        'Terraform cannot run without internet access',
        'So the state file can be committed safely to Git',
        'Local state can hold at most 100 resources',
        'So two engineers cannot apply conflicting changes at the same time',
      ],
      correctIndex: 3,
    },
  ],

  'data-engineer': [
    {
      text: 'orders has 100 rows and customers has 20. customers.id is the primary key and every order has a valid customer_id. How many rows does SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id return?',
      options: ['20', '100', '120', '2,000'],
      correctIndex: 1,
    },
    {
      text: 'Scores 90, 85, 85 and 80 are ordered from highest to lowest. Which window function assigns them 1, 2, 2 and 4?',
      options: ['ROW_NUMBER()', 'DENSE_RANK()', 'NTILE(4)', 'RANK()'],
      correctIndex: 3,
    },
    {
      text: 'Which expression returns a running total of amount for each account in date order?',
      options: [
        'SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date)',
        'SUM(amount) OVER (PARTITION BY txn_date ORDER BY account_id)',
        'SUM(amount) OVER (ORDER BY account_id)',
        'SUM(amount) with GROUP BY account_id, txn_date',
      ],
      correctIndex: 0,
    },
    {
      text: 'After GROUP BY account_id, which clause keeps only accounts with more than 10 transactions?',
      options: [
        'WHERE COUNT(*) > 10',
        'ORDER BY COUNT(*) > 10',
        'HAVING COUNT(*) > 10',
        'LIMIT 10',
      ],
      correctIndex: 2,
    },
    {
      text: 'In a star schema for retail sales, which table holds measures such as quantity and amount, one row per sale line?',
      options: ['A dimension table', 'A fact table', 'A bridge table', 'A lookup table'],
      correctIndex: 1,
    },
    {
      text: 'A customer moves to a new city, and reports must still show the old city for past sales. Which approach handles this?',
      options: [
        'SCD Type 2: insert a new row with effective-from and effective-to dates',
        'SCD Type 1: overwrite the old city with the new one',
        'Delete the customer row and insert it again with the new city',
        'Update the city in place and rebuild all past reports',
      ],
      correctIndex: 0,
    },
    {
      text: 'What distinguishes ELT from ETL?',
      options: [
        'ELT never transforms data; it only copies it between systems',
        'ELT works only with on-premises databases, not cloud warehouses',
        'In ELT, data is transformed in the source system before extraction',
        'In ELT, raw data is loaded first and transformed inside the warehouse',
      ],
      correctIndex: 3,
    },
    {
      text: 'A daily load sometimes reruns for the same date after a failure. How should the load step be designed?',
      options: [
        'Always append, so each rerun keeps an extra copy for audit',
        'Skip the load whenever the target table already has rows',
        'Idempotently, for example by overwriting that date partition or using MERGE',
        'Truncate the whole table before every daily load',
      ],
      correctIndex: 2,
    },
    {
      text: 'In Spark, which of these operations triggers the execution of a job?',
      options: ['filter()', 'select()', 'withColumn()', 'count()'],
      correctIndex: 3,
    },
    {
      text: 'Which Spark operation usually causes a shuffle of data across the cluster?',
      options: [
        'df.filter(df.amount > 0)',
        'df.select("account_id", "amount")',
        'df.groupBy("account_id").sum("amount")',
        'df.withColumn("fee", df.amount * 0.01)',
      ],
      correctIndex: 2,
    },
    {
      text: 'In pandas, what does df.groupby("city")["amount"].sum() return?',
      options: [
        'A Series of the total amount for each city, indexed by city',
        'One number: the sum of the entire amount column',
        'The original DataFrame, sorted by city and amount',
        'A list of the cities whose amount is above the mean',
      ],
      correctIndex: 0,
    },
    {
      text: 'customers has one row per customer_id. Which call returns every order, and only orders, with customer columns added where a match exists?',
      options: [
        'orders.merge(customers, on="customer_id", how="inner")',
        'orders.merge(customers, on="customer_id", how="left")',
        'orders.merge(customers, on="customer_id", how="right")',
        'orders.merge(customers, on="customer_id", how="outer")',
      ],
      correctIndex: 1,
    },
    {
      text: 'A 2 TB events table is queried mostly by event_date ranges. Which partitioning strategy helps most?',
      options: [
        'Partition by event_date, so queries skip partitions outside the range',
        'Partition by user_id, so every user gets a separate partition',
        'Partition by a random number, so rows are spread evenly',
        'Do not partition; add LIMIT to every query instead',
      ],
      correctIndex: 0,
    },
    {
      text: 'An Airflow DAG has a daily schedule, a start_date ten days ago and catchup=True. What happens when it is first unpaused?',
      options: [
        'Only one run, for the most recent interval, is scheduled',
        'A run is created for each missed daily interval since start_date',
        'The DAG fails to load because start_date is in the past',
        'Airflow waits ten days before it schedules the first run',
      ],
      correctIndex: 1,
    },
    {
      text: 'What is the most reliable way to stop a broken upstream feed from reaching reports?',
      options: [
        'Ask analysts to report wrong numbers when they spot them',
        'Run the pipeline twice and keep whichever output is larger',
        'Turn off retries so that failures show up in the logs',
        'Automated row-count, null, uniqueness and freshness checks that stop the run',
      ],
      correctIndex: 3,
    },
  ],
};
