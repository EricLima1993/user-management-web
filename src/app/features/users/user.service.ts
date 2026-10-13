import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { PageResponse } from '../../core/models/page.model';
import {
  UserCreateRequest,
  UserDetail,
  UserQuery,
  UserSummary,
  UserUpdateRequest,
} from './user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/users`;

  list(query: UserQuery): Observable<PageResponse<UserSummary>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', `${query.sort},${query.direction}`);

    if (query.search) params = params.set('search', query.search);
    if (query.city) params = params.set('city', query.city);
    if (query.status) params = params.set('status', query.status);
    if (query.role) params = params.set('role', query.role);

    return this.http.get<PageResponse<UserSummary>>(this.url, { params });
  }

  findById(id: number): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.url}/${id}`);
  }

  create(request: UserCreateRequest): Observable<UserDetail> {
    return this.http.post<UserDetail>(this.url, request);
  }

  update(id: number, request: UserUpdateRequest): Observable<UserDetail> {
    return this.http.put<UserDetail>(`${this.url}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}