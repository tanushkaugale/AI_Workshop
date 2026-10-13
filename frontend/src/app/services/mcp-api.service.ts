import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface SystemStatus {
  status: string;
  timestamp: string;
  server: {
    name: string;
    version: string;
    nodeVersion: string;
  };
  database: {
    connected: boolean;
    host: string;
    name: string;
    farmerCount: number;
    error: string | null;
    mode: string;
  };
  openai: {
    configured: boolean;
    model: string;
  };
  mcp: {
    toolsCount: number;
    tools: string[];
  };
  cloud: {
    provider: string;
    ready: boolean;
    supportedTargets: string[];
  };
}

export interface Farmer {
  id: number;
  name: string;
  village: string;
  sugarcane_supply_tons: number | string;
  amount_paid: number | string;
  payment_pending: number | string;
  factory_name: string;
}

export interface StatsSummary {
  totals: {
    farmersCount: number;
    totalSupplyTons: number;
    totalAmountPaid: number;
    totalPaymentPending: number;
    averageTonsPerFarmer: number;
    overallPaymentClearanceRate: number;
  };
  topFarmer: Farmer | null;
  villages: Array<{
    village: string;
    count: number;
    supplyTons: number;
    paid: number;
    pending: number;
  }>;
}

export interface ExecutionStep {
  id: number;
  title: string;
  description: string;
  type: 'input' | 'ai_dispatch' | 'mcp_tool' | 'db_query' | 'synthesis';
  details?: any;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: ExecutionStep[];
  toolCalls?: any[];
  latencyMs?: number;
  model?: string;
  isStepsExpanded?: boolean;
}

export interface McpToolResponse {
  tool: string;
  arguments: any;
  latencyMs: number;
  recordsCount: number;
  records: Farmer[];
  rpcResponse: {
    jsonrpc: string;
    id: string;
    result: {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class McpApiService {
  private http = inject(HttpClient);
  private apiBase = '/api';

  // Signals for application state
  public status = signal<SystemStatus | null>(null);
  public farmers = signal<Farmer[]>([]);
  public stats = signal<StatsSummary | null>(null);
  public isConnected = signal<boolean>(false);
  public isDbConnected = signal<boolean>(false);

  loadStatus(): Observable<SystemStatus> {
    return this.http.get<SystemStatus>(`${this.apiBase}/status`).pipe(
      tap(data => {
        this.status.set(data);
        this.isConnected.set(true);
        this.isDbConnected.set(data.database.connected);
      }),
      catchError(err => {
        console.error('Failed to load status:', err);
        return of({
          status: 'offline',
          timestamp: new Date().toISOString(),
          server: { name: 'Sanjivani MCP AI Platform', version: '1.0.0', nodeVersion: 'v24' },
          database: { connected: false, host: 'localhost', name: 'sanjivani_db', farmerCount: 0, error: 'Connection failed', mode: 'Offline' },
          openai: { configured: false, model: 'gpt-4.1-mini' },
          mcp: { toolsCount: 1, tools: ['get_sanjivani_farmers'] },
          cloud: { provider: 'AWS', ready: true, supportedTargets: ['AWS App Runner', 'Amazon ECS Fargate'] }
        } as SystemStatus);
      })
    );
  }

  loadFarmers(village?: string, search?: string, sortBy?: string, sortOrder?: string): Observable<{ farmers: Farmer[]; totalCount: number; summary: any }> {
    let params: any = {};
    if (village && village !== 'all') params.village = village;
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    return this.http.get<{ farmers: Farmer[]; totalCount: number; summary: any }>(`${this.apiBase}/farmers`, { params }).pipe(
      tap(res => {
        this.farmers.set(res.farmers);
      })
    );
  }

  loadStats(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${this.apiBase}/stats`).pipe(
      tap(res => {
        this.stats.set(res);
      })
    );
  }

  sendChatMessage(question: string): Observable<{ answer: string; steps: ExecutionStep[]; toolCalls: any[]; totalLatencyMs: number; model: string }> {
    return this.http.post<{ answer: string; steps: ExecutionStep[]; toolCalls: any[]; totalLatencyMs: number; model: string }>(
      `${this.apiBase}/chat`,
      { question }
    );
  }

  executeTool(toolName: string, args: any): Observable<McpToolResponse> {
    return this.http.post<McpToolResponse>(`${this.apiBase}/mcp/tool`, {
      toolName,
      arguments: args
    });
  }

  addFarmer(farmerData: { name: string; village: string; sugarcane_supply_tons: number; amount_paid: number; payment_pending: number }): Observable<any> {
    return this.http.post(`${this.apiBase}/farmers`, farmerData);
  }
}
