import { Component, OnInit, ViewChild, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'From Sprue to Glory';
  isMobile = signal(false);
  @ViewChild('sidenav') sidenav!: MatSidenav;
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
      .subscribe((result) => { this.isMobile.set(result.matches); });

    this.matIconRegistry.addSvgIcon('app-icon', this.sanitizer.bypassSecurityTrustResourceUrl('assets/app-icon.svg'));
  }

  onNavClick(): void {
    if (this.isMobile()) { this.sidenav.close(); }
  }
}
