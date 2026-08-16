import type { Role } from '../../generated/prisma/enums.js';

export const ROLE_WEIGHT: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};