import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '@core/models';
import { AuthService } from '@core/services/auth.service';

export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();
    if (!role) return router.createUrlTree(['/auth']);
    if (roles.includes(role)) return true;

    // Role-specific home destination
    const fallback = role === 'DELIVERY_PARTNER' ? '/delivery-partner' : '/dashboard';
    return router.createUrlTree([fallback]);
  };
}
