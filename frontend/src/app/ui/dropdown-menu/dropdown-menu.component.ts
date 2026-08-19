// standalone:true, imports:[CommonModule]
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  HostBinding,
  HostListener,
  computed,
  inject,
  input,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

@Directive({
  selector: 'hm-dropdown-menu-trigger',
  standalone: true,
})
export class DropdownMenuTriggerDirective {}

@Component({
  selector: 'hm-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block">
      <div (click)="toggleOpen()" class="cursor-pointer inline-block">
        <ng-content select="hm-dropdown-menu-trigger" />
      </div>
      @if (open()) {
        <div
          [class]="contentClass()"
          (click)="$event.stopPropagation()"
          #menuPanel
        >
          <ng-content />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuComponent {
  readonly open = signal(false);
  readonly class = input<string>('');
  readonly menuPanel = viewChild<ElementRef>('menuPanel');

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('hm-dropdown-menu')) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.open.set(false);
  }

  toggleOpen() {
    this.open.update((v) => !v);
  }

  close() {
    this.open.set(false);
  }

  readonly contentClass = computed(() =>
    cn(
      'absolute right-0 top-full mt-2 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-fade-in',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-dropdown-menu-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [DropdownMenuTriggerDirective],
})
export class DropdownMenuTriggerComponent {}

@Component({
  selector: 'hm-dropdown-menu-content',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuContentComponent {
  readonly class = input<string>('');
}

@Component({
  selector: 'hm-dropdown-menu-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      role="menuitem"
      [class]="hostClass()"
      (click)="onClick()"
      tabindex="0"
    >
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuItemComponent {
  readonly dropdown = inject(DropdownMenuComponent, { optional: true });
  readonly inset = input(false);
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      this.inset() ? 'pl-8' : '',
      this.class()
    )
  );

  onClick() {
    this.dropdown?.close();
  }
}

@Component({
  selector: 'hm-dropdown-menu-separator',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuSeparatorComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('-mx-1 my-1 h-px bg-muted', this.class())
  );
}
