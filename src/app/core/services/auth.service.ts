import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TOKEN_STORAGE_KEY } from '@core/constants/auth';
import { AccountTypes } from '@core/constants/user.constant';
import { AuthSession, PublicUser, UserRole } from '@core/models';
import { ToastService } from '@core/services/toast.service';
import { decodeJwt } from '@core/utils/jwt';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly api = environment.apiUrl;

  readonly accessToken = signal<string | null>(this.readToken());
  readonly currentUser = signal<PublicUser | null>(null);
  readonly role = computed<UserRole | null>(() => this.currentUser()?.role ?? this.roleFromToken());
  readonly isAuthenticated = computed(() => !!this.accessToken() && !!this.role());

  constructor() {
    const token = this.accessToken();
    const payload = token ? decodeJwt(token) : null;
    if (payload) {
      this.currentUser.set({
        id: payload.sub,
        name: payload.name ?? '',
        email: payload.email,
        role: payload.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthSession>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((s) => this.persist(s)));
  }

  register(
    email: string,
    password: string,
    accountType: AccountTypes,
    name: string,
    extra?: {
      phone?: string;
      vehicleType?: string;
      vehiclePlateNumber?: string;
      country?: string;
      regionState?: string;
      city?: string;
      servicePostalCodes?: string;
    },
  ) {
    return this.http
      .post<AuthSession>(`${this.api}/auth/register`, { name, email, password, accountType, ...extra })
      .pipe(tap((s) => this.persist(s)));
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot`, { email });
  }

  resetPassword(email: string, otp: string, password: string) {
    return this.http.post<{ message: string }>(`${this.api}/auth/reset-password`, {
      email,
      otp,
      password,
    });
  }

  logout() {
    if (this.accessToken()) {
      this.http.post(`${this.api}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.accessToken.set(null);
    this.currentUser.set(null);
    if (this.browser) localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.toast.info('Signed out successfully');
    void this.router.navigateByUrl('/auth');
  }

  private persist(session: AuthSession) {
    this.accessToken.set(session.token);
    this.currentUser.set(session.user);
    if (this.browser) localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  }

  private readToken(): string | null {
    if (!this.browser) return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private roleFromToken(): UserRole | null {
    const token = this.accessToken();
    return token ? (decodeJwt(token)?.role ?? null) : null;
  }
}
