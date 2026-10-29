/**
 * Catalog seed content for the mock API (ticket GP1). Pure data: no imports, no logic.
 *
 * - DESIGNATIONS / DOMAINS: { name, slug, description, status: 'PUBLISHED' | 'DRAFT' }
 * - PLAN_MATRIX: which designation/domain pairs get plans. The seed creates one plan per
 *   duration in DURATION_OPTIONS (1, 2, 3, 4, 6 months) for every pair, with the row status.
 * - Plan base price (integer paise) =
 *     BASE_PRICE_BY_DURATION[durationMonths] + PRICE_ADJUSTMENT_BY_DESIGNATION[designationSlug]
 *   e.g. Java Developer, 3 months = 1299900 paise (Rs 12,999); DevOps Engineer, 3 months = 1399900.
 */

export const DESIGNATIONS = [
  {
    name: 'Java Developer',
    slug: 'java-developer',
    description:
      'Build and maintain backend services with Java 17 and Spring Boot the way enterprise teams do. You start by debugging, merging and reviewing code in an existing repository, then design REST APIs, JPA persistence, transactions, logging and automated tests. Key skills: core Java, collections and streams, Spring Boot, SQL, JUnit 5 and a disciplined Git workflow.',
    status: 'PUBLISHED',
  },
  {
    name: 'Full Stack Developer',
    slug: 'full-stack-developer',
    description:
      'Ship complete features across a React front end and a Node.js and Express API backed by MongoDB. You build responsive interfaces, REST endpoints, authentication and checkout flows, and learn to debug across the browser, the network and the server. Key skills: modern JavaScript, React hooks, Express middleware, MongoDB, HTTP and web security.',
    status: 'PUBLISHED',
  },
  {
    name: '.NET Developer',
    slug: 'dotnet-developer',
    description:
      'Build secure, well-tested web APIs with C#, ASP.NET Core and Entity Framework Core. You work with dependency injection, middleware, LINQ, async code and database migrations, and cover your work with xUnit tests. Key skills: C#, ASP.NET Core, EF Core, SQL Server and clean API design.',
    status: 'PUBLISHED',
  },
  {
    name: 'DevOps Engineer',
    slug: 'devops-engineer',
    description:
      'Automate how software is built, shipped and run in production. You write CI/CD pipelines, package services with Docker, deploy them to Kubernetes, manage infrastructure with Terraform and set up monitoring and alerts. Key skills: Linux and shell, Git, Docker, Kubernetes, Terraform, cloud networking and observability.',
    status: 'PUBLISHED',
  },
  {
    name: 'Data Engineer',
    slug: 'data-engineer',
    description:
      'Design pipelines that turn raw data into reliable, query-ready tables. You model warehouses, write SQL and PySpark transformations, orchestrate jobs with Airflow and add data-quality checks. Key skills: advanced SQL, Python and pandas, Spark, data modelling, partitioning and orchestration.',
    status: 'DRAFT',
  },
];

export const DOMAINS = [
  {
    name: 'Banking',
    slug: 'banking',
    description:
      'Accounts, fund transfers, ledgers and statements for a retail bank, where correctness, auditability and safe transaction handling come first.',
    status: 'PUBLISHED',
  },
  {
    name: 'Healthcare',
    slug: 'healthcare',
    description:
      'Appointments, patient records and clinical workflows for a chain of clinics, built with strict privacy rules and role-based access to sensitive data.',
    status: 'PUBLISHED',
  },
  {
    name: 'Telecom',
    slug: 'telecom',
    description:
      'Usage rating, billing and subscriber services for a mobile operator that processes millions of call and data records every day and must stay available around the clock.',
    status: 'PUBLISHED',
  },
  {
    name: 'E-commerce',
    slug: 'e-commerce',
    description:
      'Product catalogues, carts, checkout, payments and order tracking for an online store, where speed and reliability directly affect revenue.',
    status: 'PUBLISHED',
  },
  {
    name: 'Insurance',
    slug: 'insurance',
    description:
      'Policy administration, premium calculation and claims processing for a general insurer, with a clear audit trail for every decision.',
    status: 'DRAFT',
  },
];

export const PLAN_MATRIX = [
  {
    designation: 'java-developer',
    domains: ['banking', 'healthcare', 'e-commerce'],
    status: 'PUBLISHED',
  },
  {
    designation: 'full-stack-developer',
    domains: ['e-commerce', 'banking', 'healthcare'],
    status: 'PUBLISHED',
  },
  { designation: 'dotnet-developer', domains: ['healthcare', 'banking'], status: 'PUBLISHED' },
  { designation: 'dotnet-developer', domains: ['insurance'], status: 'DRAFT' },
  {
    designation: 'devops-engineer',
    domains: ['telecom', 'banking', 'e-commerce'],
    status: 'PUBLISHED',
  },
  { designation: 'data-engineer', domains: ['banking'], status: 'DRAFT' },
];

/** Base price in paise for each duration (months). */
export const BASE_PRICE_BY_DURATION = {
  1: 499900,
  2: 899900,
  3: 1299900,
  4: 1599900,
  6: 2199900,
};

/** Paise added to the base price of every duration for a designation. */
export const PRICE_ADJUSTMENT_BY_DESIGNATION = {
  'java-developer': 0,
  'full-stack-developer': 50000,
  'dotnet-developer': 0,
  'devops-engineer': 100000,
  'data-engineer': 100000,
};
