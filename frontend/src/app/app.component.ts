import { Component, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WorkflowService } from './workflow.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';

interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  hitlData?: any; 
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule
  ],
  styles: [`
    /* Material 3 Inspired Modern UX */
    .app-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f4f8; font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; box-sizing: border-box; }
    .chat-window { width: 100%; max-width: 800px; height: 90vh; display: flex; flex-direction: column; border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.05); overflow: hidden; }
    .chat-header { background: #ffffff; padding: 16px 24px; border-bottom: 1px solid #e1e3e1; display: flex; align-items: center; gap: 16px; }
    .chat-header h2 { margin: 0; font-size: 1.25rem; font-weight: 500; color: #1a1c1e; }
    .chat-header p { margin: 0; font-size: 0.875rem; color: #42474e; }
    .chat-messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; background-color: #fdfdfd; }
    .message-row { display: flex; width: 100%; }
    .message-row.user { justify-content: flex-end; }
    .message-row.agent { justify-content: flex-start; }
    .bubble { max-width: 75%; padding: 12px 16px; border-radius: 16px; line-height: 1.5; font-size: 0.95rem; word-wrap: break-word; }
    .user .bubble { background-color: #0061a4; color: #ffffff; border-bottom-right-radius: 4px; }
    .agent .bubble { background-color: #e1e2e8; color: #1a1c1e; border-bottom-left-radius: 4px; }
    .hitl-card { margin-top: 12px; border: 1px solid #ffb4ab; background-color: #fff8f6; border-radius: 12px; padding: 16px; box-shadow: none; }
    .hitl-card .mat-icon { color: #ba1a1a; vertical-align: middle; margin-right: 8px; }
    .hitl-actions { display: flex; gap: 10px; margin-top: 16px; }
    .chat-input-area { padding: 16px 24px; background: #ffffff; border-top: 1px solid #e1e3e1; display: flex; align-items: center; gap: 12px; }
    .chat-input-area mat-form-field { flex: 1; }
    ::ng-deep .chat-input-area .mdc-text-field--outlined { border-radius: 28px !important; background-color: #f0f4f8; }
    ::ng-deep .chat-input-area .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
  template: `
    <div class="app-container">
      <mat-card class="chat-window">
        <div class="chat-header">
          <mat-icon color="primary" style="transform: scale(1.2);">smart_toy</mat-icon>
          <div>
            <h2>Resolution Agent</h2>
            <p>LangGraph4j Multi-Agent Workflow</p>
          </div>
        </div>
        <div class="chat-messages" #scrollMe>
          <div class="message-row agent">
            <div class="bubble">
              Hello! I am your AI support agent. I can answer policy questions or process order refunds. How can I help you?
            </div>
          </div>
          <div *ngFor="let msg of messages" class="message-row" [ngClass]="msg.role">
            <div class="bubble">
              <span style="white-space: pre-wrap;">{{ msg.content }}</span>
              <div *ngIf="msg.hitlData?.requires_human_approval" class="hitl-card">
                <div style="font-weight: 500; color: #ba1a1a;">
                  <mat-icon>security</mat-icon> Authorization Required
                </div>
                <p style="margin: 8px 0; color: #410002;">
                  Attempting to process refund for <strong>{{ msg.hitlData.order_id }}</strong>. Please review.
                </p>
                <div class="hitl-actions">
                  <button mat-flat-button color="warn" (click)="approveAction(msg)" [disabled]="msg.hitlData.resolved">
                    Authorize Refund
                  </button>
                  <button mat-stroked-button (click)="rejectAction(msg)" [disabled]="msg.hitlData.resolved">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="loading" class="message-row agent">
            <div class="bubble" style="display: flex; align-items: center; gap: 8px;">
              <mat-spinner diameter="20"></mat-spinner>
              <span>Agent is thinking...</span>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <mat-form-field appearance="outline">
            <input matInput [(ngModel)]="userInput" placeholder="Type your request here..." (keyup.enter)="sendMessage()" [disabled]="loading">
          </mat-form-field>
          <button mat-fab color="primary" (click)="sendMessage()" [disabled]="loading || !userInput.trim()" style="box-shadow: none;">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </mat-card>
    </div>
  `
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  private workflowService = inject(WorkflowService);
  userInput = '';
  loading = false;
  messages: ChatMessage[] = [];

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;
    this.messages.push({ role: 'user', content: this.userInput });
    const userMessageCache = this.userInput;
    this.userInput = ''; 
    this.loading = true;
    
    this.workflowService.startChat(userMessageCache).subscribe({
      next: (res) => {
        const agentMsg: ChatMessage = { role: 'agent', content: res.final_response };
        if (res.requires_human_approval) {
          agentMsg.hitlData = { order_id: res.order_id, requires_human_approval: true, resolved: false };
        }
        this.messages.push(agentMsg);
      },
      error: (err) => {
        console.error('Error connecting to backend', err);
        this.messages.push({ role: 'system', content: 'Connection error. Please try again.' });
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }

  approveAction(msg: ChatMessage) {
    this.loading = true;
    msg.hitlData.resolved = true; 
    
    this.workflowService.approveRefund().subscribe({
      next: (res) => {
        this.messages.push({ role: 'agent', content: res.final_response });
      },
      error: (err) => {
        console.error('Approval failed', err);
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }

  rejectAction(msg: ChatMessage) {
    msg.hitlData.resolved = true;
    this.messages.push({ role: 'user', content: 'I rejected the refund request.' });
    this.messages.push({ role: 'agent', content: 'Refund request cancelled. How else can I help you?' });
  }
}
