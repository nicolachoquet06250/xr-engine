import { createWorkspaceVitestConfig } from '../../configs/vitest/createWorkspaceVitestConfig';

export default createWorkspaceVitestConfig({
  workspaceDir: import.meta.dirname,
  environment: 'node',
  useVue: false,
  name: 'package-devtools',
});
