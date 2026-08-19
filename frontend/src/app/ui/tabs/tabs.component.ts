import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  HostBinding,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

@Directive({
  selector: 'hm-tabs-trigger',
  standalone: true,
})
export class TabsTriggerDirective {
  readonly value = input.required<string>();
  readonly class = input<string>('');
}

@Directive({
  selector: 'hm-tabs-content',
  standalone: true,
})
export class TabsContentDirective {
  readonly value = input.required<string>();
  readonly class = input<string>('');
}

@Component({
  selector: 'hm-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly value = signal<string>('');
  readonly defaultValue = input<string>('');
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('w-full', this.class())
  );

  constructor() {
    effect(() => {
      if (this.defaultValue() && !this.value()) {
        this.value.set(this.defaultValue());
      }
    });
  }

  setValue(v: string) {
    this.value.set(v);
  }
}

@Component({
  selector: 'hm-tabs-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="hostClass()" role="tablist">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsListComponent {
  readonly tabs = inject(TabsComponent);
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-tabs-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      role="tab"
      [attr.aria-selected]="isActive()"
      [attr.data-state]="isActive() ? 'active' : 'inactive'"
      [attr.tabindex]="isActive() ? 0 : -1"
      [class]="hostClass()"
      (click)="tabs.setValue(trigger.value())"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    { directive: TabsTriggerDirective, inputs: ['value', 'class'] },
  ],
})
export class TabsTriggerComponent {
  readonly trigger = inject(TabsTriggerDirective);
  readonly tabs = inject(TabsComponent);

  readonly isActive = computed(() => this.tabs.value() === this.trigger.value());

  readonly hostClass = computed(() =>
    cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      this.isActive()
        ? 'bg-background text-foreground shadow-sm'
        : 'hover:text-foreground/70',
      this.trigger.class()
    )
  );
}

@Component({
  selector: 'hm-tabs-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isActive()) {
      <div
        role="tabpanel"
        [class]="hostClass()"
      >
        <ng-content />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    { directive: TabsContentDirective, inputs: ['value', 'class'] },
  ],
})
export class TabsContentComponent {
  readonly content = inject(TabsContentDirective);
  readonly tabs = inject(TabsComponent);

  readonly isActive = computed(() => this.tabs.value() === this.content.value());

  readonly hostClass = computed(() =>
    cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in',
      this.content.class()
    )
  );
}
