import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  const target = auth.role() === 'DELIVERY_PARTNER' ? '/delivery-partner' : '/dashboard';
  return router.createUrlTree([target]);
};
