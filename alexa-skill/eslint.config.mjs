// The Lambda is plain Node code, not part of the Next.js app: it gets its own
// config so the root eslint-config-next rules (React, pages/) never apply here.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  ...tseslint.configs.recommended,
);
