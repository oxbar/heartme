// standalone:true, imports:[CommonModule]
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-card',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('rounded-xl border bg-card text-card-foreground shadow-sm', this.class())
  );
}

@Component({
  selector: 'hm-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardHeaderComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('flex flex-col gap-1.5 p-6', this.class())
  );
}

@Component({
  selector: 'hm-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `<h3 [class]="hostClass()"><ng-content /></h3>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardTitleComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('font-semibold leading-none tracking-tight', this.class())
  );
}

@Component({
  selector: 'hm-card-description',
  standalone: true,
  imports: [CommonModule],
  template: `<p [class]="hostClass()"><ng-content /></p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDescriptionComponent {
  readonly class = input<string>('');

  readonly hostClass = computed(() =>
    cn('text-sm text-muted-foreground', this.class())
  );
}

@Component({
  selector: 'hm-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardContentComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('p-6 pt-0', this.class())
  );
}

@Component({
  selector: 'hm-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFooterComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn('flex items-center p-6 pt-0', this.class())
  );
}
