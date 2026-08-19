import { beforeEach, describe, expect, it } from 'vitest';
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

  it('cycles through profile photos without exceeding the collection', () => {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', profile);
    fixture.componentRef.setInput('photos', [
      { id: 'p1', url: '/one.jpg', position: 0 },
      { id: 'p2', url: '/two.jpg', position: 1 }
    ]);
    fixture.detectChanges();

    expect(component.activePhoto()?.id).toBe('p1');
    component.nextPhoto();
    expect(component.activePhoto()?.id).toBe('p2');
    component.nextPhoto();
    expect(component.activePhoto()?.id).toBe('p1');
  });
});
