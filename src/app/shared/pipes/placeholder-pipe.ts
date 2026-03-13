import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'placeholder',
})
export class PlaceholderPipe implements PipeTransform {
  transform(value: unknown, ..._args: unknown[]): unknown {
    return value;
  }
}
