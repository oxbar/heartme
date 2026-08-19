import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-switch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button
      type="button"
      role="switch"
      [class]="buttonClass()"
      [attr.aria-checked]="isOn()"
      [attr.disabled]="disabled() ? '' : null"
      (click)="toggle($event)"
    >
      <span [class]="thumbClass()"></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: SwitchComponent, multi: true }
  ]
})
export class SwitchComponent implements ControlValueAccessor {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly class = input<string>('');
  readonly checkedChange = output<boolean>();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  readonly isOn = computed(() => !!this.checked());

  readonly buttonClass = computed(() =>
    cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      this.isOn() ? 'bg-primary' : 'bg-input',
      this.class()
    )
  );

  readonly thumbClass = computed(() =>
    cn(
      'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
      this.isOn() ? 'translate-x-5' : 'translate-x-0'
    )
  );

  toggle(_e: MouseEvent) {
    if (this.disabled()) return;
    const next = !this.isOn();
    this.onChange(next);
    this.onTouched();
    this.checkedChange.emit(next);
  }

  writeValue(value: boolean): void {
    if ((value as any) === this.checked()) return;
    this.checkedChange.emit(!!value);
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
