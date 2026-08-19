import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MessageView } from '../core/api/contracts';
import { SessionStore } from '../core/auth/session.store';

@Component({
  selector: 'hm-message-bubble',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div class="flex w-full" [ngClass]="isMine() ? 'justify-end' : 'justify-start'">
      <div
        class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm"
        [ngClass]="isMine() ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm'"
      >
        @if (message()) {
          <p class="whitespace-pre-wrap break-words">{{ message()!.content }}</p>
          <p
            class="text-[10px] mt-1 opacity-70 text-right"
            [ngClass]="isMine() ? 'text-primary-foreground' : 'text-secondary-foreground'"
          >
            {{ timestamp() }}
          </p>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBubbleComponent {
  private readonly session = inject(SessionStore);
  readonly message = input<MessageView | null>(null);

  readonly isMine = computed(() => {
    const m = this.message();
    if (!m) return false;
    return m.senderId === this.session.userId();
  });

  readonly timestamp = computed(() => {
    const d = this.message()?.sentAt;
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
}
