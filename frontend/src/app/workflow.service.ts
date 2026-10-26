import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private http = inject(HttpClient);
  private baseUrl = '/api/workflow';

  startChat(message: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/start`, { message });
  }

  approveRefund(): Observable<any> {
    return this.http.post(`${this.baseUrl}/approve-refund`, {});
  }
}
