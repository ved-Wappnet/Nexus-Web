import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '@core/services/currency.service';

@Pipe({
  name: 'nexusCurrency',
  standalone: true,
  pure: false, // Re-evaluates instantly when user switches active currency
})
export class NexusCurrencyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);

  transform(value: number | null | undefined): string {
    return this.currencyService.format(value);
  }
}
