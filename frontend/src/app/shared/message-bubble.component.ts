import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { MessageView } from '../core/api/contracts';
import { SessionStore } from '../core/auth/session.store';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-message-bubble',
  imports: [IconComponent],
  standalone: true,
  template: `
    <div class="hm-message-row" [class.is-mine]="isMine()" [class.is-new]="isNew() && !isMine()">
      <div class="hm-message-cluster" [class.has-pulse]="isNew() && !isMine()">
        <div class="hm-message-bubble" [class.is-mine]="isMine()" [class.is-new]="isNew() && !isMine()">
          @if (message(); as currentMessage) {
            <p class="hm-message-content">{{ currentMessage.content }}</p>
            <div class="hm-message-meta">
              <span>{{ timestamp() }}</span>
              @if (isMine()) {
                <span class="hm-message-receipt" [class.is-read]="!!currentMessage.readAt" [attr.aria-label]="currentMessage.readAt ? 'Mensagem visualizada' : 'Mensagem enviada'">
                  <hm-icon [name]="currentMessage.readAt ? 'check-check' : 'check'" size="13" />
                </span>
              }
            </div>
          }
        </div>

        @if (message(); as currentMessage) {
          <div class="hm-message-reaction-bar" [class.is-mine]="isMine()">
            <button
              type="button"
              class="hm-message-heart"
              [class.is-active]="currentMessage.heartReactedByMe"
              (click)="toggleHeart.emit(currentMessage.id)"
              [attr.aria-pressed]="currentMessage.heartReactedByMe"
              [attr.aria-label]="currentMessage.heartReactedByMe ? 'Remover coração' : 'Reagir com coração'"
            >
              <hm-icon name="heart" size="14" />
              @if (currentMessage.heartReactionCount > 0) {
                <span>{{ currentMessage.heartReactionCount }}</span>
              }
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBubbleComponent {
  private readonly session = inject(SessionStore);
  readonly message = input<MessageView | null>(null);
  readonly isNew = input(false);
  readonly toggleHeart = output<string>();

  readonly isMine = computed(() => this.message()?.senderId === this.session.userId());
  readonly timestamp = computed(() => {
    const value = this.message()?.sentAt;
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
}
