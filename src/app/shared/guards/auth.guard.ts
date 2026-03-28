import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/application/services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for session restore to complete
  if (auth.isLoading()) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!auth.isLoading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (auth.user()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
