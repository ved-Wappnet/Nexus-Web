import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from '@shared/ui/toast/toast';
import { ChatbotWidget } from '@shared/ui/chatbot-widget/chatbot-widget';
import { PriceAlertModal } from '@shared/ui/price-alert-modal/price-alert-modal';
import { VisualSearchModalComponent } from '@shared/ui/visual-search-modal/visual-search-modal';
import { LandedCostDrawerComponent } from '@shared/ui/landed-cost-drawer/landed-cost-drawer';

@Component({
  imports: [RouterOutlet, Toast, ChatbotWidget, PriceAlertModal, VisualSearchModalComponent, LandedCostDrawerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
