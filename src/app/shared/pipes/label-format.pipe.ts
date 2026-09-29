import { Pipe, PipeTransform } from '@angular/core';
import { formatLabel } from '@core/utils/format.utils';

@Pipe({
  name: 'labelFormat',
  standalone: true,
})
export class LabelFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatLabel(value);
  }
}
