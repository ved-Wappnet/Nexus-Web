import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from '@shared/ui/toast/toast';
import { ChatbotWidget } from '@shared/ui/chatbot-widget/chatbot-widget';

@Component({
  imports: [RouterOutlet, Toast, ChatbotWidget],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
