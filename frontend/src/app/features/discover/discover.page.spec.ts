import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recommendation, RecommendationPage } from '../../core/api/contracts';
import { DiscoveryApi } from '../../core/api/discovery.api';
import { MatchApi } from '../../core/api/match.api';
import { MediaApi } from '../../core/api/media.api';
import { DiscoverPage } from './discover.page';

const candidate: Recommendation = {
  profile: {
    userId: 'user-b',
    displayName: 'Ana',
    bio: 'Teste',
    age: 29,
    gender: 'WOMAN',
    bodyType: 'ATHLETIC',
    city: 'Blumenau',
    state: 'SC',
    country: 'BR',
    interests: ['trilhas']
  },
  score: 0.91,
  distanceKm: 2
};

const discoveryPage: RecommendationPage = {
  items: [candidate],
  nextCursor: null,
  poolSize: 1,
  eligibleCount: 1
};

describe('DiscoverPage match flow', () => {
  it('shows match celebration when interaction response is mutual', async () => {
    const api = {
      interact: vi.fn(() => of({ type: 'LIKE' as const, mutualLike: true })),
      markViewed: vi.fn(() => of(void 0)),
      discoverPage: vi.fn()
    };
    const matchApi = { list: vi.fn(() => of([])) };
    const page = createPage(api, matchApi);
    page.recommendations.set([candidate]);

    await page.onInteract('user-b', 'LIKE');

    expect(page.matchCelebration()).toEqual({ userId: 'user-b', displayName: 'Ana' });
    expect(page.recommendations()).toEqual([]);
    expect(api.markViewed).not.toHaveBeenCalled();
  });

  it('detects a committed match even when the immediate response lost the race', async () => {
    const api = {
      interact: vi.fn(() => of({ type: 'LIKE' as const, mutualLike: false })),
      markViewed: vi.fn(() => of(void 0)),
      discoverPage: vi.fn()
    };
    const matchApi = {
      list: vi.fn(() => of([{
        id: 'match-1', userA: 'user-a', userB: 'user-b', status: 'ACTIVE', createdAt: new Date().toISOString()
      }]))
    };
    const page = createPage(api, matchApi);
    page.recommendations.set([candidate]);

    await page.onInteract('user-b', 'LIKE');

    expect(matchApi.list).toHaveBeenCalled();
    expect(page.matchCelebration()?.userId).toBe('user-b');
  });
});

describe('DiscoverPage rediscovery lifecycle', () => {
  let discoveryApi: {
    discoverPage: ReturnType<typeof vi.fn>;
    markViewed: ReturnType<typeof vi.fn>;
    interact: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    discoveryApi = {
      discoverPage: vi.fn(() => of(discoveryPage)),
      markViewed: vi.fn(() => of(void 0)),
      interact: vi.fn(() => of({ type: 'LIKE' as const, mutualLike: false }))
    };
  });

  it('does not consume the active candidate just because Discovery was opened', async () => {
    const page = createPage(discoveryApi, { list: vi.fn(() => of([])) });

    await page.ngOnInit();

    expect(page.activeRecommendation()?.profile.userId).toBe('user-b');
    expect(discoveryApi.markViewed).not.toHaveBeenCalled();
    expect(discoveryApi.interact).not.toHaveBeenCalled();
  });

  it('keeps the same candidate when Discovery is recreated without an explicit interaction', async () => {
    const first = createPage(discoveryApi, { list: vi.fn(() => of([])) });
    await first.ngOnInit();
    expect(first.activeRecommendation()?.profile.userId).toBe('user-b');

    const second = createPage(discoveryApi, { list: vi.fn(() => of([])) });
    await second.ngOnInit();

    expect(second.activeRecommendation()?.profile.userId).toBe('user-b');
    expect(discoveryApi.markViewed).not.toHaveBeenCalled();
    expect(discoveryApi.interact).not.toHaveBeenCalled();
  });
});

function createPage(api: object, matchApi: object): DiscoverPage {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: DiscoveryApi, useValue: api },
      { provide: MatchApi, useValue: matchApi },
      { provide: MediaApi, useValue: { batch: vi.fn(() => of({})) } },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } }
    ]
  });
  return TestBed.runInInjectionContext(() => new DiscoverPage());
}
