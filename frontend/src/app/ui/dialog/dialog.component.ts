import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { cn } from '../../../lib/utils';

@Directive({
  selector: 'hm-dialog-trigger',
  standalone: true,
})
export class DialogTriggerDirective {}

@Component({
  selector: 'hm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div (click)="open.set(true)">
        <ng-content select="hm-dialog-trigger" />
      </div>
      @if (open()) {
        <div
          class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-hidden="true"
          (click)="onBackdropClick($event)"
        ></div>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          (keydown.escape)="open.set(false)"
          tabindex="-1"
          #dialogRef
        >
          <ng-content />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  readonly open = signal(false);
  readonly dialogRef = viewChild<ElementRef>('dialogRef');

  onBackdropClick(event: Event) {
    this.open.set(false);
  }
}

@Component({
  selector: 'hm-dialog-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [DialogTriggerDirective],
})
export class DialogTriggerComponent {}

@Component({
  selector: 'hm-dialog-content',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div [class]="hostClass()">
      <ng-content />
      <button
        type="button"
        (click)="dialog.open.set(false)"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        aria-label="Fechar"
      >
        <hm-icon name="x" size="18" />
        <span class="sr-only">Fechar</span>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogContentComponent {
  readonly dialog = inject(DialogComponent);
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(
      'relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg animate-fade-in animate-slide-in-up',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-dialog-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="hostClass()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogHeaderComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-dialog-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="hostClass()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogFooterComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-dialog-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 [class]="hostClass()">
      <ng-content />
    </h2>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTitleComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-lg font-semibold leading-none tracking-tight', this.class())
  );
}

@Component({
  selector: 'hm-dialog-description',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p [class]="hostClass()">
      <ng-content />
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogDescriptionComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-sm text-muted-foreground', this.class())
  );
}

@Component({
  selector: 'hm-dialog-close',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="dialog.open.set(false)"
      [class]="hostClass()"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCloseComponent {
  readonly dialog = inject(DialogComponent);
  readonly class = input<string>('');

  readonly hostClass = computed(() => cn(this.class()));
}
