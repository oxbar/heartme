import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InjectionToken,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';
import { LabelComponent } from '../label/label.component';

export interface FormFieldContext {
  id: string;
  name: InputSignal<string>;
  errors: WritableSignal<Record<string, boolean>>;
  hasError: Signal<boolean>;
  errorMessages: WritableSignal<Record<string, string>>;
  setError(key: string, message?: string): void;
  clearError(key: string): void;
}

export const FORM_FIELD = new InjectionToken<FormFieldContext>('FORM_FIELD');

let uniqueId = 0;

@Component({
  selector: 'hm-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: FORM_FIELD,
      useExisting: FormFieldComponent,
    },
  ],
})
export class FormFieldComponent implements FormFieldContext {
  readonly name = input<string>('');
  readonly id = `hm-form-field-${++uniqueId}`;
  readonly errors = signal<Record<string, boolean>>({});
  readonly errorMessages = signal<Record<string, string>>({});
  readonly class = input<string>('');

  readonly hasError = computed(() => Object.values(this.errors()).some(Boolean));

  setError(key: string, message?: string) {
    this.errors.update((prev) => ({ ...prev, [key]: true }));
    if (message) {
      this.errorMessages.update((prev) => ({ ...prev, [key]: message }));
    }
  }

  clearError(key: string) {
    this.errors.update((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }
}

@Component({
  selector: 'hm-form-label',
  standalone: true,
  imports: [CommonModule, LabelComponent],
  template: `
    <hm-label
      [for]="formField.id"
      [class]="hostClass()"
    >
      <ng-content />
    </hm-label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormLabelComponent {
  readonly formField = inject<FormFieldComponent>(FORM_FIELD);
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn(this.formField.hasError() && 'text-destructive', this.class())
  );
}

@Component({
  selector: 'hm-form-control',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormControlComponent {
  readonly formField = inject<FormFieldComponent>(FORM_FIELD);
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('block w-full', this.class())
  );
}

@Component({
  selector: 'hm-form-description',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p [class]="hostClass()">
      <ng-content />
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDescriptionComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-sm text-muted-foreground', this.class())
  );
}

@Component({
  selector: 'hm-form-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showMessage()) {
      <p [class]="hostClass()">
        <ng-content />
      </p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormMessageComponent {
  readonly formField = inject<FormFieldComponent>(FORM_FIELD, { optional: true });
  readonly match = input<string>('');
  readonly message = input<string>('');
  readonly class = input<string>('');

  readonly showMessage = computed(() => {
    if (!this.formField) return true;
    if (this.match()) {
      return !!this.formField.errors()[this.match()];
    }
    return this.formField.hasError();
  });

  readonly hostClass = computed(() =>
    cn('text-sm font-medium text-destructive', this.class())
  );
}
