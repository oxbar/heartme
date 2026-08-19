export type Gender = 'MAN' | 'WOMAN' | 'NON_BINARY' | 'OTHER';
export type BodyType = 'SLIM' | 'ATHLETIC' | 'AVERAGE' | 'MUSCULAR' | 'CURVY' | 'PLUS_SIZE';
export type InteractionType = 'LIKE' | 'PASS' | 'SUPER_LIKE';
export type SubscriptionPlan = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface UserView {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface WebToken {
  accessToken: string;
  tokenType: 'Bearer' | string;
  accessExpiresAt: string;
}

export interface ProfileView {
  userId: string;
  displayName: string;
  bio: string | null;
  birthDate: string;
  gender: Gender;
  bodyType: BodyType | null;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  strictAge: boolean;
  strictDistance: boolean;
  discoverable: boolean;
  recentlyActiveFirst: boolean;
  globalMode: boolean;
  interests: string[];
  lookingFor: Gender[];
  preferredBodyTypes: BodyType[];
}

export type ProfileRequest = Omit<ProfileView, 'userId'>;

export interface PublicProfileView {
  userId: string;
  displayName: string;
  bio: string | null;
  age: number;
  gender: Gender;
  bodyType: BodyType | null;
  city: string;
  state: string;
  country: string;
  interests: string[];
}

export interface PhotoView {
  id: string;
  url: string;
  position: number;
}

export interface Recommendation {
  profile: PublicProfileView;
  score: number;
  distanceKm: number | null;
}

export interface RecommendationPage {
  items: Recommendation[];
  nextCursor: string | null;
  poolSize: number;
  eligibleCount: number;
}

export interface RecommendationExplanation {
  candidateId: string;
  eligible: boolean;
  excludedBy: string;
  score: number | null;
  distanceKm: number | null;
  features: Record<string, number>;
  weights: Record<string, number>;
  commonInterests: string[];
  cooldownUntil: string | null;
  coldStart: boolean;
}

export interface MatchView {
  id: string;
  userA: string;
  userB: string;
  status: string;
  createdAt: string;
}

export interface ConversationView {
  id: string;
  matchId: string;
  userA: string;
  userB: string;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  readAt: string | null;
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  dataJson: string;
  readAt: string | null;
  createdAt: string;
}

export interface SubscriptionView {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface ActiveSubscriptionResponse {
  active: boolean;
  subscription?: SubscriptionView;
}

export interface ApiProblem {
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  timestamp?: string;
}
