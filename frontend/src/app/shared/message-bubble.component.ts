import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { MessageView } from '../core/api/contracts';
import { SessionStore } from '../core/auth/session.store';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-message-bubble',
  imports: [IconComponent],
  standalone: true,
  template: `
    <div class="flex w-full items-end gap-2" [class.justify-end]="isMine()">
      <div
        class="max-w-[min(76%,560px)] rounded-[16px] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm"
        [class.bg-primary]="isMine()"
        [class.text-white]="isMine()"
        [class.rounded-br-[5px]]="isMine()"
        [class.bg-black]="!isMine()"
        [class.text-white/90]="!isMine()"
        [class.rounded-bl-[5px]]="!isMine()"
      >
        @if (message(); as currentMessage) {
          <p class="whitespace-pre-wrap break-words">{{ currentMessage.content }}</p>
          <p class="mt-1 text-right text-[10px] opacity-55">{{ timestamp() }}</p>
        }
      </div>
      @if (!isMine()) {
        <span class="mb-1 text-white/28" aria-hidden="true"><hm-icon name="heart" size="15" /></span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBubbleComponent {
  private readonly session = inject(SessionStore);
  readonly message = input<MessageView | null>(null);

  readonly isMine = computed(() => this.message()?.senderId === this.session.userId());
  readonly timestamp = computed(() => {
    const value = this.message()?.sentAt;
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
}
