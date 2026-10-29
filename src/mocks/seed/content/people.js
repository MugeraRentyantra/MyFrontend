/**
 * Extra people seeded into the mock API (ticket GP1). Pure data: no imports.
 * The quick-login demo accounts live in src/mocks/demoAccounts.js; these records fill
 * admin tables, trainer queues, teams and enrollment lists so screens look realistic.
 * All emails are unique and none collides with a demo account.
 */

/** Exactly 24 students: { name, email } with firstname.lastname@example.com */
export const EXTRA_STUDENTS = [
  { name: 'Sneha Kapoor', email: 'sneha.kapoor@example.com' },
  { name: 'Ananya Bose', email: 'ananya.bose@example.com' },
  { name: 'Kunal Shah', email: 'kunal.shah@example.com' },
  { name: 'Tanvi Joshi', email: 'tanvi.joshi@example.com' },
  { name: 'Varun Malhotra', email: 'varun.malhotra@example.com' },
  { name: 'Pooja Nair', email: 'pooja.nair@example.com' },
  { name: 'Siddharth Rao', email: 'siddharth.rao@example.com' },
  { name: 'Aditya Deshpande', email: 'aditya.deshpande@example.com' },
  { name: 'Riya Sen', email: 'riya.sen@example.com' },
  { name: 'Harshit Agarwal', email: 'harshit.agarwal@example.com' },
  { name: 'Kavya Menon', email: 'kavya.menon@example.com' },
  { name: 'Arnav Chatterjee', email: 'arnav.chatterjee@example.com' },
  { name: 'Ishaan Khanna', email: 'ishaan.khanna@example.com' },
  { name: 'Shreya Pillai', email: 'shreya.pillai@example.com' },
  { name: 'Manish Tiwari', email: 'manish.tiwari@example.com' },
  { name: 'Divya Krishnan', email: 'divya.krishnan@example.com' },
  { name: 'Yash Thakur', email: 'yash.thakur@example.com' },
  { name: 'Nandini Hegde', email: 'nandini.hegde@example.com' },
  { name: 'Pranav Saxena', email: 'pranav.saxena@example.com' },
  { name: 'Simran Kaur', email: 'simran.kaur@example.com' },
  { name: 'Vivek Pandey', email: 'vivek.pandey@example.com' },
  { name: 'Lakshmi Subramanian', email: 'lakshmi.subramanian@example.com' },
  { name: 'Farhan Qureshi', email: 'farhan.qureshi@example.com' },
  { name: 'Gauri Deshmukh', email: 'gauri.deshmukh@example.com' },
];

/** Trainers in addition to the demo trainer (Priya Nair, trainer@demo.dev). */
export const EXTRA_TRAINERS = [
  { name: 'Arjun Rao', email: 'arjun.rao@demo.dev' },
  { name: 'Neha Kulkarni', email: 'neha.kulkarni@demo.dev' },
];
