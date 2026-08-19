import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PhotoView } from './contracts';

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly http = inject(HttpClient);

  mine(): Observable<PhotoView[]> {
    return this.http.get<PhotoView[]>('/api/v1/media/photos');
  }

  forUser(userId: string): Observable<PhotoView[]> {
    return this.http.get<PhotoView[]>(`/api/v1/media/photos/users/${userId}`);
  }

  batch(userIds: string[]): Observable<Record<string, PhotoView[]>> {
    return this.http.post<Record<string, PhotoView[]>>('/api/v1/media/photos/batch', { userIds });
  }

  upload(file: File): Observable<PhotoView> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<PhotoView>('/api/v1/media/photos', body);
  }

  delete(photoId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/media/photos/${photoId}`);
  }
}
