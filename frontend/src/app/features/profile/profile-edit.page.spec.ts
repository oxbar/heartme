import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileView } from '../../core/api/contracts';
import { LocationApi } from '../../core/api/location.api';
import { MediaApi } from '../../core/api/media.api';
import { ProfileApi } from '../../core/api/profile.api';
import { ProfileStore } from '../../core/state/profile.store';
import { ProfileEditPage } from './profile-edit.page';

const savedProfile: ProfileView = {
  userId: 'user-a',
  displayName: 'Maria Padiski',
  bio: 'Perfil já salvo',
  birthDate: '1995-10-06',
  gender: 'WOMAN',
  bodyType: 'SLIM',
  city: 'Blumenau',
  state: 'Santa Catarina',
  country: 'BR',
  latitude: -26.9,
  longitude: -49.06,
  minAge: 25,
  maxAge: 40,
  maxDistanceKm: 80,
  strictAge: true,
  strictDistance: false,
  discoverable: true,
  recentlyActiveFirst: true,
  globalMode: false,
  interests: ['Música', 'Viagens'],
  lookingFor: ['MAN'],
  preferredBodyTypes: ['ATHLETIC']
};

describe('ProfileEditPage recovery', () => {
  it('hydrates every editable preference from the saved profile', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileApi, useValue: { me: vi.fn(() => of(savedProfile)), save: vi.fn(() => of(savedProfile)) } },
        { provide: MediaApi, useValue: { mine: vi.fn(() => of([])), upload: vi.fn(), delete: vi.fn() } },
        {
          provide: LocationApi,
          useValue: {
            states: vi.fn(() => of([{ code: 'SC', name: 'Santa Catarina' }])),
            cities: vi.fn(() => of([{ id: 4202404, name: 'Blumenau' }]))
          }
        },
        { provide: ProfileStore, useValue: { clear: vi.fn(), reload: vi.fn(async () => savedProfile) } }
      ]
    });

    const page = TestBed.runInInjectionContext(() => new ProfileEditPage());
    await page.ngOnInit();

    expect(page.loading()).toBe(false);
    expect(page.error()).toBe('');
    expect(page.model()).toMatchObject({
      displayName: 'Maria Padiski',
      birthDate: '1995-10-06',
      gender: 'WOMAN',
      bodyType: 'SLIM',
      city: 'Blumenau',
      state: 'Santa Catarina',
      bio: 'Perfil já salvo',
      minAge: 25,
      maxAge: 40,
      maxDistanceKm: 80,
      strictAge: true,
      recentlyActiveFirst: true
    });
    expect(page.interestTags()).toEqual(['Música', 'Viagens']);
    expect(page.lookingForSet().has('MAN')).toBe(true);
    expect(page.preferredBodySet().has('ATHLETIC')).toBe(true);
  });
});
