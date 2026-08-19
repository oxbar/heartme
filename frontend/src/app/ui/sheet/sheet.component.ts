import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { cn } from '../../../lib/utils';

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: 'hm-sheet-trigger',
  standalone: true,
})
export class SheetTriggerDirective {}

@Component({
  selector: 'hm-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div (click)="open.set(true)">
        <ng-content select="hm-sheet-trigger" />
      </div>
      @if (open()) {
        <div
          class="fixed inset-0 z-50 bg-black/80 animate-fade-in"
          (click)="open.set(false)"
        ></div>
        <div
          class="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          (keydown.escape)="open.set(false)"
          tabindex="-1"
        >
          <ng-content />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetComponent {
  readonly open = signal(false);
}

@Component({
  selector: 'hm-sheet-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [SheetTriggerDirective],
})
export class SheetTriggerComponent {}

@Component({
  selector: 'hm-sheet-content',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div [class]="hostClass()">
      <ng-content />
      <button
        type="button"
        (click)="sheet.open.set(false)"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        aria-label="Fechar"
      >
        <hm-icon name="x" size="18" />
        <span class="sr-only">Fechar</span>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetContentComponent {
  readonly sheet = inject(SheetComponent);
  readonly side = input<SheetSide>('right');
  readonly class = input<string>('');

  readonly sideClasses: Record<SheetSide, string> = {
    top: 'inset-x-0 top-0 border-b',
    bottom: 'inset-x-0 bottom-0 border-t',
    left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
    right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
  };

  readonly hostClass = computed(() =>
    cn(
      'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
      this.sideClasses[this.side()],
      this.class()
    )
  );
}

@Component({
  selector: 'hm-sheet-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="hostClass()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHeaderComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('flex flex-col space-y-2 text-center sm:text-left', this.class())
  );
}

@Component({
  selector: 'hm-sheet-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="hostClass()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFooterComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-auto', this.class())
  );
}

@Component({
  selector: 'hm-sheet-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 [class]="hostClass()">
      <ng-content />
    </h2>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTitleComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-lg font-semibold text-foreground', this.class())
  );
}

@Component({
  selector: 'hm-sheet-description',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p [class]="hostClass()">
      <ng-content />
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetDescriptionComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-sm text-muted-foreground', this.class())
  );
}

@Component({
  selector: 'hm-sheet-close',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="sheet.open.set(false)"
      [class]="hostClass()"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCloseComponent {
  readonly sheet = inject(SheetComponent);
  readonly class = input<string>('');

  readonly hostClass = computed(() => cn(this.class()));
}
