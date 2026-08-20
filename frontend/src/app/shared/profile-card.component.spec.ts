import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PublicProfileView } from '../core/api/contracts';
import { ProfileCardComponent } from './profile-card.component';

describe('ProfileCardComponent', () => {
  const profile: PublicProfileView = {
    userId: 'user-1',
    displayName: 'Ana Souza',
    bio: 'Cinema e trilhas.',
    age: 29,
    gender: 'WOMAN',
    city: 'Blumenau',
    state: 'SC',
    country: 'BR',
    interests: ['Cinema', 'Trilhas']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfileCardComponent],
      providers: [provideRouter([])]
    });
  });

  it('renders the current profile identity and distance', () => {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    fixture.componentRef.setInput('profile', profile);
    fixture.componentRef.setInput('distanceKm', 2.4);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Souza');
    expect(text).toContain('29');
    expect(text).toContain('2 km de distância');
  });

  it('cycles through profile photos through the embedded carousel', () => {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', profile);
    fixture.componentRef.setInput('photos', [
      { id: 'p1', url: '/one.jpg', position: 0 },
      { id: 'p2', url: '/two.jpg', position: 1 }
    ]);
    fixture.detectChanges();

    expect(component.carousel?.currentIndex()).toBe(0);
    component.nextPhoto();
    expect(component.carousel?.currentIndex()).toBe(1);
    component.nextPhoto();
    expect(component.carousel?.currentIndex()).toBe(0);
  });

  it('commits a right swipe as a like and locks duplicate decisions', () => {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    const component = fixture.componentInstance;
    const emitted = vi.fn();
    component.like.subscribe(emitted);

    component.swipeLike();
    component.swipeLike();

    expect(component.swipeDecision()).toBe('LIKE');
    expect(component.likeFeedbackOpacity()).toBe(1);
    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('can reset a failed swipe so the same card becomes interactive again', () => {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    const component = fixture.componentInstance;

    component.swipePass();
    expect(component.swipeDecision()).toBe('PASS');

    component.resetSwipe();

    expect(component.swipeDecision()).toBeNull();
    expect(component.dragX()).toBe(0);
    expect(component.isActionBlocked()).toBe(false);
  });
});
