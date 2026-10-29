/**
 * GitHub feature (GP10, SD9): personal GitHub connection for individual internships and the
 * shared team repository card for group enrollments. The callback page is lazy-loaded by the
 * router (src/routes/lazyPages.js) and is intentionally not re-exported here.
 */
export { GithubConnectCard } from './components/GithubConnectCard';
export { TeamRepoCard } from './components/TeamRepoCard';
export {
  DISCONNECTED,
  useCompleteGithubCallback,
  useConnectGithub,
  useDisconnectGithub,
  useGithubConnection,
} from './hooks/useGithubConnection';
