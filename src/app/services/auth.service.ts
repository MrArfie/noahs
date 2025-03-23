import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment'; // ✅ Import your env config

// 👤 Interfaces
export interface User {
  name: string;
  email: string;
  role: 'admin' | 'user' | string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`; // ✅ Dynamic base URL for backend

  private authStatusSubject = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  // Public observables
  authStatus$ = this.authStatusSubject.asObservable();
  user$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** 📝 Register a new user */
  register(user: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, user).pipe(
      tap(res => this.saveSession(res)),
      catchError(this.handleError)
    );
  }

  /** 🔐 Login (shared for admin or user) */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => this.saveSession(res)),
      catchError(this.handleError)
    );
  }

  /** 💾 Save session to localStorage */
  saveSession(response: AuthResponse): void {
    localStorage.setItem('auth-token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.authStatusSubject.next(true);
    this.currentUserSubject.next(response.user);
  }

  /** 🔍 Get the stored token */
  getToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  /** 🔍 Get current user */
  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  /** 🔍 Get current role */
  getUserRole(): string | null {
    return this.getUser()?.role || null;
  }

  /** ✅ Authenticated check */
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  /** 🧼 Logout user */
  logout(): void {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    this.authStatusSubject.next(false);
    this.currentUserSubject.next(null);
  }

  /** 🔍 Helper: token existence */
  private hasToken(): boolean {
    return !!localStorage.getItem('auth-token');
  }

  /** 👤 Helper: get user from storage */
  private getStoredUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  /** ❗ Global error handler */
  private handleError(error: any): Observable<never> {
    let message = 'Something went wrong. Please try again later.';

    if (error?.error?.msg) {
      message = error.error.msg;
    } else if (Array.isArray(error?.error?.errors)) {
      message = error.error.errors.map((e: any) => e.msg).join(', ');
    } else if (error.status === 0) {
      message = 'Unable to connect to the server. Check your internet connection or CORS policy.';
    }

    console.error('AuthService Error:', error);
    return throwError(() => new Error(message));
  }
}
