import { z } from 'zod';

/**
 * Compatibility bridge between Zod 4 and @hookform/resolvers/zod.
 *
 * @hookform/resolvers/zod inspects `error?.errors` (which was an alias for `issues` in Zod 3).
 * In Zod 4, `.errors` was removed in favor of `.issues`, causing the resolver to mistake
 * valid schema validation failures for unknown errors and re-throw them as unhandled rejections.
 */
function patchZodError() {
  try {
    // Trigger validation failure once to initialize Zod's internal prototype
    z.string().min(1).parse('');
  } catch (error) {
    const proto = Object.getPrototypeOf(error);
    if (proto && !Object.prototype.hasOwnProperty.call(proto, 'errors')) {
      Object.defineProperty(proto, 'errors', {
        get() {
          return this.issues;
        },
        configurable: true,
        enumerable: false,
      });
    }
  }

  if (z.ZodError?.prototype && !Object.prototype.hasOwnProperty.call(z.ZodError.prototype, 'errors')) {
    Object.defineProperty(z.ZodError.prototype, 'errors', {
      get() {
        return this.issues;
      },
      configurable: true,
      enumerable: false,
    });
  }
}

patchZodError();

export { z };
