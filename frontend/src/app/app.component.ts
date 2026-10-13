import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { McpApiService, Farmer, ChatMessage, StatsSummary, SystemStatus, McpToolResponse } from './services/mcp-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  public api = inject(McpApiService);

  // App Navigation & Themes (User Focused)
  activeTab = signal<'chat' | 'registry' | 'analytics' | 'query'>('chat');
  currentTheme = signal<'emerald' | 'amber' | 'sapphire' | 'light'>('emerald');
  toastMessage = signal<string | null>(null);
  isHealthModalOpen = signal<boolean>(false);
  isAddFarmerModalOpen = signal<boolean>(false);

  // Chat State
  userQuestion = '';
  isChatSending = signal<boolean>(false);
  chatMessages = signal<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `👋 **Welcome to the Sanjivani Sugar Factory AI Assistant!**\n\nI have direct access to our **PostgreSQL farmers database** via the Model Context Protocol.\n\nAsk me anything about sugarcane supply tonnage, payment distributions, village records, or comparison metrics. Click any of the quick suggestions below or type your question.`,
      timestamp: new Date(),
      steps: [
        {
          id: 1,
          title: 'Sugar Factory Database Connected',
          description: 'Live verified connection to Sanjivani PostgreSQL records',
          type: 'mcp_tool'
        },
        {
          id: 2,
          title: 'Active Regional Coverage',
          description: 'Records indexed for Kopargaon, Shirdi, Rahata, and surrounding talukas',
          type: 'db_query'
        }
      ]
    }
  ]);

  quickPrompts = [
    { label: '🏆 Top Supplier', query: 'Who supplied the most sugarcane tons and what was their payout?' },
    { label: '💰 Kopargaon Dues', query: 'Calculate total pending payments for Kopargaon farmers' },
    { label: '📊 Village Comparison', query: 'Compare sugarcane supply and pending balances across all villages' },
    { label: '⚠️ High Risk Pending (>₹50k)', query: 'List farmers with pending payment greater than ₹50,000' },
    { label: '📈 Factory Average', query: 'What is the average sugarcane supply per farmer at Sanjivani?' }
  ];

  // Farmer Registry Filter State
  selectedVillage = signal<string>('all');
  searchQuery = signal<string>('');
  sortBy = signal<string>('sugarcane_supply_tons');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Add Farmer Form Model
  newFarmer = {
    name: '',
    village: 'Kopargaon',
    supply: 100,
    paid: 250000,
    pending: 50000
  };

  // Quick Query / Report Generator State
  queryVillageParam = '';
  isQueryLoading = signal<boolean>(false);
  queryResult = signal<McpToolResponse | null>(null);

  // Available Villages
  villagesList = [
    'All',
    'Kopargaon',
    'Kolpewadi',
    'Puntamba',
    'Shirdi',
    'Rahata',
    'Pohegaon',
    'Yesgaon',
    'Chande',
    'Savalyavihar',
    'Shirasgaon'
  ];

  ngOnInit(): void {
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.api.loadStatus().subscribe();
    this.fetchFarmers();
    this.api.loadStats().subscribe();
  }

  fetchFarmers(): void {
    this.api.loadFarmers(
      this.selectedVillage(),
      this.searchQuery(),
      this.sortBy(),
      this.sortOrder()
    ).subscribe();
  }

  // Theme Management
  setTheme(theme: 'emerald' | 'amber' | 'sapphire' | 'light'): void {
    this.currentTheme.set(theme);
    document.body.className = `theme-${theme}`;
    this.showToast(`Switched theme to ${theme.toUpperCase()}`);
  }

  // Navigation
  switchTab(tab: 'chat' | 'registry' | 'analytics' | 'query'): void {
    this.activeTab.set(tab);
    if (tab === 'registry' || tab === 'analytics') {
      this.fetchFarmers();
      this.api.loadStats().subscribe();
    }
  }

  // Chat Actions
  sendPrompt(text?: string): void {
    const query = (text || this.userQuestion).trim();
    if (!query || this.isChatSending()) return;

    this.userQuestion = '';
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    this.chatMessages.update(msgs => [...msgs, userMsg]);
    this.isChatSending.set(true);

    this.api.sendChatMessage(query).subscribe({
      next: (res) => {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          timestamp: new Date(),
          steps: res.steps,
          toolCalls: res.toolCalls,
          latencyMs: res.totalLatencyMs,
          model: res.model,
          isStepsExpanded: true
        };
        this.chatMessages.update(msgs => [...msgs, aiMsg]);
        this.isChatSending.set(false);
      },
      error: (err) => {
        console.error('Chat failed:', err);
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Failed to connect to server. Please ensure the backend is running.',
          timestamp: new Date()
        };
        this.chatMessages.update(msgs => [...msgs, errorMsg]);
        this.isChatSending.set(false);
      }
    });
  }

  toggleSteps(msg: ChatMessage): void {
    msg.isStepsExpanded = !msg.isStepsExpanded;
  }

  clearChat(): void {
    this.chatMessages.set([]);
    this.showToast('Chat history cleared');
  }

  copyText(text: string): void {
    navigator.clipboard.writeText(text);
    this.showToast('Copied to clipboard!');
  }

  // Registry Actions
  onVillageFilter(village: string): void {
    this.selectedVillage.set(village.toLowerCase() === 'all' ? 'all' : village);
    this.fetchFarmers();
  }

  onSearchChange(): void {
    this.fetchFarmers();
  }

  onSortChange(field: string): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
    this.fetchFarmers();
  }

  askAboutFarmer(farmer: Farmer): void {
    const question = `Give me a complete breakdown of sugarcane supply, total amount paid, and pending balance for farmer ${farmer.name} from ${farmer.village}.`;
    this.activeTab.set('chat');
    this.sendPrompt(question);
  }

  openAddFarmerModal(): void {
    this.isAddFarmerModalOpen.set(true);
  }

  closeAddFarmerModal(): void {
    this.isAddFarmerModalOpen.set(false);
  }

  saveNewFarmer(): void {
    if (!this.newFarmer.name || !this.newFarmer.supply) {
      this.showToast('Please provide farmer name and supply tonnage');
      return;
    }

    this.api.addFarmer({
      name: this.newFarmer.name,
      village: this.newFarmer.village,
      sugarcane_supply_tons: Number(this.newFarmer.supply),
      amount_paid: Number(this.newFarmer.paid),
      payment_pending: Number(this.newFarmer.pending)
    }).subscribe({
      next: (res) => {
        this.showToast(`Farmer ${this.newFarmer.name} registered successfully!`);
        this.closeAddFarmerModal();
        this.fetchFarmers();
        this.api.loadStats().subscribe();
        this.api.loadStatus().subscribe();
        this.newFarmer.name = '';
      },
      error: (err) => {
        this.showToast('Failed to save farmer record');
      }
    });
  }

  // Quick Query / Report Generator
  runQuickReport(): void {
    this.isQueryLoading.set(true);
    const args: any = {};
    if (this.queryVillageParam && this.queryVillageParam.trim() && this.queryVillageParam !== 'All') {
      args.village = this.queryVillageParam.trim();
    }

    this.api.executeTool('get_sanjivani_farmers', args).subscribe({
      next: (res) => {
        this.queryResult.set(res);
        this.isQueryLoading.set(false);
        this.showToast(`Retrieved ${res.recordsCount} farmer records!`);
      },
      error: (err) => {
        this.isQueryLoading.set(false);
        this.showToast('Report generation failed');
      }
    });
  }

  // Toast Notification
  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }

  // Utility helpers
  formatCurrency(val: number | string | undefined): string {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN');
  }

  formatTons(val: number | string | undefined): string {
    const num = Number(val || 0);
    return num.toFixed(2) + ' Tons';
  }

  calculateClearance(paid: number | string, pending: number | string): number {
    const p = Number(paid || 0);
    const pend = Number(pending || 0);
    const total = p + pend;
    if (total === 0) return 100;
    return Math.min(100, Math.round((p / total) * 100));
  }
}
