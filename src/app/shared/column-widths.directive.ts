import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appColumnWidths]'
})
export class ColumnWidthsDirective {
  @Input() borderWidth = 2;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
  ) { }

  get colWidths(): number[] {
    const colWidths = [];
    const rows = this.elementRef.nativeElement.children;

    if (rows.length) {
      for (const column of rows[rows.length - 1].children) {
        colWidths.push(column.getBoundingClientRect().width - 2 * this.borderWidth);
      }
    }

    return colWidths;
  }

  // The body table grows past 100% when it has more columns than fit; the
  // sticky header has to grow with it or the filter bar ends up narrower.
  get tableWidth(): number {
    const table = this.elementRef.nativeElement.closest('table');
    return table ? table.getBoundingClientRect().width : 0;
  }

  @Input() set tableWidth(width: number) {
    const table = this.elementRef.nativeElement.closest('table');

    if (table && width > 0) {
      this.renderer.setStyle(table, 'width', `${width}px`);
    }
  }

  @Input() set colWidths(colWidths: number[]) {
    const rows = this.elementRef.nativeElement.children;

    if (rows.length) {
      const cols = rows[rows.length - 1].children;

      for (let i = 0; i < cols.length; i++) {
        this.renderer.setStyle(cols[i], 'width', `${colWidths[i]}px`);
      }
    }
  }
}
