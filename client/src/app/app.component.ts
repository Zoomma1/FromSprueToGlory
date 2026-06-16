import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import { AcquisitionChannelDialogComponent } from './features/onboarding/acquisition-channel-dialog/acquisition-channel-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatDialogModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'From Sprue to Glory';
  private breakpointObserver = inject(BreakpointObserver);
  isMobile = signal(this.breakpointObserver.isMatched([Breakpoints.XSmall, Breakpoints.Small]));
  sidenavOpen = signal(false);
  authService = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private matIconRegistry = inject(MatIconRegistry);
  private sanitizer = inject(DomSanitizer);

  // Asked once per device; cleared only by answering or skipping the prompt.
  private static readonly ACQ_PROMPTED_KEY = 'fstg_acq_prompted';

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'My Items', icon: 'inventory_2', route: '/items' },
    { label: 'Projects', icon: 'folder_special', route: '/projects' },
    { label: 'Color Schemes', icon: 'palette', route: '/color-schemes' },
    { label: 'Paint Collection', icon: 'colorize', route: '/paints' },
    { label: 'Paint Converter', icon: 'find_replace', route: '/paint-converter' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (!result.matches) this.sidenavOpen.set(false);
      });

    this.matIconRegistry.addSvgIcon('app_icon', this.sanitizer.bypassSecurityTrustResourceUrl('/assets/app-icon.svg'));

    this.maybeAskAcquisitionChannel();
  }

  // FSTG-14 — ask "how did you hear about us?" once after login when the
  // channel is still unknown. Works for email/pw AND OAuth signups since this
  // shell loads for every authenticated session.
  private maybeAskAcquisitionChannel(): void {
    if (!this.authService.isLoggedIn()) return;
    if (localStorage.getItem(AppComponent.ACQ_PROMPTED_KEY)) return;

    this.api.getMe().subscribe({
      next: (profile) => {
        if (profile.acquisitionChannel) {
          localStorage.setItem(AppComponent.ACQ_PROMPTED_KEY, '1');
          return;
        }
        const ref = this.dialog.open(AcquisitionChannelDialogComponent, {
          width: '24rem', maxWidth: '95vw', disableClose: false,
        });
        ref.afterClosed().subscribe(() => {
          localStorage.setItem(AppComponent.ACQ_PROMPTED_KEY, '1');
        });
      },
      error: () => { /* not blocking — retry on next load */ },
    });
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }

  onNavClick(): void {
    if (this.isMobile()) this.sidenavOpen.set(false);
  }
}
