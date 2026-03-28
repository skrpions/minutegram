import { APP_INITIALIZER, ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { MinutogramRepository } from './core/domain/repositories/minutogram.repository';
import { SupabaseAdapter } from './core/infrastructure/supabase/supabase.adapter';
import { AuthService } from './core/application/services/auth.service';

function initAuth(auth: AuthService): () => Promise<void> {
  return () => auth.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter(routes),
    { provide: MinutogramRepository, useClass: SupabaseAdapter },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
