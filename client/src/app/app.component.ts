import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'From Sprue to Glory';
  isMobile = signal(false);
  sidenavOpen = signal(false);
  private breakpointObserver = inject(BreakpointObserver);
  authService = inject(AuthService);
  private matIconRegistry = inject(MatIconRegistry);
  private sanitizer = inject(DomSanitizer);

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'My Items', icon: 'inventory_2', route: '/items' },
    { label: 'Projects', icon: 'folder_special', route: '/projects' },
    { label: 'Color Schemes', icon: 'palette', route: '/color-schemes' },
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
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }

  onNavClick(): void {
    if (this.isMobile()) this.sidenavOpen.set(false);
  }
}
