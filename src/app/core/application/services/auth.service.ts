import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClientService } from '../../infrastructure/supabase/supabase-client.service';
import { UserProfile } from '../../domain/models/user-profile.model';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase  = inject(SupabaseClientService).client;
  private readonly router    = inject(Router);
  private readonly settings  = inject(SettingsService);

  readonly user = signal<UserProfile | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly isLoading = signal(true);

  async init(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      await this.loadProfile(session.user.id);
    }
    this.isLoading.set(false);

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user.set(null);
        this.router.navigate(['/login']);
        return;
      }
      // TOKEN_REFRESHED: the client already has the new token — no need to reload profile
      if (event === 'TOKEN_REFRESHED') return;

      if (session) {
        await this.loadProfile(session.user.id);
      } else {
        this.user.set(null);
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (data) {
      this.user.set({
        id: data['id'],
        email: data['email'],
        fullName: data['full_name'] ?? data['email'],
        role: data['role'],
      });
      // Load app settings once user is authenticated
      await this.settings.load();
    }
  }
}
