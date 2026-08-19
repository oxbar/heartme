// standalone:true, imports:[CommonModule]
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      this.class()
    )
  );
}

@Component({
  selector: 'hm-avatar-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img
      [src]="src()"
      [alt]="alt()"
      [class]="hostClass()"
      (error)="onError()"
      [style.display]="hasError() ? 'none' : 'block'"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarImageComponent {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly class = input<string>('');
  readonly hasError = signal(false);

  readonly hostClass = computed(() =>
    cn('aspect-square h-full w-full object-cover', this.class())
  );

  onError() {
    this.hasError.set(true);
  }
}

@Component({
  selector: 'hm-avatar-fallback',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarFallbackComponent {
  readonly delayMs = input(100);
  readonly class = input<string>('');
  readonly visible = signal(false);

  constructor() {
    const delay = this.delayMs();
    setTimeout(() => this.visible.set(true), delay);
  }

  @HostBinding('class')
  get hostClass(): string {
    return cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      this.class()
    );
  }

  @HostBinding('style.display')
  get display(): string {
    return this.visible() ? 'flex' : 'none';
  }
}
