import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <label [class]="labelClass()">
      <span class="sr-only">
        <ng-content select="[checkbox-label]" />
      </span>
      <button
        type="button"
        role="checkbox"
        [attr.aria-checked]="checked()"
        [attr.disabled]="disabled() ? '' : null"
        [class]="wrapperClass()"
        (click)="toggle()"
      >
        @if (isChecked()) {
          <hm-icon name="check" size="14" class="text-primary-foreground" />
        }
      </button>
      <span [class]="textClass()">
        <ng-content />
      </span>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CheckboxComponent,
      multi: true,
    },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly class = input<string>('');
  readonly checkedChange = output<boolean>();

  private _checked = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  readonly isChecked = computed(() => this._checked || this.checked());

  readonly labelClass = computed(() =>
    cn('inline-flex items-center gap-2 cursor-pointer select-none', this.disabled() ? 'cursor-not-allowed opacity-70' : '', this.class())
  );

  readonly wrapperClass = computed(() =>
    cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors',
      this.isChecked() ? 'bg-primary border-primary' : 'bg-background'
    )
  );

  readonly textClass = computed(() =>
    cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70')
  );

  toggle() {
    if (this.disabled()) return;
    this._checked = !this._checked;
    this.onChange(this._checked);
    this.onTouched();
    this.checkedChange.emit(this._checked);
  }

  writeValue(value: boolean): void {
    this._checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    (this.disabled as any).set(isDisabled);
  }
}
