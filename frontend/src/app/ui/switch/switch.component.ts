// standalone:true, imports:[CommonModule, FormsModule]
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
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
      [attr.aria-checked]="checked()"
      [attr.disabled]="disabled() ? '' : null"
      (click)="toggle()"
    >
      <span [class]="thumbClass()"></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: SwitchComponent,
      multi: true,
    },
  ],
})
export class SwitchComponent implements ControlValueAccessor {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly class = input<string>('');
  readonly checkedChange = output<boolean>();

  private _checked = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  readonly buttonClass = computed(() =>
    cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      (this._checked || this.checked()) ? 'bg-primary' : 'bg-input',
      this.class()
    )
  );

  readonly thumbClass = computed(() =>
    cn(
      'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
      (this._checked || this.checked()) ? 'translate-x-5' : 'translate-x-0'
    )
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
